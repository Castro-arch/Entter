'use client';

import { useRouter } from 'next/navigation';
import type { EventEntity } from '@/lib/api';

interface EventSwitcherProps {
  events: EventEntity[];
  currentEventId: string | null;
}

/** Styled `<select>` of the tenant's events, always dark since it lives in
 * the sidebar (which is always dark, independent of the current page). */
export default function EventSwitcher({ events, currentEventId }: EventSwitcherProps) {
  const router = useRouter();

  if (events.length === 0) {
    return <p className="px-3.5 text-xs text-muted">No events yet</p>;
  }

  return (
    <select
      value={currentEventId ?? ''}
      onChange={(e) => router.push(`/dashboard/events/${e.target.value}`)}
      className="h-10 w-full rounded-full border border-white/15 bg-white/5 px-3.5 text-sm text-white outline-none focus:border-accent"
    >
      {events.map((event) => (
        <option key={event.id} value={event.id} className="bg-card text-card-foreground">
          {event.name}
        </option>
      ))}
    </select>
  );
}
