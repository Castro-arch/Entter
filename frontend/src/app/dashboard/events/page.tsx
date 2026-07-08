'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  CopyButton,
  EmptyState,
  PageHeader,
  SegmentedControl,
  Skeleton,
} from '@/components/dash-ui';
import { ApiError, eventsApi, type EventEntity, type EventStatus } from '@/lib/api';

const statusLabels: Record<EventStatus, { label: string; tone: 'neutral' | 'success' | 'warning' }> = {
  DRAFT: { label: 'Rascunho', tone: 'warning' },
  PUBLISHED: { label: 'Publicado', tone: 'success' },
  FINISHED: { label: 'Encerrado', tone: 'neutral' },
};

type StatusFilter = 'ALL' | EventStatus;

const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function formatDays(event: EventEntity): string {
  const dates = event.eventDays.map((day) => new Date(day.date));
  if (dates.length === 0) return 'Sem datas';
  const first = dateFormat.format(dates[0]);
  if (dates.length === 1) return first;
  return `${first} → ${dateFormat.format(dates[dates.length - 1])} (${dates.length} dias)`;
}

/** Last calendar day of the event, for the upcoming/past split. */
function lastDay(event: EventEntity): number {
  const times = event.eventDays.map((day) => new Date(day.date).getTime());
  return times.length ? Math.max(...times) : Number.POSITIVE_INFINITY;
}

function firstDay(event: EventEntity): number {
  const times = event.eventDays.map((day) => new Date(day.date).getTime());
  return times.length ? Math.min(...times) : Number.POSITIVE_INFINITY;
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventEntity[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  useEffect(() => {
    eventsApi
      .list()
      .then(setEvents)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Não foi possível carregar os eventos'),
      );
  }, []);

  const { upcoming, past } = useMemo(() => {
    if (!events) return { upcoming: [], past: [] };
    const needle = query.trim().toLowerCase();
    const filtered = events.filter((event) => {
      if (statusFilter !== 'ALL' && event.status !== statusFilter) return false;
      if (!needle) return true;
      return (
        event.name.toLowerCase().includes(needle) ||
        (event.location ?? '').toLowerCase().includes(needle)
      );
    });
    // "Today" counts as upcoming until the day is over.
    const startOfToday = new Date().setHours(0, 0, 0, 0);
    const upcoming = filtered
      .filter((event) => lastDay(event) >= startOfToday)
      .sort((a, b) => firstDay(a) - firstDay(b));
    const past = filtered
      .filter((event) => lastDay(event) < startOfToday)
      .sort((a, b) => lastDay(b) - lastDay(a));
    return { upcoming, past };
  }, [events, query, statusFilter]);

  const nothingMatches =
    events !== null && events.length > 0 && upcoming.length === 0 && past.length === 0;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader
        title="Eventos"
        subtitle={
          events
            ? `${events.length} evento${events.length === 1 ? '' : 's'} no total`
            : 'Gerencie seus eventos, credenciais e check-in'
        }
        actions={
          <Link
            href="/dashboard/events/new"
            className="inline-flex h-10 items-center gap-1.5 rounded-[10px] bg-[#F0561D] px-4 text-[13px] font-bold text-[#131215] transition-colors hover:bg-[#FF6A31]"
          >
            <span className="text-[15px] leading-none">+</span> Criar Evento
          </Link>
        }
      />

      {error && <Alert>{error}</Alert>}

      {!error && events === null && (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-10 w-full max-w-xs" />
          <Skeleton className="h-[76px] w-full" />
          <Skeleton className="h-[76px] w-full" />
          <Skeleton className="h-[76px] w-full" />
        </div>
      )}

      {events !== null && events.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex h-10 w-full max-w-xs items-center gap-2.5 rounded-full border border-white/10 bg-[#1C1B1F] px-4">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8E8A84" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <input
                type="search"
                placeholder="Buscar por nome ou local…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent text-[13px] text-[#F5F2EE] outline-none placeholder:text-[#8E8A84]"
              />
            </div>
            <SegmentedControl<StatusFilter>
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'ALL', label: 'Todos' },
                { value: 'DRAFT', label: 'Rascunhos' },
                { value: 'PUBLISHED', label: 'Publicados' },
                { value: 'FINISHED', label: 'Encerrados' },
              ]}
            />
          </div>

          {nothingMatches && (
            <EmptyState>Nenhum evento corresponde à busca ou ao filtro atual.</EmptyState>
          )}

          {upcoming.length > 0 && (
            <EventGroup title="Próximos" events={upcoming} />
          )}
          {past.length > 0 && <EventGroup title="Anteriores" events={past} />}
        </div>
      )}

      {events?.length === 0 && (
        <EmptyState title="Nenhum evento ainda">
          <p>Crie o primeiro para liberar credenciais, check-in e certificados.</p>
          <Link
            href="/dashboard/events/new"
            className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-[10px] bg-[#F0561D] px-4 text-[13px] font-bold text-[#131215] transition-colors hover:bg-[#FF6A31]"
          >
            <span className="text-[15px] leading-none">+</span> Criar Evento
          </Link>
        </EmptyState>
      )}
    </div>
  );
}

function EventGroup({ title, events }: { title: string; events: EventEntity[] }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-[#8E8A84]">
        {title}
      </h2>
      <ul className="flex flex-col gap-3">
        {events.map((event) => (
          <EventRow key={event.id} event={event} />
        ))}
      </ul>
    </section>
  );
}

function EventRow({ event }: { event: EventEntity }) {
  const status = statusLabels[event.status];
  const publicUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/events/${event.id}` : '';

  return (
    <li className="group relative flex items-center gap-4 rounded-[14px] border border-white/10 px-5 py-4 transition-colors hover:border-white/25 hover:bg-[#1C1B1F]">
      {event.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- covers are arbitrary external URLs
        <img
          src={event.coverImageUrl}
          alt=""
          className="h-11 w-11 shrink-0 rounded-[10px] object-cover"
        />
      ) : (
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] bg-[#26231F]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#F5F2EE" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="4" width="18" height="17" rx="2" />
            <path d="M3 9h18M8 2v4M16 2v4" />
          </svg>
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Link
          href={`/dashboard/events/${event.id}`}
          className="truncate font-bold text-[#F5F2EE] after:absolute after:inset-0"
        >
          {event.name}
        </Link>
        <span className="truncate text-[12.5px] text-[#8E8A84]">
          {formatDays(event)}
          {event.location && ` · ${event.location}`} · {event.ticketTypes.length}{' '}
          {event.ticketTypes.length === 1 ? 'tipo de ingresso' : 'tipos de ingresso'}
        </span>
      </div>
      {event.status === 'PUBLISHED' && publicUrl && (
        <span className="relative z-10 hidden sm:block">
          <CopyButton value={publicUrl} />
        </span>
      )}
      <Badge tone={status.tone}>{status.label}</Badge>
      <svg
        className="shrink-0 text-[#8E8A84] transition-colors group-hover:text-[#F5F2EE]"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </li>
  );
}
