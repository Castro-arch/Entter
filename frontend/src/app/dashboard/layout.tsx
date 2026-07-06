'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth/auth-context';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status, user, logout } = useAuth();

  // Client-side guard: the API enforces auth on every request, but redirecting
  // here avoids rendering the shell for a visitor without a session.
  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

  if (status !== 'authenticated' || !user) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-sm text-black/60 dark:text-white/60">Loading…</p>
      </main>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-black/10 px-6 py-4 dark:border-white/10">
        <span className="font-semibold tracking-tight">Entter</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-black/60 dark:text-white/60">
            {user.name}
          </span>
          <button
            type="button"
            onClick={() => logout()}
            className="text-sm font-medium underline underline-offset-4"
          >
            Sign out
          </button>
        </div>
      </header>
      <main className="flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
