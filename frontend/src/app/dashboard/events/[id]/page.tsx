'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { Alert, Button, TextArea, TextField } from '@/components/ui';
import {
  ApiError,
  eventsApi,
  type EventEntity,
  type EventStatus,
} from '@/lib/api';

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

  useEffect(() => {
    eventsApi
      .get(eventId)
      .then((data) => {
        setEvent(data);
        setName(data.name);
        setDescription(data.description ?? '');
        setLocation(data.location ?? '');
        setStatus(data.status);
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

  if (loadError) return <Alert>{loadError}</Alert>;
  if (!event) {
    return <p className="text-sm text-black/60 dark:text-white/60">Loading event…</p>;
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">{event.name}</h1>
        {event.status === 'PUBLISHED' && (
          <Link
            href={`/events/${event.id}`}
            target="_blank"
            className="shrink-0 text-sm font-medium underline underline-offset-4"
          >
            View public page ↗
          </Link>
        )}
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
    </div>
  );
}
