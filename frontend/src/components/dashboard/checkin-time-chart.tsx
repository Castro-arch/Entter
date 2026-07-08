'use client';

import { useMemo, useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type DotItemDotProps,
  type TooltipContentProps,
} from 'recharts';

type Granularity = 'weekly' | 'monthly';

interface ChartPoint {
  label: string;
  /** Average check-in duration this period, in seconds. */
  current: number;
  /** Same metric for the prior period — the dashed reference line. */
  previous: number;
}

const WEEKLY: ChartPoint[] = [
  { label: 'Segunda', current: 34, previous: 39 },
  { label: 'Terça', current: 25, previous: 33 },
  { label: 'Quarta', current: 22, previous: 30 },
  { label: 'Quinta', current: 28, previous: 35 },
  { label: 'Sexta', current: 24, previous: 42 },
  { label: 'Sábado', current: 19, previous: 38 },
  { label: 'Domingo', current: 21, previous: 34 },
];

const MONTHLY: ChartPoint[] = [
  { label: 'Sem. 1', current: 31, previous: 37 },
  { label: 'Sem. 2', current: 27, previous: 34 },
  { label: 'Sem. 3', current: 24, previous: 31 },
  { label: 'Sem. 4', current: 22, previous: 29 },
];

const GRANULARITIES: { value: Granularity; label: string }[] = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
];

function TooltipCard({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null;
  const current = payload.find((p) => p.dataKey === 'current')?.value;
  const previous = payload.find((p) => p.dataKey === 'previous')?.value;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        background: '#F5F2EE',
        color: '#131215',
        borderRadius: 12,
        padding: '9px 13px',
        boxShadow: '0 10px 28px rgba(0,0,0,0.35)',
      }}
    >
      <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.04em', color: '#8E8A84', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 800 }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#131215" strokeWidth="2.4" strokeLinecap="round">
          <circle cx="12" cy="13" r="8" />
          <path d="M12 9v4l2.5 2M9 2h6" />
        </svg>
        {current}s
      </span>
      {previous !== undefined && (
        <span style={{ fontSize: 11, color: '#8E8A84' }}>Período anterior: {previous}s</span>
      )}
    </div>
  );
}

/** Marks the fastest day/week with a permanent dot (the mockup's static
 * callout); every other point stays invisible until hovered. */
function BestDot(bestIndex: number) {
  return function renderDot(props: DotItemDotProps) {
    if (props.index !== bestIndex || props.cx == null || props.cy == null) {
      return <g key={`dot-${props.index}`} />;
    }
    return (
      <g key={`dot-${props.index}`}>
        <circle cx={props.cx} cy={props.cy} r={6} fill="#F5F2EE" />
        <circle cx={props.cx} cy={props.cy} r={12} fill="none" stroke="rgba(245,242,238,0.3)" strokeWidth={2} />
      </g>
    );
  };
}

/**
 * Real, interactive replacement for the dashboard mockup's hand-drawn SVG
 * squiggle: an actual data-driven chart (Recharts) with a working
 * Semanal/Mensal toggle, a hover tooltip, and a dashed reference line for
 * the prior period. Values are illustrative (see the dashboard v2 mock-data
 * gate) — the point is that this is now a genuine chart, not a static path.
 */
export default function CheckinTimeChart() {
  const [granularity, setGranularity] = useState<Granularity>('weekly');
  const data = granularity === 'weekly' ? WEEKLY : MONTHLY;

  const average = useMemo(
    () => Math.round(data.reduce((sum, p) => sum + p.current, 0) / data.length),
    [data],
  );
  const bestIndex = useMemo(
    () => data.reduce((best, p, i) => (p.current < data[best].current ? i : best), 0),
    [data],
  );

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minHeight: 250 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Tempo Médio de Check-in (segundos)</div>
          <span style={{ fontSize: 12, color: '#8E8A84' }}>
            média: <span style={{ color: '#F5F2EE', fontWeight: 700 }}>{average}s</span>
          </span>
        </div>
        <div style={{ display: 'flex', gap: 14, fontSize: 12 }}>
          {GRANULARITIES.map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => setGranularity(g.value)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 12,
                color: granularity === g.value ? '#F5F2EE' : '#8E8A84',
                fontWeight: granularity === g.value ? 700 : 400,
                textDecoration: granularity === g.value ? 'underline' : 'none',
                textUnderlineOffset: 4,
              }}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 210 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 28, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id="checkinGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F0561D" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#F0561D" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              interval={0}
              tick={{ fill: '#8E8A84', fontSize: 11.5 }}
            />
            <YAxis hide domain={['dataMin - 6', 'dataMax + 10']} />
            <Tooltip
              content={TooltipCard}
              cursor={{ stroke: 'rgba(245,242,238,0.25)', strokeWidth: 1 }}
            />
            <Line
              type="monotone"
              dataKey="previous"
              name="Período anterior"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth={2}
              strokeDasharray="5 6"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="current"
              name="Este período"
              stroke="#F0561D"
              strokeWidth={3}
              fill="url(#checkinGlow)"
              dot={BestDot(bestIndex)}
              activeDot={{ r: 6, fill: '#F5F2EE', stroke: '#F0561D', strokeWidth: 2 }}
              animationDuration={600}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
