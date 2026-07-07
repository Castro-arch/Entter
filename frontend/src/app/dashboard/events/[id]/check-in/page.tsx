'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, TextField } from '@/components/ui';
import AttendanceSummary from '@/components/checkin/attendance-summary';
import {
  ApiError,
  attendanceApi,
  eventsApi,
  participantsApi,
  type AttendanceSearchResult,
  type CheckInResult,
  type EventEntity,
  type Participant,
} from '@/lib/api';
import { decodeQrPayload } from '@/lib/qr';
import { useOfflineCheckIn } from '@/lib/use-offline-checkin';

// Uses the camera + BarcodeDetector; never render it on the server.
const QrScanner = dynamic(() => import('@/components/checkin/qr-scanner'), {
  ssr: false,
});

const dateFormat = new Intl.DateTimeFormat('en', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

interface FeedEntry {
  clientId: string;
  label: string;
  status: 'pending' | CheckInResult['status'];
}

type Section = 'scanner' | 'participants';

export default function CheckInPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;

  const [event, setEvent] = useState<EventEntity | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [section, setSection] = useState<Section>('scanner');
  const [mode, setMode] = useState<'qr' | 'search'>('search');
  const [feed, setFeed] = useState<FeedEntry[]>([]);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AttendanceSearchResult[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [participants, setParticipants] = useState<Participant[] | null>(null);
  const [participantsError, setParticipantsError] = useState<string | null>(null);

  useEffect(() => {
    eventsApi
      .get(eventId)
      .then((data) => {
        setEvent(data);
        setSelectedDayId(data.eventDays[0]?.id ?? null);
        setMode(data.eventDays.length >= 2 ? 'qr' : 'search');
      })
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : 'Failed to load event'),
      );
  }, [eventId]);

  useEffect(() => {
    if (section !== 'participants') return;
    participantsApi
      .list(eventId)
      .then(setParticipants)
      .catch((err) =>
        setParticipantsError(
          err instanceof ApiError ? err.message : 'Failed to load participants',
        ),
      );
  }, [eventId, section]);

  const pushFeed = useCallback((entry: FeedEntry) => {
    setFeed((prev) => [entry, ...prev.filter((e) => e.clientId !== entry.clientId)].slice(0, 10));
  }, []);

  const handleResult = useCallback(
    (result: CheckInResult) => {
      if (!result.clientId) return;
      pushFeed({
        clientId: result.clientId,
        label:
          result.attendance?.participant.name ??
          (result.status === 'error' ? (result.message ?? 'Failed') : 'Unknown attendee'),
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
        setSearchError(err instanceof ApiError ? err.message : 'Search failed');
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

      pushFeed({ clientId: payload.p, label: 'Checking in…', status: 'pending' });
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

  if (loadError) return <Alert>{loadError}</Alert>;
  if (!event || !selectedDayId) {
    return <p className="text-sm text-black/60 dark:text-white/60">Loading…</p>;
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Check-in — {event.name}</h1>

      <div className="flex gap-2 text-sm font-medium">
        <button
          onClick={() => setSection('scanner')}
          className={`rounded-lg px-3 py-1.5 ${section === 'scanner' ? 'bg-foreground text-background' : 'border border-black/15 dark:border-white/20'}`}
        >
          Scanner
        </button>
        <button
          onClick={() => setSection('participants')}
          className={`rounded-lg px-3 py-1.5 ${section === 'participants' ? 'bg-foreground text-background' : 'border border-black/15 dark:border-white/20'}`}
        >
          Participants
        </button>
      </div>

      {event.eventDays.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {event.eventDays.map((day) => (
            <button
              key={day.id}
              onClick={() => setSelectedDayId(day.id)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                day.id === selectedDayId
                  ? 'bg-foreground text-background'
                  : 'border border-black/15 dark:border-white/20'
              }`}
            >
              {dateFormat.format(new Date(day.date))}
            </button>
          ))}
        </div>
      )}

      <AttendanceSummary eventId={eventId} eventDayId={selectedDayId} />

      {section === 'scanner' && (
        <>
          {pendingCount > 0 && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {pendingCount} scan{pendingCount === 1 ? '' : 's'} waiting to sync…
            </p>
          )}

          {event.eventDays.length >= 2 && qrCapable && (
            <div className="flex gap-2 text-sm font-medium">
              <button
                onClick={() => setMode('qr')}
                className={`rounded-lg px-3 py-1.5 ${mode === 'qr' ? 'bg-foreground text-background' : 'border border-black/15 dark:border-white/20'}`}
              >
                Scan QR
              </button>
              <button
                onClick={() => setMode('search')}
                className={`rounded-lg px-3 py-1.5 ${mode === 'search' ? 'bg-foreground text-background' : 'border border-black/15 dark:border-white/20'}`}
              >
                Search
              </button>
            </div>
          )}

          {mode === 'qr' && qrCapable && <QrScanner onDetect={handleQrDetect} />}

          {mode === 'search' && (
            <div className="flex flex-col gap-3">
              <TextField
                label="Search attendee"
                placeholder="Type a name…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {searchError && <Alert>{searchError}</Alert>}
              <ul className="flex flex-col gap-2">
                {results?.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between rounded-lg border border-black/10 px-3 py-2 dark:border-white/10"
                  >
                    <span>{r.name}</span>
                    {r.attendance?.status === 'PRESENT' ? (
                      <span className="text-sm text-green-600 dark:text-green-400">✓ Checked in</span>
                    ) : (
                      <Button fullWidth={false} onClick={() => markPresent(r.id)}>
                        Mark present
                      </Button>
                    )}
                  </li>
                ))}
                {results?.length === 0 && (
                  <li className="text-sm text-black/50 dark:text-white/50">No matches.</li>
                )}
              </ul>
            </div>
          )}

          {feed.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <h2 className="text-sm font-medium text-black/60 dark:text-white/60">Recent scans</h2>
              <ul className="flex flex-col gap-1 text-sm">
                {feed.map((entry) => (
                  <li key={entry.clientId} className="flex items-center justify-between">
                    <span>{entry.label}</span>
                    <span
                      className={
                        entry.status === 'error'
                          ? 'text-red-600 dark:text-red-400'
                          : entry.status === 'pending'
                            ? 'text-black/40 dark:text-white/40'
                            : 'text-green-600 dark:text-green-400'
                      }
                    >
                      {entry.status === 'pending'
                        ? 'syncing…'
                        : entry.status === 'error'
                          ? 'failed'
                          : entry.status === 'already_checked_in'
                            ? 'already in'
                            : 'checked in'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {section === 'participants' && (
        <div className="flex flex-col gap-3">
          {participantsError && <Alert>{participantsError}</Alert>}
          {!participants && (
            <p className="text-sm text-black/60 dark:text-white/60">Loading…</p>
          )}
          {participants?.length === 0 && (
            <div className="rounded-xl border border-dashed border-black/15 px-6 py-8 text-center dark:border-white/15">
              <p className="text-sm text-black/60 dark:text-white/60">No participants yet.</p>
            </div>
          )}
          {participants && participants.length > 0 && (
            <ul className="flex flex-col gap-2">
              {participants.map((p) => {
                const dayAttendance = p.attendance.find(
                  (a) => a.eventDayId === selectedDayId,
                );
                const arrived = dayAttendance?.status === 'PRESENT';
                return (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-4 rounded-lg border border-black/10 px-4 py-3 dark:border-white/10"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium">{p.name}</span>
                      <span className="text-sm text-black/50 dark:text-white/50">
                        {p.order.buyerEmail}
                        {p.willNotAttend && ' · will not attend'}
                      </span>
                    </div>
                    <span
                      className={`text-sm ${
                        arrived
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-black/50 dark:text-white/50'
                      }`}
                    >
                      {arrived ? '✓ Checked in' : 'Not arrived'}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
