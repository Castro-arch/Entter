import { Award, CalendarCheck, Ticket } from 'lucide-react';
import type { ActivityEntry } from '@/lib/api';

const relativeFormat = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

function relativeTime(timestamp: string): string {
  const diffMs = new Date(timestamp).getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60_000);
  if (Math.abs(diffMinutes) < 60) return relativeFormat.format(diffMinutes, 'minute');
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return relativeFormat.format(diffHours, 'hour');
  return relativeFormat.format(Math.round(diffHours / 24), 'day');
}

const typeMeta: Record<ActivityEntry['type'], { icon: typeof Ticket; className: string }> = {
  order: { icon: Ticket, className: 'bg-blue-500/15 text-blue-300' },
  certificate: { icon: Award, className: 'bg-purple-500/15 text-purple-300' },
  checkin: { icon: CalendarCheck, className: 'bg-emerald-500/15 text-emerald-300' },
};

interface RecentActivityProps {
  entries: ActivityEntry[];
}

export default function RecentActivity({ entries }: RecentActivityProps) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 px-4 py-6 text-center">
        <p className="text-sm text-muted">No activity yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-card p-5">
      <h3 className="text-sm font-medium text-muted">Recent activity</h3>
      <ul className="flex flex-col gap-3">
        {entries.map((entry, index) => {
          const meta = typeMeta[entry.type];
          return (
            <li key={index} className="flex items-center gap-3 text-sm">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.className}`}
              >
                <meta.icon size={15} strokeWidth={2} />
              </span>
              <span className="flex-1 leading-snug">{entry.label}</span>
              <span className="shrink-0 text-xs text-muted">{relativeTime(entry.timestamp)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
