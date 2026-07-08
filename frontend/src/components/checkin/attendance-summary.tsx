'use client';

import { useEffect, useState } from 'react';
import { ProgressBar, Skeleton } from '@/components/dash-ui';
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
    return (
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-[74px]" />
          <Skeleton className="h-[74px]" />
          <Skeleton className="h-[74px]" />
        </div>
        <Skeleton className="h-1.5 w-full rounded-full" />
      </div>
    );
  }

  const cards = [
    { label: 'Total', value: summary.total, accent: 'text-[#F5F2EE]' },
    { label: 'Presentes', value: summary.present, accent: 'text-[#9BC98E]' },
    { label: 'Faltam', value: summary.missing, accent: 'text-[#F0561D]' },
  ];
  const pct = summary.total > 0 ? Math.round((summary.present / summary.total) * 100) : 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-[14px] border border-white/10 px-4 py-3.5 text-center"
          >
            <div className={`text-2xl font-extrabold tabular-nums tracking-[-0.5px] ${card.accent}`}>
              {card.value}
            </div>
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8E8A84]">
              {card.label}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <ProgressBar value={pct} className="flex-1" />
        <span className="shrink-0 text-[12px] font-bold tabular-nums text-[#F5F2EE]">
          {pct}%
        </span>
      </div>
    </div>
  );
}
