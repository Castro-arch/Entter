'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Alert } from '@/components/ui';
import AttendanceRateList from '@/components/dashboard/attendance-rate-list';
import RecentActivity from '@/components/dashboard/recent-activity';
import RevenueChart from '@/components/dashboard/revenue-chart';
import { useAuth } from '@/lib/auth/auth-context';
import {
  ApiError,
  dashboardApi,
  eventsApi,
  type DashboardSummary,
  type EventEntity,
} from '@/lib/api';

const dateFormat = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' });
const currencyFormat = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

function nextDay(event: EventEntity): Date | null {
  const upcoming = event.eventDays
    .map((day) => new Date(day.date))
    .filter((date) => date.getTime() >= Date.now())
    .sort((a, b) => a.getTime() - b.getTime());
  return upcoming[0] ?? null;
}

export default function DashboardOverviewPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventEntity[] | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    eventsApi
      .list()
      .then(setEvents)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Failed to load events'),
      );
    dashboardApi
      .summary()
      .then(setSummary)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Failed to load dashboard data'),
      );
  }, []);

  if (error) return <Alert>{error}</Alert>;
  if (!events || !summary) {
    return <p className="text-sm text-muted">Loading…</p>;
  }

  const published = events.filter((e) => e.status === 'PUBLISHED').length;
  const firstName = user?.name.split(' ')[0] ?? 'there';

  const upcoming = events
    .map((event) => ({ event, day: nextDay(event) }))
    .filter(
      (entry): entry is { event: EventEntity; day: Date } =>
        entry.day !== null && entry.event.status === 'PUBLISHED',
    )
    .sort((a, b) => a.day.getTime() - b.day.getTime())
    .slice(0, 3);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">Welcome back</p>
          <h1 className="text-2xl font-semibold tracking-tight">{firstName}</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-white/10 bg-card px-4 py-2 text-sm font-medium tabular-nums">
            {currencyFormat.format(summary.revenue.total)} revenue
          </span>
          <Link
            href="/dashboard/events/new"
            className="inline-flex h-10 items-center justify-center rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground transition hover:opacity-90"
          >
            New event
          </Link>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-card p-8">
        <p className="text-sm text-muted">Overview</p>
        <h2 className="mt-2 max-w-md text-3xl font-semibold leading-tight">
          {events.length === 0
            ? "You haven't created an event yet"
            : `You have ${published} published event${published === 1 ? '' : 's'} out of ${events.length}`}
        </h2>
        <Link
          href="/dashboard/events"
          className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground transition hover:opacity-90"
        >
          View events
          <ArrowUpRight size={16} />
        </Link>
      </div>

      {upcoming.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {upcoming.map(({ event, day }, index) => (
            <Link
              key={event.id}
              href={`/dashboard/events/${event.id}`}
              className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-card p-5 transition-colors hover:border-accent/50"
            >
              <span className="text-xs font-medium text-accent">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="font-medium leading-snug">{event.name}</span>
              <span className="text-sm text-muted">{dateFormat.format(day)}</span>
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <AttendanceRateList rates={summary.attendanceRates} />
        <RecentActivity entries={summary.recentActivity} />
      </div>

      <RevenueChart total={summary.revenue.total} days={summary.revenue.last14Days} />
    </div>
  );
}
