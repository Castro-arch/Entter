import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { CERTIFICATES_QUEUE } from '../queue/queue.module';
import { renderCertificate, type NamePosition } from './certificate-renderer';

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    @Inject(CERTIFICATES_QUEUE) private readonly queue: Queue,
  ) {}

  /** Renders and emails a single participant's certificate right now. Called
   * from the BullMQ worker — not exposed directly over HTTP, so the render
   * work never blocks a request. */
  async send(participantId: string): Promise<void> {
    const participant = await this.prisma.participant.findUniqueOrThrow({
      where: { id: participantId },
      include: { event: true, order: { select: { buyerEmail: true } } },
    });

    if (!participant.event.certificateTemplateUrl) {
      this.logger.warn(
        `Skipping certificate for ${participantId}: event has no template`,
      );
      return;
    }

    const templateResponse = await fetch(participant.event.certificateTemplateUrl);
    const templateBytes = await templateResponse.arrayBuffer();
    const position = (participant.event.certificateNamePosition ??
      { xPct: 50, yPct: 50, align: 'center' }) as unknown as NamePosition;

    const pdf = await renderCertificate(templateBytes, participant.name, position);

    await this.emailService.send({
      to: participant.order.buyerEmail,
      subject: `Your certificate — ${participant.event.name}`,
      text: `Hi ${participant.name}, your certificate for ${participant.event.name} is attached.`,
      attachment: {
        filename: `certificate-${participant.name.replace(/\s+/g, '-').toLowerCase()}.pdf`,
        content: pdf,
        contentType: 'application/pdf',
      },
    });

    await this.prisma.participant.update({
      where: { id: participantId },
      data: { certificateSentAt: new Date() },
    });
  }

  async sendOne(tenantId: string, eventId: string, participantId: string) {
    const participant = await this.prisma.participant.findFirst({
      where: { id: participantId, eventId, event: { tenantId } },
      select: { id: true },
    });
    if (!participant) {
      throw new NotFoundException('Participant not found');
    }
    await this.queue.add('send', { participantId });
    return { queued: true };
  }

  async sendAll(tenantId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId },
      select: { id: true },
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    const queued = await this.enqueueEligibleParticipants(eventId);
    return { queued };
  }

  /** Sweeps AUTO-dispatch events whose delay has elapsed. Run on a
   * repeatable BullMQ job (see `certificates.worker.ts`) rather than one
   * precisely-timed delayed job per event, so nothing needs to be
   * rescheduled or cancelled when an organizer edits the event afterward. */
  async runAutoDispatchSweep(): Promise<void> {
    const candidates = await this.prisma.event.findMany({
      where: {
        certificateDispatchMode: 'AUTO',
        certificatesDispatchedAt: null,
        certificateTemplateUrl: { not: null },
      },
      include: { eventDays: { orderBy: { orderIndex: 'desc' }, take: 1 } },
    });

    const now = Date.now();
    for (const event of candidates) {
      const lastDay = event.eventDays[0];
      if (!lastDay) continue;

      const delayMs = (event.certificateAutoDelayHours ?? 0) * 60 * 60 * 1000;
      const dueAt = new Date(lastDay.date).getTime() + delayMs;
      if (now < dueAt) continue;

      const queued = await this.enqueueEligibleParticipants(event.id);
      await this.prisma.event.update({
        where: { id: event.id },
        data: { certificatesDispatchedAt: new Date() },
      });
      this.logger.log(`Auto-dispatched certificates for event ${event.id} (${queued} queued)`);
    }
  }

  private async enqueueEligibleParticipants(eventId: string): Promise<number> {
    const participants = await this.prisma.participant.findMany({
      where: { eventId, certificateSentAt: null, willNotAttend: false },
      select: { id: true },
    });
    await Promise.all(
      participants.map((p) => this.queue.add('send', { participantId: p.id })),
    );
    return participants.length;
  }
}
