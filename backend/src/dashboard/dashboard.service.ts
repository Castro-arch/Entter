import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const RECENT_ACTIVITY_LIMIT = 10;
const REVENUE_WINDOW_DAYS = 14;
const ATTENDANCE_RATE_EVENT_LIMIT = 5;

export interface RevenueDay {
  date: string;
  amount: number;
}

export interface ActivityEntry {
  type: 'order' | 'certificate' | 'checkin';
  label: string;
  timestamp: string;
}

export interface AttendanceRate {
  eventId: string;
  eventName: string;
  total: number;
  present: number;
  rate: number;
}

export interface DashboardSummary {
  revenue: { total: number; last14Days: RevenueDay[] };
  recentActivity: ActivityEntry[];
  attendanceRates: AttendanceRate[];
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(tenantId: string): Promise<DashboardSummary> {
    const [revenue, recentActivity, attendanceRates] = await Promise.all([
      this.getRevenue(tenantId),
      this.getRecentActivity(tenantId),
      this.getAttendanceRates(tenantId),
    ]);
    return { revenue, recentActivity, attendanceRates };
  }

  private async getRevenue(
    tenantId: string,
  ): Promise<{ total: number; last14Days: RevenueDay[] }> {
    const paidOrders = await this.prisma.order.findMany({
      where: { status: 'PAID', event: { tenantId } },
      select: { createdAt: true, ticketType: { select: { price: true } } },
    });

    const total = paidOrders.reduce((sum, order) => sum + Number(order.ticketType.price), 0);

    // Zero-filled so the chart has a continuous x-axis, not just days with sales.
    const byDay = new Map<string, number>();
    const today = new Date();
    for (let i = REVENUE_WINDOW_DAYS - 1; i >= 0; i -= 1) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      byDay.set(dayKey(date), 0);
    }
    for (const order of paidOrders) {
      const key = dayKey(order.createdAt);
      if (byDay.has(key)) {
        byDay.set(key, byDay.get(key)! + Number(order.ticketType.price));
      }
    }

    return {
      total,
      last14Days: [...byDay.entries()].map(([date, amount]) => ({ date, amount })),
    };
  }

  private async getRecentActivity(tenantId: string): Promise<ActivityEntry[]> {
    const [orders, certificates, checkins] = await Promise.all([
      this.prisma.order.findMany({
        where: { status: 'PAID', event: { tenantId } },
        orderBy: { createdAt: 'desc' },
        take: RECENT_ACTIVITY_LIMIT,
        select: { buyerName: true, createdAt: true, event: { select: { name: true } } },
      }),
      this.prisma.participant.findMany({
        where: { certificateSentAt: { not: null }, event: { tenantId } },
        orderBy: { certificateSentAt: 'desc' },
        take: RECENT_ACTIVITY_LIMIT,
        select: { name: true, certificateSentAt: true, event: { select: { name: true } } },
      }),
      this.prisma.attendance.findMany({
        where: {
          status: 'PRESENT',
          participant: { event: { tenantId } },
        },
        orderBy: { checkedInAt: 'desc' },
        take: RECENT_ACTIVITY_LIMIT,
        select: {
          checkedInAt: true,
          participant: { select: { name: true, event: { select: { name: true } } } },
        },
      }),
    ]);

    const entries: ActivityEntry[] = [
      ...orders.map((order) => ({
        type: 'order' as const,
        label: `${order.buyerName} bought a ticket — ${order.event.name}`,
        timestamp: order.createdAt.toISOString(),
      })),
      ...certificates.map((participant) => ({
        type: 'certificate' as const,
        label: `Certificate sent to ${participant.name} — ${participant.event.name}`,
        timestamp: participant.certificateSentAt!.toISOString(),
      })),
      ...checkins.map((attendance) => ({
        type: 'checkin' as const,
        label: `${attendance.participant.name} checked in — ${attendance.participant.event.name}`,
        timestamp: attendance.checkedInAt!.toISOString(),
      })),
    ];

    return entries
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, RECENT_ACTIVITY_LIMIT);
  }

  private async getAttendanceRates(tenantId: string): Promise<AttendanceRate[]> {
    const events = await this.prisma.event.findMany({
      where: { tenantId, participants: { some: {} } },
      orderBy: { createdAt: 'desc' },
      take: ATTENDANCE_RATE_EVENT_LIMIT,
      select: { id: true, name: true },
    });

    return Promise.all(
      events.map(async (event) => {
        const [total, present] = await Promise.all([
          this.prisma.attendance.count({ where: { participant: { eventId: event.id } } }),
          this.prisma.attendance.count({
            where: { participant: { eventId: event.id }, status: 'PRESENT' },
          }),
        ]);
        return {
          eventId: event.id,
          eventName: event.name,
          total,
          present,
          rate: total === 0 ? 0 : Math.round((present / total) * 100),
        };
      }),
    );
  }
}
