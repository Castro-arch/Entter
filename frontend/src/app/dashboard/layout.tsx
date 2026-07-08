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
      <main className="flex flex-1 items-center justify-center bg-[#131215]">
        <p className="text-sm text-[#8E8A84]">Carregando…</p>
      </main>
    );
  }

  // Every dashboard page shares the "Entter Dashboard v2" dark shell. The
  // overview reproduces the reference design full-bleed and supplies its own
  // padding; the sub-pages get the standard padded canvas.
  const isOverview = pathname === '/dashboard';

  // Pinned to the viewport height (rather than the body's `min-h-full`, which
  // only sets a floor) so the sidebar stays put and only `main` scrolls.
  return (
    <div className="flex h-dvh flex-col overflow-hidden md:flex-row">
      <Sidebar />
      <main
        className={`flex flex-1 flex-col overflow-y-auto scroll-smooth bg-[#131215] font-[family-name:var(--font-hanken)] text-[#F5F2EE] [color-scheme:dark] ${
          isOverview ? '' : 'px-4 py-6 md:px-8 md:py-8'
        }`}
      >
        {children}
      </main>
    </div>
  );
}
