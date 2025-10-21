'use client';

interface SummaryPoint {
  label: string;
  amount: number;
}

interface SummaryChartProps {
  points: SummaryPoint[];
}

export function SummaryChart({ points }: SummaryChartProps) {
  if (!points.length) {
    return (
      <div className="rounded-3xl bg-surfaceLight p-6 text-sm text-textDark/70 shadow-glow dark:bg-surface dark:text-textPrimary/60">
        No spending recorded for this month.
      </div>
    );
  }

  const maxAmount = Math.max(...points.map((point) => point.amount), 0) || 1;

  return (
    <div className="rounded-3xl bg-surfaceLight p-6 shadow-glow dark:bg-surface">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-textDark/60 dark:text-textPrimary/60">
            Monthly spending
          </p>
          <h2 className="text-xl font-semibold text-textDark dark:text-textPrimary">
            Summary chart
          </h2>
        </div>
      </header>

      <div className="mt-6 flex items-end gap-2 sm:gap-3">
        {points.map((point) => {
          const height = Math.max((point.amount / maxAmount) * 160, 4);
          return (
            <div key={point.label} className="flex flex-1 flex-col items-center gap-2">
              <div
                className="w-full rounded-t-2xl bg-accent/50 transition-colors hover:bg-accent"
                style={{ height }}
                aria-label={`${point.label} total ${point.amount.toFixed(2)}`}
              />
              <span className="text-xs font-medium text-textDark/70 dark:text-textPrimary/60">
                {point.label}
              </span>
              <span className="text-xs text-textDark/60 dark:text-textPrimary/50">
                ${point.amount.toFixed(0)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
