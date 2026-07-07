import Link from 'next/link';
import type { AttendanceRate } from '@/lib/api';

interface AttendanceRateListProps {
  rates: AttendanceRate[];
}

export default function AttendanceRateList({ rates }: AttendanceRateListProps) {
  if (rates.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 px-4 py-6 text-center">
        <p className="text-sm text-muted">No attendance data yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-card p-5">
      <h3 className="text-sm font-medium text-muted">Attendance rate</h3>
      <ul className="flex flex-col gap-4">
        {rates.map((rate) => (
          <li key={rate.eventId} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-sm">
              <Link
                href={`/dashboard/events/${rate.eventId}`}
                className="font-medium hover:text-accent"
              >
                {rate.eventName}
              </Link>
              <span className="tabular-nums text-muted">
                {rate.present}/{rate.total} · {rate.rate}%
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${rate.rate}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
