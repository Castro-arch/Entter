'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import Sidebar from '@/components/sidebar/sidebar';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status, user } = useAuth();

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

  // Only the overview page has been redesigned around the warm dark theme;
  // other dashboard pages keep their existing light/OS-dark styling.
  const isOverview = pathname === '/dashboard';

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <Sidebar />
      <main
        className={`flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8 ${
          isOverview ? 'dash bg-background text-foreground' : ''
        }`}
      >
        {children}
      </main>
    </div>
  );
}
