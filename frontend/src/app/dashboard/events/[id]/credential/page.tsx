'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Alert } from '@/components/ui';
import { ApiError, eventsApi, type EventEntity } from '@/lib/api';

// Browser-only (canvas); never render it on the server.
const CredentialEditor = dynamic(
  () => import('@/components/credential-editor'),
  { ssr: false },
);

export default function CredentialPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;

  const [event, setEvent] = useState<EventEntity | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    eventsApi
      .get(eventId)
      .then(setEvent)
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : 'Failed to load event'),
      );
  }, [eventId]);

  if (loadError) return <Alert>{loadError}</Alert>;
  if (!event) {
    return <p className="text-sm text-black/60 dark:text-white/60">Loading…</p>;
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Credential — {event.name}</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Drag the name to where it should print on each attendee&apos;s
          credential. Position is saved as percentages, so it stays correct at
          any output size.
        </p>
      </div>
      <CredentialEditor
        eventId={event.id}
        initialArtworkUrl={event.credentialArtworkUrl}
        initialPosition={event.credentialNamePosition}
      />
    </div>
  );
}
