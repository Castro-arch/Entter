'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { Alert, Button, TextField } from '@/components/ui';
import {
  ApiError,
  publicApi,
  type PublicEvent,
  type TicketType,
} from '@/lib/api';

const money = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function CheckoutForm() {
  const { id } = useParams<{ id: string }>();
  const ticketId = useSearchParams().get('ticket');

  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [ticket, setTicket] = useState<TicketType | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    publicApi
      .getEvent(id)
      .then((data) => {
        setEvent(data);
        setTicket(data.ticketTypes.find((t) => t.id === ticketId) ?? null);
      })
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : 'Event not found'),
      );
  }, [id, ticketId]);

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (!ticket) return;
    setError(null);
    setSubmitting(true);
    try {
      const { paymentUrl } = await publicApi.createOrder(id, {
        ticketTypeId: ticket.id,
        buyerName,
        buyerEmail,
        buyerPhone: buyerPhone.trim() || undefined,
      });
      // Hand off to the payment provider (or the dev pending page).
      window.location.href = paymentUrl;
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not start checkout.',
      );
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <main className="mx-auto flex max-w-md flex-1 flex-col gap-4 px-4 py-12">
        <Alert>{loadError}</Alert>
        <Link href={`/events/${id}`} className="text-sm underline underline-offset-4">
          ← Back to event
        </Link>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="mx-auto max-w-md px-4 py-12">
        <p className="text-sm text-black/60 dark:text-white/60">Loading…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-12">
      <div className="flex flex-col gap-1">
        <Link
          href={`/events/${id}`}
          className="text-sm text-black/50 underline underline-offset-4 dark:text-white/50"
        >
          ← {event.name}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>
      </div>

      {!ticket ? (
        <Alert>That ticket type isn&apos;t available. Please pick one on the event page.</Alert>
      ) : (
        <>
          <div className="flex items-center justify-between rounded-xl border border-black/10 px-4 py-4 dark:border-white/10">
            <span className="font-medium">{ticket.name}</span>
            <span>{money.format(Number(ticket.price))}</span>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && <Alert>{error}</Alert>}
            <TextField
              label="Full name"
              autoComplete="name"
              required
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
            />
            <TextField
              label="Email"
              type="email"
              autoComplete="email"
              required
              value={buyerEmail}
              onChange={(e) => setBuyerEmail(e.target.value)}
            />
            <TextField
              label="Phone"
              type="tel"
              autoComplete="tel"
              value={buyerPhone}
              onChange={(e) => setBuyerPhone(e.target.value)}
              hint="Optional."
            />
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Starting checkout…' : 'Continue to payment'}
            </Button>
          </form>
        </>
      )}
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-md px-4 py-12">
          <p className="text-sm text-black/60 dark:text-white/60">Loading…</p>
        </main>
      }
    >
      <CheckoutForm />
    </Suspense>
  );
}
