'use client';

import { useAuth } from '@/lib/auth/auth-context';

const comingSoon = [
  {
    title: 'Team',
    description:
      'Invite staff to help run check-in without sharing the owner login. The role model (owner/staff) already exists — the invite flow doesn’t yet.',
  },
  {
    title: 'Asaas connection',
    description:
      'Connect this organizer’s own Asaas sub-account, so ticket revenue settles directly instead of pooling in one platform account (see Financeiro).',
  },
  {
    title: 'Subdomain & branding',
    description:
      'Customize the public landing pages’ subdomain and appearance.',
  },
];

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Account</h2>
        <div className="grid grid-cols-2 gap-4 rounded-xl border border-black/10 px-4 py-4 text-sm dark:border-white/10">
          <div className="flex flex-col gap-1">
            <span className="text-black/50 dark:text-white/50">Name</span>
            <span>{user?.name}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-black/50 dark:text-white/50">Email</span>
            <span>{user?.email}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-black/50 dark:text-white/50">Role</span>
            <span>{user?.role}</span>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Coming soon</h2>
        <ul className="flex flex-col gap-2">
          {comingSoon.map((item) => (
            <li
              key={item.title}
              className="rounded-xl border border-dashed border-black/15 px-4 py-4 dark:border-white/15"
            >
              <p className="text-sm font-medium">{item.title}</p>
              <p className="mt-1 text-sm text-black/60 dark:text-white/60">
                {item.description}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
