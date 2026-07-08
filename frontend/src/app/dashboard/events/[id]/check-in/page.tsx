'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  BackLink,
  Button,
  PageHeader,
  SegmentedControl,
  Skeleton,
  TextField,
} from '@/components/dash-ui';
import AttendanceSummary from '@/components/checkin/attendance-summary';
import {
  ApiError,
  attendanceApi,
  eventsApi,
  type AttendanceSearchResult,
  type CheckInResult,
  type EventEntity,
} from '@/lib/api';
import { decodeQrPayload } from '@/lib/qr';
import { useOfflineCheckIn } from '@/lib/use-offline-checkin';

// Uses the camera + BarcodeDetector; never render it on the server.
const QrScanner = dynamic(() => import('@/components/checkin/qr-scanner'), {
  ssr: false,
});

const dateFormat = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

const timeFormat = new Intl.DateTimeFormat('pt-BR', {
  hour: '2-digit',
  minute: '2-digit',
});

interface FeedEntry {
  clientId: string;
  label: string;
  status: 'pending' | CheckInResult['status'];
  /** Epoch ms of when the entry (last) changed, for the timestamp column. */
  at: number;
}

const feedStatusStyles: Record<FeedEntry['status'], { label: string; className: string }> = {
  pending: { label: 'sincronizando…', className: 'text-[#8E8A84]' },
  error: { label: 'falhou', className: 'text-[#E8604A]' },
  already_checked_in: { label: 'já entrou', className: 'text-[#E8B44A]' },
  checked_in: { label: 'check-in feito', className: 'text-[#9BC98E]' },
};

