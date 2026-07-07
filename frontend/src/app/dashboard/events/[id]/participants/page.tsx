'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button } from '@/components/ui';
import {
  ApiError,
  certificatesApi,
  participantsApi,
  type Participant,
} from '@/lib/api';

export default function ParticipantsPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;

  const [participants, setParticipants] = useState<Participant[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [sendingAll, setSendingAll] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    participantsApi
      .list(eventId)
      .then(setParticipants)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Failed to load participants'),
      );
  }, [eventId]);

  useEffect(load, [load]);

  async function sendOne(participantId: string) {
    setSendingId(participantId);
    setNotice(null);
    try {
      await certificatesApi.sendOne(eventId, participantId);
      setNotice('Certificate queued.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to queue certificate');
    } finally {
      setSendingId(null);
    }
  }

  async function sendAll() {
    setSendingAll(true);
    setNotice(null);
    try {
      const { queued } = await certificatesApi.sendAll(eventId);
      setNotice(`${queued} certificate${queued === 1 ? '' : 's'} queued.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to queue certificates');
    } finally {
      setSendingAll(false);
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl">
        <Alert>{error}</Alert>
        <Link href="/dashboard" className="mt-4 inline-block text-sm underline underline-offset-4">
          ← Back to events
        </Link>
      </div>
    );
  }

  if (!participants) {
    return <p className="text-sm text-black/60 dark:text-white/60">Loading…</p>;
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link
          href={`/dashboard/events/${eventId}`}
          className="text-sm text-black/50 underline underline-offset-4 dark:text-white/50"
        >
          ← Back to event
        </Link>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">Participants</h1>
          <Button fullWidth={false} disabled={sendingAll} onClick={sendAll}>
            {sendingAll ? 'Queuing…' : 'Send all certificates'}
          </Button>
        </div>
      </div>

      {notice && <p className="text-sm text-green-600 dark:text-green-400">{notice}</p>}

      {participants.length === 0 ? (
        <div className="rounded-xl border border-dashed border-black/15 px-6 py-12 text-center dark:border-white/15">
          <p className="text-sm text-black/60 dark:text-white/60">No participants yet.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {participants.map((p) => (
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
              {p.certificateSentAt ? (
                <span className="text-sm text-green-600 dark:text-green-400">✓ Sent</span>
              ) : (
                <Button
                  fullWidth={false}
                  disabled={sendingId === p.id || p.willNotAttend}
                  onClick={() => sendOne(p.id)}
                >
                  {sendingId === p.id ? 'Queuing…' : 'Send certificate'}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
