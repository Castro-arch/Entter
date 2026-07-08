'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Alert, PageHeader, Skeleton } from '@/components/dash-ui';
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
        setLoadError(err instanceof ApiError ? err.message : 'Não foi possível carregar o evento'),
      );
  }, [eventId]);

  if (loadError) return <Alert>{loadError}</Alert>;
  if (!event) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader
        title="Credencial"
        subtitle={
          <>
            {event.name} — arraste o nome para onde ele deve ser impresso na
            credencial. A posição é salva em porcentagens, então continua
            correta em qualquer tamanho de saída.
          </>
        }
        backHref={`/dashboard/events/${event.id}`}
        backLabel="Voltar para o evento"
      />
      <CredentialEditor
        eventId={event.id}
        initialArtworkUrl={event.credentialArtworkUrl}
        initialPosition={event.credentialNamePosition}
      />
    </div>
  );
}
