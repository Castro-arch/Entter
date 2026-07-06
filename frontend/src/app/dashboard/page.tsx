'use client';

import { useAuth } from '@/lib/auth/auth-context';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">
        Welcome, {user?.name}
      </h1>
      <p className="text-sm text-black/60 dark:text-white/60">
        You&apos;re signed in as{' '}
        <span className="font-medium">{user?.role.toLowerCase()}</span>. Event
        creation tools land here next.
      </p>
    </div>
  );
}
