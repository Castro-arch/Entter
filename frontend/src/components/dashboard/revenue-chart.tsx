import type { RevenueDay } from '@/lib/api';

const currencyFormat = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});
const dateFormat = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' });

interface RevenueChartProps {
  total: number;
  days: RevenueDay[];
}

/** Hand-rolled bar chart — the project has no charting library and this is
 * the only shape needed, so styled divs are simpler than a new dependency. */
export default function RevenueChart({ total, days }: RevenueChartProps) {
  const max = Math.max(...days.map((day) => day.amount), 1);

  return (
    <div className="rounded-2xl border border-white/10 bg-card p-5">
      <div className="mb-5 flex items-baseline justify-between">
        <h3 className="text-sm font-medium text-muted">Revenue (last 14 days)</h3>
        <span className="text-lg font-semibold tabular-nums text-accent">
          {currencyFormat.format(total)}
        </span>
      </div>
      <div className="flex h-32 items-end gap-1.5">
        {days.map((day) => (
          <div
            key={day.date}
            className="group relative h-full flex-1"
            title={`${dateFormat.format(new Date(`${day.date}T00:00:00`))}: ${currencyFormat.format(day.amount)}`}
          >
            <div
              className="absolute bottom-0 w-full rounded-t bg-accent/60 transition-colors group-hover:bg-accent"
              style={{ height: `${Math.max((day.amount / max) * 100, day.amount > 0 ? 4 : 1)}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
