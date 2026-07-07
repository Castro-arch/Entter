'use client';

import { useEffect, useState } from 'react';
import { attendanceApi, type DaySummary } from '@/lib/api';
import { subscribeToAttendance } from '@/lib/socket';

interface AttendanceSummaryProps {
  eventId: string;
  eventDayId: string;
}

/** Live total/present/missing cards for one event day, pushed over WebSocket. */
export default function AttendanceSummary({ eventId, eventDayId }: AttendanceSummaryProps) {
  const [summary, setSummary] = useState<DaySummary | null>(null);

  useEffect(() => {
    let active = true;
    attendanceApi
      .summary(eventId)
      .then((days) => {
        if (active) setSummary(days.find((d) => d.eventDayId === eventDayId) ?? null);
      })
      .catch(() => {});

    const unsubscribe = subscribeToAttendance(eventId, (update) => {
      if (update.eventDayId === eventDayId) setSummary(update);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [eventId, eventDayId]);

  if (!summary) {
    return <p className="text-sm text-black/50 dark:text-white/50">Loading…</p>;
  }

  const cards = [
    { label: 'Total', value: summary.total },
    { label: 'Checked in', value: summary.present },
    { label: 'Missing', value: summary.missing },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-black/10 px-4 py-3 text-center dark:border-white/10"
        >
          <div className="text-2xl font-semibold tabular-nums">{card.value}</div>
          <div className="text-xs text-black/50 dark:text-white/50">{card.label}</div>
        </div>
      ))}
    </div>
  );
}
