'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { Alert, Button, TextArea, TextField } from '@/components/ui';
import {
  ApiError,
  eventsApi,
  type CertificateDispatchMode,
  type EventEntity,
  type EventStatus,
} from '@/lib/api';

// Browser-only (canvas); never render it on the server.
const CredentialEditor = dynamic(
  () => import('@/components/credential-editor'),
  { ssr: false },
);

const STATUSES: EventStatus[] = ['DRAFT', 'PUBLISHED', 'FINISHED'];

const dateFormat = new Intl.DateTimeFormat('en', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const eventId = params.id;

  const [event, setEvent] = useState<EventEntity | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState<EventStatus>('DRAFT');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [certTemplateUrl, setCertTemplateUrl] = useState('');
  const [certDispatchMode, setCertDispatchMode] = useState<CertificateDispatchMode>('MANUAL');
  const [certAutoDelayHours, setCertAutoDelayHours] = useState('24');
  const [certSaveError, setCertSaveError] = useState<string | null>(null);
  const [certSaving, setCertSaving] = useState(false);
  const [certSaved, setCertSaved] = useState(false);

  useEffect(() => {
    eventsApi
      .get(eventId)
      .then((data) => {
        setEvent(data);
        setName(data.name);
        setDescription(data.description ?? '');
        setLocation(data.location ?? '');
        setStatus(data.status);
        setCertTemplateUrl(data.certificateTemplateUrl ?? '');
        setCertDispatchMode(data.certificateDispatchMode);
        setCertAutoDelayHours(String(data.certificateAutoDelayHours ?? 24));
      })
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : 'Failed to load event'),
      );
  }, [eventId]);

  async function handleSave(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setSaveError(null);
    setSaving(true);
    setSaved(false);
    try {
      const updated = await eventsApi.update(eventId, {
        name: name.trim(),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
        status,
      });
      setEvent(updated);
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveCertificate(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setCertSaveError(null);
    setCertSaving(true);
    setCertSaved(false);
    try {
      const updated = await eventsApi.updateCertificate(eventId, {
        templateUrl: certTemplateUrl.trim() || undefined,
        dispatchMode: certDispatchMode,
        autoDelayHours: Number(certAutoDelayHours) || 0,
      });
      setEvent(updated);
      setCertSaved(true);
    } catch (err) {
      setCertSaveError(
        err instanceof ApiError ? err.message : 'Failed to save certificate settings',
      );
    } finally {
      setCertSaving(false);
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl">
        <Alert>{loadError}</Alert>
        <Link
          href="/dashboard"
          className="mt-4 inline-block text-sm underline underline-offset-4"
        >
          ← Back to events
        </Link>
      </div>
    );
  }

  if (!event) {
    return (
      <p className="text-sm text-black/60 dark:text-white/60">Loading event…</p>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <div className="flex flex-col gap-1">
        <Link
          href="/dashboard"
          className="text-sm text-black/50 underline underline-offset-4 dark:text-white/50"
        >
          ← Back to events
        </Link>
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">{event.name}</h1>
          <div className="flex shrink-0 items-center gap-4">
            <Link
              href={`/dashboard/events/${event.id}/check-in`}
              className="text-sm font-medium underline underline-offset-4"
            >
              Check-in
            </Link>
            <Link
              href={`/dashboard/events/${event.id}/participants`}
              className="text-sm font-medium underline underline-offset-4"
            >
              Participants
            </Link>
            {event.status === 'PUBLISHED' && (
              <Link
                href={`/events/${event.id}`}
                target="_blank"
                className="text-sm font-medium underline underline-offset-4"
              >
                View public page ↗
              </Link>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Details</h2>
        {saveError && <Alert>{saveError}</Alert>}
        <TextField
          label="Event name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <TextArea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <TextField
          label="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Status</span>
          <select
            className="h-11 rounded-lg border border-black/15 bg-transparent px-3 text-sm outline-none focus:border-foreground dark:border-white/20"
            value={status}
            onChange={(e) => setStatus(e.target.value as EventStatus)}
          >
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {value.toLowerCase()}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-3">
          <Button type="submit" fullWidth={false} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
          {saved && (
            <span className="text-sm text-green-600 dark:text-green-400">Saved ✓</span>
          )}
        </div>
      </form>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">
          Schedule &amp; tickets
        </h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex flex-col gap-1">
            <span className="text-black/50 dark:text-white/50">Days</span>
            <ul className="flex flex-col gap-0.5">
              {event.eventDays.map((day) => (
                <li key={day.id}>{dateFormat.format(new Date(day.date))}</li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-black/50 dark:text-white/50">Ticket types</span>
            {event.ticketTypes.length === 0 ? (
              <span className="text-black/40 dark:text-white/40">None</span>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {event.ticketTypes.map((ticket) => (
                  <li key={ticket.id}>
                    {ticket.name} — {ticket.price} · {ticket.quantityAvailable} left
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-medium">Credential</h2>
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
      </section>

      <form onSubmit={handleSaveCertificate} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-medium">Certificate</h2>
          <p className="text-sm text-black/60 dark:text-white/60">
            PDF template attendees receive after the event. The name is printed
            centered on the page — use the participants list to send manually,
            or switch to automatic dispatch below.
          </p>
        </div>
        {certSaveError && <Alert>{certSaveError}</Alert>}
        <TextField
          label="Template URL (PDF)"
          placeholder="https://…"
          value={certTemplateUrl}
          onChange={(e) => setCertTemplateUrl(e.target.value)}
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Dispatch</span>
          <select
            className="h-11 rounded-lg border border-black/15 bg-transparent px-3 text-sm outline-none focus:border-foreground dark:border-white/20"
            value={certDispatchMode}
            onChange={(e) => setCertDispatchMode(e.target.value as CertificateDispatchMode)}
          >
            <option value="MANUAL">Manual — send from the participants list</option>
            <option value="AUTO">Automatic — after the event ends</option>
          </select>
        </label>
        {certDispatchMode === 'AUTO' && (
          <TextField
            label="Delay after the last day (hours)"
            type="number"
            min={0}
            value={certAutoDelayHours}
            onChange={(e) => setCertAutoDelayHours(e.target.value)}
          />
        )}
        <div className="flex items-center gap-3">
          <Button type="submit" fullWidth={false} disabled={certSaving}>
            {certSaving ? 'Saving…' : 'Save certificate settings'}
          </Button>
          {certSaved && (
            <span className="text-sm text-green-600 dark:text-green-400">Saved ✓</span>
          )}
        </div>
      </form>
    </div>
  );
}
