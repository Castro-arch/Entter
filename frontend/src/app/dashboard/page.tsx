'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Alert } from '@/components/ui';
import { ApiError, eventsApi, type EventEntity, type EventStatus } from '@/lib/api';

const statusStyles: Record<EventStatus, string> = {
  DRAFT: 'bg-black/10 text-black/60 dark:bg-white/10 dark:text-white/60',
  PUBLISHED: 'bg-green-500/15 text-green-700 dark:text-green-300',
  FINISHED: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
};

const dateFormat = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function formatDays(event: EventEntity): string {
  const dates = event.eventDays.map((day) => new Date(day.date));
  if (dates.length === 0) return 'No dates';
  const first = dateFormat.format(dates[0]);
  if (dates.length === 1) return first;
  return `${first} → ${dateFormat.format(dates[dates.length - 1])} (${dates.length} days)`;
}

export default function DashboardPage() {
  const [events, setEvents] = useState<EventEntity[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    eventsApi
      .list()
      .then(setEvents)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Failed to load events'),
      );
  }, []);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
        <Link
          href="/dashboard/events/new"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-foreground px-4 text-sm font-medium text-background transition hover:opacity-90"
        >
          New event
        </Link>
      </div>

      {error && <Alert>{error}</Alert>}

      {!error && events === null && (
        <p className="text-sm text-black/60 dark:text-white/60">Loading events…</p>
      )}

      {events?.length === 0 && (
        <div className="rounded-xl border border-dashed border-black/15 px-6 py-12 text-center dark:border-white/15">
          <p className="text-sm text-black/60 dark:text-white/60">
            No events yet. Create your first one to get started.
          </p>
        </div>
      )}

      {events && events.length > 0 && (
        <ul className="flex flex-col gap-3">
          {events.map((event) => (
            <li key={event.id}>
              <Link
                href={`/dashboard/events/${event.id}`}
                className="flex items-center justify-between rounded-xl border border-black/10 px-4 py-4 transition-colors hover:border-black/25 dark:border-white/10 dark:hover:border-white/25"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{event.name}</span>
                  <span className="text-sm text-black/60 dark:text-white/60">
                    {formatDays(event)} · {event.ticketTypes.length} ticket type
                    {event.ticketTypes.length === 1 ? '' : 's'}
                  </span>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[event.status]}`}
                >
                  {event.status.toLowerCase()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
