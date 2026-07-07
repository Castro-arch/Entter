'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function Pending() {
  const { id } = useParams<{ id: string }>();
  const order = useSearchParams().get('order');

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Payment pending</h1>
      <p className="text-black/60 dark:text-white/60">
        We&apos;re waiting for your payment to be confirmed. Once it&apos;s
        approved, your personalized credential is sent to your email
        automatically.
      </p>
      {order && (
        <p className="text-xs text-black/40 dark:text-white/40">Order {order}</p>
      )}
      <Link href={`/events/${id}`} className="text-sm underline underline-offset-4">
        ← Back to event
      </Link>
    </main>
  );
}

export default function CheckoutPendingPage() {
  return (
    <Suspense fallback={null}>
      <Pending />
    </Suspense>
  );
}