export default function CheckInPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;

  const [event, setEvent] = useState<EventEntity | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [mode, setMode] = useState<'qr' | 'search'>('search');
  const [feed, setFeed] = useState<FeedEntry[]>([]);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AttendanceSearchResult[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    eventsApi
      .get(eventId)
      .then((data) => {
        setEvent(data);
        setSelectedDayId(data.eventDays[0]?.id ?? null);
        setMode(data.eventDays.length >= 2 ? 'qr' : 'search');
      })
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : 'Não foi possível carregar o evento'),
      );
  }, [eventId]);

  const pushFeed = useCallback((entry: Omit<FeedEntry, 'at'>) => {
    setFeed((prev) => [
      { ...entry, at: Date.now() },
      ...prev.filter((e) => e.clientId !== entry.clientId),
    ].slice(0, 10));
  }, []);

  const handleResult = useCallback(
    (result: CheckInResult) => {
      if (!result.clientId) return;
      pushFeed({
        clientId: result.clientId,
        label:
          result.attendance?.participant.name ??
          (result.status === 'error' ? (result.message ?? 'Falhou') : 'Participante desconhecido'),
        status: result.status,
      });
    },
    [pushFeed],
  );

  const { submitScan, pendingCount } = useOfflineCheckIn(eventId, handleResult);

  const runSearch = useCallback(
    async (value: string) => {
      if (!selectedDayId) return;
      setSearchError(null);
      try {
        setResults(await attendanceApi.search(eventId, selectedDayId, value));
      } catch (err) {
        setSearchError(err instanceof ApiError ? err.message : 'A busca falhou');
      }
    },
    [eventId, selectedDayId],
  );

  useEffect(() => {
    const handle = setTimeout(() => void runSearch(query), 250);
    return () => clearTimeout(handle);
  }, [query, runSearch]);

  const handleQrDetect = useCallback(
    (rawValue: string) => {
      if (!selectedDayId) return;
      const payload = decodeQrPayload(rawValue);
      if (!payload || payload.e !== eventId) return; // invalid or foreign QR

      pushFeed({ clientId: payload.p, label: 'Fazendo check-in…', status: 'pending' });
      void submitScan({ eventDayId: selectedDayId, method: 'QR', qrToken: rawValue });
    },
    [eventId, selectedDayId, submitScan, pushFeed],
  );

  const markPresent = useCallback(
    async (participantId: string) => {
      if (!selectedDayId) return;
      await submitScan({ eventDayId: selectedDayId, method: 'MANUAL', participantId });
      void runSearch(query);
    },
    [selectedDayId, submitScan, runSearch, query],
  );

  const qrCapable = useMemo(
    () => typeof window !== 'undefined' && 'BarcodeDetector' in window,
    [],
  );

  if (loadError) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <Alert>{loadError}</Alert>
        <div className="mt-4">
          <BackLink href="/dashboard/events">Voltar para eventos</BackLink>
        </div>
      </div>
    );
  }

  if (!event || !selectedDayId) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-9 w-56" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-[74px]" />
          <Skeleton className="h-[74px]" />
          <Skeleton className="h-[74px]" />
        </div>
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <PageHeader
        title="Check-in"
        subtitle={event.name}
        backHref={`/dashboard/events/${event.id}`}
        backLabel="Voltar para o evento"
      />

      {event.eventDays.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {event.eventDays.map((day) => (
            <button
              key={day.id}
              onClick={() => setSelectedDayId(day.id)}
              className={`rounded-full px-3.5 py-1.5 text-[13px] font-bold transition-colors ${
                day.id === selectedDayId
                  ? 'bg-[#F0561D] text-[#131215]'
                  : 'border border-white/10 bg-[#1C1B1F] text-[#8E8A84] hover:text-[#F5F2EE]'
              }`}
            >
              {dateFormat.format(new Date(day.date))}
            </button>
          ))}
        </div>
      )}

      <AttendanceSummary eventId={eventId} eventDayId={selectedDayId} />

      {pendingCount > 0 && (
        <span className="inline-flex items-center gap-2 self-start rounded-full bg-[#26231F] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.04em] text-[#E8B44A]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#E8B44A]" />
          {pendingCount} scan{pendingCount === 1 ? '' : 's'} aguardando sincronização
        </span>
      )}

      {event.eventDays.length >= 2 && qrCapable && (
        <SegmentedControl<'qr' | 'search'>
          value={mode}
          onChange={setMode}
          options={[
            { value: 'qr', label: 'Escanear QR' },
            { value: 'search', label: 'Buscar' },
          ]}
        />
      )}

      {mode === 'qr' && qrCapable && <QrScanner onDetect={handleQrDetect} />}

      {mode === 'search' && (
        <div className="flex flex-col gap-3">
          <TextField
            label="Buscar participante"
            placeholder="Digite um nome…"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {searchError && <Alert>{searchError}</Alert>}
          <ul className="flex flex-col gap-2">
            {results?.map((r) => (
              <li
                key={r.id}
                className={`flex items-center justify-between gap-3 rounded-[12px] border border-white/10 bg-[#1C1B1F] px-4 py-3 ${
                  r.willNotAttend ? 'opacity-60' : ''
                }`}
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-semibold text-[#F5F2EE]">{r.name}</span>
                  {r.willNotAttend && (
                    <span className="text-[11px] font-bold uppercase tracking-[0.04em] text-[#E8B44A]">
                      Não comparecerá
                    </span>
                  )}
                </div>
                {r.attendance?.status === 'PRESENT' ? (
                  <span className="flex shrink-0 items-center gap-1.5 text-[13px] font-semibold text-[#9BC98E]">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 12l5 5L20 7" />
                    </svg>
                    Presente
                    {r.attendance.checkedInAt && (
                      <span className="font-normal text-[#8E8A84]">
                        · {timeFormat.format(new Date(r.attendance.checkedInAt))}
                      </span>
                    )}
                  </span>
                ) : (
                  <Button className="h-9 shrink-0 px-3.5 text-xs" onClick={() => markPresent(r.id)}>
                    Marcar presença
                  </Button>
                )}
              </li>
            ))}
            {results?.length === 0 && (
              <li className="text-sm text-[#8E8A84]">Nenhum resultado.</li>
            )}
          </ul>
        </div>
      )}

      {feed.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-[#8E8A84]">
            Últimos scans
          </h2>
          <ul className="flex flex-col gap-1.5 text-sm">
            {feed.map((entry) => {
              const style = feedStatusStyles[entry.status];
              return (
                <li key={entry.clientId} className="flex items-center justify-between gap-3">
                  <span className="truncate text-[#F5F2EE]">{entry.label}</span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className={`text-[12.5px] font-semibold ${style.className}`}>
                      {style.label}
                    </span>
                    <span className="text-[11.5px] tabular-nums text-[#8E8A84]">
                      {timeFormat.format(entry.at)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
