'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert, Button, TextArea, TextField } from '@/components/ui';
import { ApiError, eventsApi, type CreateEventInput } from '@/lib/api';

const STEPS = ['Details', 'Dates', 'Tickets', 'Review'] as const;

interface TicketDraft {
  name: string;
  price: string;
  quantityAvailable: string;
  saleEndsAt: string;
}

const emptyTicket: TicketDraft = {
  name: '',
  price: '',
  quantityAvailable: '',
  saleEndsAt: '',
};

export default function NewEventPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [days, setDays] = useState<string[]>(['']);
  const [tickets, setTickets] = useState<TicketDraft[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const filledDays = days.filter((day) => day.trim() !== '');

  /** Returns an error message for the current step, or null when it's valid. */
  function validateStep(): string | null {
    if (step === 0 && name.trim().length < 2) {
      return 'Give your event a name (at least 2 characters).';
    }
    if (step === 1 && filledDays.length === 0) {
      return 'Add at least one date for the event.';
    }
    if (step === 2) {
      for (const ticket of tickets) {
        if (ticket.name.trim() === '') return 'Every ticket type needs a name.';
        if (Number(ticket.price) < 0 || ticket.price === '') {
          return 'Every ticket type needs a price (0 or more).';
        }
        if (Number(ticket.quantityAvailable) < 0 || ticket.quantityAvailable === '') {
          return 'Every ticket type needs an available quantity.';
        }
      }
    }
    return null;
  }

  function goNext() {
    const message = validateStep();
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  function goBack() {
    setError(null);
    setStep((current) => Math.max(current - 1, 0));
  }

  async function handleCreate() {
    setError(null);
    setSubmitting(true);
    const payload: CreateEventInput = {
      name: name.trim(),
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      coverImageUrl: coverImageUrl.trim() || undefined,
      days: filledDays.map((date) => ({ date })),
      ticketTypes: tickets.length
        ? tickets.map((ticket) => ({
            name: ticket.name.trim(),
            price: Number(ticket.price),
            quantityAvailable: Number(ticket.quantityAvailable),
            saleEndsAt: ticket.saleEndsAt || undefined,
          }))
        : undefined,
    };
    try {
      await eventsApi.create(payload);
      router.replace('/dashboard');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Something went wrong creating the event.',
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link
          href="/dashboard"
          className="text-sm text-black/50 underline underline-offset-4 dark:text-white/50"
        >
          ← Back to events
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">New event</h1>
      </div>

      <Stepper current={step} />

      {error && <Alert>{error}</Alert>}

      {step === 0 && (
        <section className="flex flex-col gap-4">
          <TextField
            label="Event name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <TextArea
            label="Description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <TextField
            label="Location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          />
          <TextField
            label="Cover image URL"
            type="url"
            value={coverImageUrl}
            onChange={(event) => setCoverImageUrl(event.target.value)}
            hint="Optional. A public image URL for the event."
          />
        </section>
      )}

      {step === 1 && (
        <section className="flex flex-col gap-3">
          <p className="text-sm text-black/60 dark:text-white/60">
            One day unlocks manual roll-call; two or more unlock QR check-in.
          </p>
          {days.map((day, index) => (
            <div key={index} className="flex items-end gap-2">
              <TextField
                label={`Day ${index + 1}`}
                type="date"
                value={day}
                className="flex-1"
                onChange={(event) =>
                  setDays(days.map((d, i) => (i === index ? event.target.value : d)))
                }
              />
              {days.length > 1 && (
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth={false}
                  onClick={() => setDays(days.filter((_, i) => i !== index))}
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            fullWidth={false}
            className="self-start"
            onClick={() => setDays([...days, ''])}
          >
            + Add day
          </Button>
        </section>
      )}

      {step === 2 && (
        <section className="flex flex-col gap-4">
          <p className="text-sm text-black/60 dark:text-white/60">
            Ticket types are optional — you can add them later.
          </p>
          {tickets.map((ticket, index) => (
            <div
              key={index}
              className="flex flex-col gap-3 rounded-xl border border-black/10 p-4 dark:border-white/10"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Ticket {index + 1}</span>
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth={false}
                  onClick={() => setTickets(tickets.filter((_, i) => i !== index))}
                >
                  Remove
                </Button>
              </div>
              <TextField
                label="Name"
                value={ticket.name}
                onChange={(event) =>
                  setTickets(
                    tickets.map((t, i) =>
                      i === index ? { ...t, name: event.target.value } : t,
                    ),
                  )
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  label="Price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={ticket.price}
                  onChange={(event) =>
                    setTickets(
                      tickets.map((t, i) =>
                        i === index ? { ...t, price: event.target.value } : t,
                      ),
                    )
                  }
                />
                <TextField
                  label="Quantity"
                  type="number"
                  min={0}
                  value={ticket.quantityAvailable}
                  onChange={(event) =>
                    setTickets(
                      tickets.map((t, i) =>
                        i === index
                          ? { ...t, quantityAvailable: event.target.value }
                          : t,
                      ),
                    )
                  }
                />
              </div>
              <TextField
                label="Sales end"
                type="datetime-local"
                value={ticket.saleEndsAt}
                onChange={(event) =>
                  setTickets(
                    tickets.map((t, i) =>
                      i === index ? { ...t, saleEndsAt: event.target.value } : t,
                    ),
                  )
                }
                hint="Optional."
              />
            </div>
          ))}
          <Button
            type="button"
            variant="secondary"
            fullWidth={false}
            className="self-start"
            onClick={() => setTickets([...tickets, { ...emptyTicket }])}
          >
            + Add ticket type
          </Button>
        </section>
      )}

      {step === 3 && (
        <section className="flex flex-col gap-3 rounded-xl border border-black/10 p-4 text-sm dark:border-white/10">
          <Review label="Name" value={name} />
          {location.trim() && <Review label="Location" value={location} />}
          <Review
            label="Dates"
            value={`${filledDays.length} day${filledDays.length === 1 ? '' : 's'}`}
          />
          <Review
            label="Ticket types"
            value={
              tickets.length
                ? tickets.map((t) => t.name.trim() || 'Untitled').join(', ')
                : 'None'
            }
          />
          <p className="text-black/50 dark:text-white/50">
            The event is created as a draft — you can publish it later.
          </p>
        </section>
      )}

      <div className="flex items-center justify-between">
        {step > 0 ? (
          <Button type="button" variant="secondary" fullWidth={false} onClick={goBack}>
            Back
          </Button>
        ) : (
          <span />
        )}
        {step < STEPS.length - 1 ? (
          <Button type="button" fullWidth={false} onClick={goNext}>
            Next
          </Button>
        ) : (
          <Button
            type="button"
            fullWidth={false}
            onClick={handleCreate}
            disabled={submitting}
          >
            {submitting ? 'Creating…' : 'Create event'}
          </Button>
        )}
      </div>
    </div>
  );
}

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2 text-xs">
      {STEPS.map((label, index) => (
        <li key={label} className="flex items-center gap-2">
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full ${
              index <= current
                ? 'bg-foreground text-background'
                : 'bg-black/10 text-black/50 dark:bg-white/10 dark:text-white/50'
            }`}
          >
            {index + 1}
          </span>
          <span
            className={
              index === current ? 'font-medium' : 'text-black/50 dark:text-white/50'
            }
          >
            {label}
          </span>
          {index < STEPS.length - 1 && (
            <span className="text-black/20 dark:text-white/20">—</span>
          )}
        </li>
      ))}
    </ol>
  );
}

function Review({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-black/50 dark:text-white/50">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
