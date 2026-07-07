import Link from 'next/link';
import { notFound } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

interface PublicEvent {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  coverImageUrl: string | null;
  eventDays: { id: string; date: string; orderIndex: number }[];
  ticketTypes: {
    id: string;
    name: string;
    price: string;
    quantityAvailable: number;
    saleEndsAt: string | null;
  }[];
}

const money = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});
const dateFormat = new Intl.DateTimeFormat('en', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

async function getEvent(id: string): Promise<PublicEvent | null> {
  const res = await fetch(`${API_URL}/public/events/${id}`, {
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json();
}

export default async function PublicEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-12">
      {event.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- organizer-supplied external URL
        <img
          src={event.coverImageUrl}
          alt={event.name}
          className="aspect-video w-full rounded-2xl object-cover"
        />
      )}

      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{event.name}</h1>
        {event.location && (
          <p className="text-black/60 dark:text-white/60">{event.location}</p>
        )}
        <ul className="flex flex-col gap-0.5 text-sm text-black/60 dark:text-white/60">
          {event.eventDays.map((day) => (
            <li key={day.id}>{dateFormat.format(new Date(day.date))}</li>
          ))}
        </ul>
      </header>

      {event.description && (
        <p className="whitespace-pre-line leading-7">{event.description}</p>
      )}

      <section id="tickets" className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Tickets</h2>
        {event.ticketTypes.length === 0 ? (
          <p className="text-sm text-black/60 dark:text-white/60">
            Tickets aren&apos;t available yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {event.ticketTypes.map((ticket) => {
              const soldOut = ticket.quantityAvailable <= 0;
              return (
                <li
                  key={ticket.id}
                  className="flex items-center justify-between rounded-xl border border-black/10 px-4 py-4 dark:border-white/10"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium">{ticket.name}</span>
                    <span className="text-sm text-black/60 dark:text-white/60">
                      {money.format(Number(ticket.price))}
                    </span>
                  </div>
                  {soldOut ? (
                    <span className="text-sm text-black/40 dark:text-white/40">
                      Sold out
                    </span>
                  ) : (
                    <Link
                      href={`/events/${event.id}/checkout?ticket=${ticket.id}`}
                      className="inline-flex h-10 items-center justify-center rounded-lg bg-foreground px-4 text-sm font-medium text-background transition hover:opacity-90"
                    >
                      Get ticket
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
