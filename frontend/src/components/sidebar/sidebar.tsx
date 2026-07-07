'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { eventsApi, type EventEntity } from '@/lib/api';
import { useCurrentEventId } from '@/lib/use-current-event-id';

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

// Icons copied verbatim (same viewBox/paths) from the approved design so the
// sidebar matches it exactly rather than substituting a different icon set.
const icons = {
  dashboard: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ),
  eventos: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
    </svg>
  ),
  checkin: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3z" />
      <path d="M15 15h3v3h-3zM21 15v.01M15 21h.01M18 18h.01M21 21h.01" />
    </svg>
  ),
  credenciais: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 3v3h6V3M9 12h6M9 16h4" />
    </svg>
  ),
  certificados: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="10" r="6" />
      <path d="M8.5 15L7 22l5-3 5 3-1.5-7" />
    </svg>
  ),
  notificacoes: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M10 21h4" />
    </svg>
  ),
  configuracoes: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.6 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.6-1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3h.1a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5h.1a1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9v.1a1.7 1.7 0 001.5 1h.2a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
    </svg>
  ),
};

const GLOBAL_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: icons.dashboard },
  { label: 'Eventos', href: '/dashboard/events', icon: icons.eventos },
];

const EVENT_NAV: { label: string; segment: string; icon: ReactNode }[] = [
  { label: 'Check-in', segment: 'check-in', icon: icons.checkin },
  { label: 'Credenciais', segment: 'credential', icon: icons.credenciais },
  { label: 'Certificados', segment: 'certificate', icon: icons.certificados },
];

const TAIL_NAV: NavItem[] = [
  { label: 'Notificações', href: '/dashboard/notifications', icon: icons.notificacoes },
  { label: 'Configurações', href: '/dashboard/settings', icon: icons.configuracoes },
];

function isEventsActive(pathname: string): boolean {
  if (pathname === '/dashboard/events' || pathname.startsWith('/dashboard/events/new')) {
    return true;
  }
  // Matches exactly /dashboard/events/{id} (Details) but not its sub-pages.
  return /^\/dashboard\/events\/[^/]+$/.test(pathname);
}

function NavRow({ active, href, icon, label }: { active: boolean; href: string; icon: ReactNode; label: string }) {
  const className = active
    ? 'flex items-center gap-[11px] rounded-[10px] bg-[#26231F] px-3.5 py-2.5 font-semibold text-[#F5F2EE]'
    : 'flex items-center gap-[11px] rounded-[10px] px-3.5 py-2.5 text-[#8E8A84] transition-colors hover:bg-[#1B1917] hover:text-[#F5F2EE]';
  return (
    <Link href={href} className={className}>
      {icon}
      {label}
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const [events, setEvents] = useState<EventEntity[] | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    eventsApi.list().then(setEvents).catch(() => setEvents([]));
  }, []);

  // Closing on navigation means a nav link tap doesn't leave the drawer open
  // behind the new page. Adjusting state during render (rather than in an
  // effect) for a prop/route change is the pattern React recommends for this.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMobileOpen(false);
  }

  // Links still need an event id to point at even though the design doesn't
  // surface a visible switcher — falls back to the most recently viewed
  // event, same as before.
  const currentEventId = useCurrentEventId(events);

  return (
    <div className="dash">
      <div className="flex items-center justify-between border-b border-white/10 bg-[#131215] px-4 py-3 md:hidden">
        <span className="text-[24px] font-extrabold tracking-[-0.5px] text-[#F0561D]">entter</span>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-[#F5F2EE]"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-56 shrink-0 flex-col gap-1 bg-[#131215] py-5 pr-4 pl-5 transition-transform duration-200 md:static md:z-auto md:translate-x-0 md:border-r md:border-white/[.05] ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-3.5 pb-4 text-[24px] font-extrabold tracking-[-0.5px] text-[#F0561D]">
          entter
        </div>

        <nav className="flex flex-col gap-0.5 text-[13.5px]">
          {GLOBAL_NAV.map((item) => {
            const active =
              item.href === '/dashboard' ? pathname === '/dashboard' : isEventsActive(pathname);
            return <NavRow key={item.href} active={active} href={item.href} icon={item.icon} label={item.label} />;
          })}

          {EVENT_NAV.map((item) => {
            const href = currentEventId ? `/dashboard/events/${currentEventId}/${item.segment}` : '/dashboard/events';
            const active = pathname.includes(`/${item.segment}`);
            return <NavRow key={item.segment} active={active} href={href} icon={item.icon} label={item.label} />;
          })}

          {TAIL_NAV.map((item) => (
            <NavRow key={item.href} active={pathname === item.href} href={item.href} icon={item.icon} label={item.label} />
          ))}
        </nav>

        <div className="relative mt-auto rounded-2xl bg-[#F0561D] px-4 pt-[52px] pb-4 text-center">
          <div className="absolute left-1/2 top-[-26px] flex h-[58px] w-[58px] -translate-x-1/2 items-center justify-center rounded-full border-[3px] border-[#F0561D] bg-[#131215]">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#F5F2EE" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="4" width="6" height="6" rx="1" />
              <rect x="14" y="4" width="6" height="6" rx="1" />
              <rect x="4" y="14" width="6" height="6" rx="1" />
              <path d="M14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z" fill="#F5F2EE" stroke="none" />
            </svg>
          </div>
          <div className="flex flex-col items-center gap-0.5 text-[19px] font-extrabold leading-[1.15] text-[#131215]">
            <span>Seu próximo</span>
            <span>evento começa aqui</span>
          </div>
          <Link
            href="/dashboard/events/new"
            className="mt-3 block rounded-[9px] bg-[#131215] py-2.5 text-[12.5px] font-semibold text-[#F5F2EE] transition-colors hover:bg-black"
          >
            Criar Evento
          </Link>
        </div>
      </aside>
    </div>
  );
}
