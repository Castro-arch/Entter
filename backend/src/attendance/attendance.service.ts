import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { verifyQrToken } from '../qr/qr-token';
import { AttendanceGateway, type DaySummary } from './attendance.gateway';
import { BatchSyncDto } from './dto/batch-sync.dto';
import { CheckInDto, CheckInMethodDto } from './dto/check-in.dto';

const LOCK_TTL_SECONDS = 5;

export interface CheckInResult {
  clientId?: string;
  status: 'checked_in' | 'already_checked_in' | 'error';
  message?: string;
  attendance?: {
    id: string;
    status: string;
    checkedInAt: Date | null;
    participant: { id: string; name: string };
  };
}

@Injectable()
export class AttendanceService {
  private readonly qrSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly gateway: AttendanceGateway,
    config: ConfigService,
  ) {
    this.qrSecret =
      config.get<string>('QR_SECRET') ??
      config.getOrThrow<string>('JWT_SECRET');
  }

  async checkIn(
    tenantId: string,
    eventId: string,
    dto: CheckInDto,
  ): Promise<CheckInResult> {
    await this.assertEventOwnership(tenantId, eventId);

    const participantId =
      dto.method === CheckInMethodDto.QR
        ? this.resolveParticipantFromQr(dto.qrToken!, eventId)
        : dto.participantId!;

    const lockKey = `checkin-lock:${participantId}:${dto.eventDayId}`;
    const acquired = await this.redis.set(
      lockKey,
      '1',
      'EX',
      LOCK_TTL_SECONDS,
      'NX',
    );
    if (!acquired) {
      // A duplicate scan landed inside the same short window — treat it as
      // the same outcome as the in-flight request rather than erroring.
      return this.currentStatus(participantId, dto.eventDayId, dto.clientId);
    }

    // Warm the counters cache from Postgres *before* mutating the row below —
    // otherwise a cold cache would count this same check-in twice: once from
    // the COUNT query (which would already see the new PRESENT row) and once
    // from the increment.
    await this.warmSummaryCache(dto.eventDayId);

    const { count } = await this.prisma.attendance.updateMany({
      where: { participantId, eventDayId: dto.eventDayId, status: 'PENDING' },
      data: {
        status: 'PRESENT',
        checkedInAt: new Date(),
        method: dto.method,
      },
    });

    if (count === 0) {
      // Either an idempotent replay (offline queue resending an already
      // confirmed scan) or a participant/day pair with no attendance row.
      return this.currentStatus(participantId, dto.eventDayId, dto.clientId);
    }

    const summary = await this.incrementPresent(dto.eventDayId);
    this.gateway.broadcastSummary(eventId, summary);

    const attendance = await this.prisma.attendance.findUniqueOrThrow({
      where: {
        participantId_eventDayId: { participantId, eventDayId: dto.eventDayId },
      },
      include: { participant: { select: { id: true, name: true } } },
    });

    return { clientId: dto.clientId, status: 'checked_in', attendance };
  }

  async batchSync(
    tenantId: string,
    eventId: string,
    dto: BatchSyncDto,
  ): Promise<CheckInResult[]> {
    const results: CheckInResult[] = [];
    for (const item of dto.checkIns) {
      try {
        results.push(await this.checkIn(tenantId, eventId, item));
      } catch (error) {
        results.push({
          clientId: item.clientId,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    return results;
  }

  async getSummary(tenantId: string, eventId: string): Promise<DaySummary[]> {
    await this.assertEventOwnership(tenantId, eventId);
    const days = await this.prisma.eventDay.findMany({
      where: { eventId },
      orderBy: { orderIndex: 'asc' },
      select: { id: true },
    });
    return Promise.all(days.map((day) => this.getDaySummary(day.id)));
  }

  async search(
    tenantId: string,
    eventId: string,
    eventDayId: string,
    query: string,
  ) {
    await this.assertEventOwnership(tenantId, eventId);
    const participants = await this.prisma.participant.findMany({
      where: {
        eventId,
        name: { contains: query, mode: 'insensitive' },
      },
      orderBy: { name: 'asc' },
      take: 20,
      include: { attendance: { where: { eventDayId } } },
    });
    return participants.map((participant) => ({
      id: participant.id,
      name: participant.name,
      willNotAttend: participant.willNotAttend,
      attendance: participant.attendance[0] ?? null,
    }));
  }

  async setWillNotAttend(
    tenantId: string,
    participantId: string,
    willNotAttend: boolean,
  ) {
    const participant = await this.prisma.participant.findFirst({
      where: { id: participantId, event: { tenantId } },
    });
    if (!participant) {
      throw new NotFoundException('Participant not found');
    }
    return this.prisma.participant.update({
      where: { id: participantId },
      data: { willNotAttend },
    });
  }

  private resolveParticipantFromQr(token: string, eventId: string): string {
    const payload = verifyQrToken(token, this.qrSecret);
    if (!payload || payload.e !== eventId) {
      throw new UnauthorizedException('Invalid or expired QR code');
    }
    return payload.p;
  }

  private async assertEventOwnership(tenantId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId },
      select: { id: true },
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
  }

  private async currentStatus(
    participantId: string,
    eventDayId: string,
    clientId?: string,
  ): Promise<CheckInResult> {
    const attendance = await this.prisma.attendance.findUnique({
      where: { participantId_eventDayId: { participantId, eventDayId } },
      include: { participant: { select: { id: true, name: true } } },
    });
    if (!attendance) {
      throw new NotFoundException(
        'No attendance record for this participant on this day',
      );
    }
    return {
      clientId,
      status:
        attendance.status === 'PRESENT' ? 'already_checked_in' : 'checked_in',
      attendance,
    };
  }

  /** Lazily warms the Redis-cached counters for a day from Postgres. */
  private async warmSummaryCache(eventDayId: string) {
    const totalKey = `attendance:total:${eventDayId}`;
    const presentKey = `attendance:present:${eventDayId}`;
    const warm = await this.redis.exists(totalKey);
    if (!warm) {
      const [total, present] = await Promise.all([
        this.prisma.attendance.count({ where: { eventDayId } }),
        this.prisma.attendance.count({
          where: { eventDayId, status: 'PRESENT' },
        }),
      ]);
      await this.redis.set(totalKey, total, 'NX');
      await this.redis.set(presentKey, present, 'NX');
    }
    return { totalKey, presentKey };
  }

  private async getDaySummary(eventDayId: string): Promise<DaySummary> {
    const { totalKey, presentKey } = await this.warmSummaryCache(eventDayId);
    const [total, present] = await this.redis.mget(totalKey, presentKey);
    const totalNum = Number(total ?? 0);
    const presentNum = Number(present ?? 0);
    return {
      eventDayId,
      total: totalNum,
      present: presentNum,
      missing: totalNum - presentNum,
    };
  }

  private async incrementPresent(eventDayId: string): Promise<DaySummary> {
    const { totalKey, presentKey } = await this.warmSummaryCache(eventDayId);
    const present = await this.redis.incr(presentKey);
    const total = Number((await this.redis.get(totalKey)) ?? 0);
    return { eventDayId, total, present, missing: total - present };
  }
}
