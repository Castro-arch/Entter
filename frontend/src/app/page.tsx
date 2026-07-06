'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';

const primaryLink =
  'inline-flex h-11 w-full items-center justify-center rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90';
const secondaryLink =
  'inline-flex h-11 w-full items-center justify-center rounded-lg border border-black/15 px-4 text-sm font-medium transition-colors hover:bg-black/[.04] dark:border-white/20 dark:hover:bg-white/[.06]';

export default function Home() {
  const { status } = useAuth();

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
        <span className="text-3xl font-semibold tracking-tight">Entter</span>
        <p className="text-black/60 dark:text-white/60">
          Event credentialing &amp; check-in, built to stay fast and correct even
          when the venue network isn&apos;t.
        </p>
        <div className="flex w-full flex-col gap-3">
          {status === 'authenticated' ? (
            <Link href="/dashboard" className={primaryLink}>
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className={primaryLink}>
                Sign in
              </Link>
              <Link href="/register" className={secondaryLink}>
                Create an account
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
