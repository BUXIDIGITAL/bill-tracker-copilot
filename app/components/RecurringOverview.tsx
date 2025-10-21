'use client';

import { formatTotalsMap } from '../lib/currency';
import type { Currency } from '../lib/types';

export interface FrequencyTotal {
  frequency: string;
  totals: Partial<Record<Currency, number>>;
}

interface RecurringOverviewProps {
  items: FrequencyTotal[];
}

const frequencyLabels: Record<string, string> = {
  WEEKLY: 'Weekly',
  EVERY_30_DAYS: 'Every 30 days',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  ANNUALLY: 'Annually',
  CUSTOM_DAYS: 'Custom cadence',
};

export function RecurringOverview({ items }: RecurringOverviewProps) {
  return (
    <section className="rounded-3xl bg-surfaceLight p-6 shadow-glow dark:bg-surface">
      <header className="mb-4 flex items-baseline justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-textDark/60 dark:text-textPrimary/60">
            Recurring overview
          </p>
          <h2 className="text-xl font-semibold text-textDark dark:text-textPrimary">
            Totals by cadence
          </h2>
        </div>
      </header>

      {items.length === 0 ? (
        <p className="text-sm text-textDark/60 dark:text-textPrimary/60">
          No active recurring bills match the current filters.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map(({ frequency, totals }) => (
            <li
              key={frequency}
              className="flex items-center justify-between rounded-2xl border border-transparent bg-mutedLight/50 px-4 py-3 text-sm text-textDark shadow-sm transition hover:border-accent/40 dark:bg-muted/30 dark:text-textPrimary/80"
            >
              <span className="font-medium">
                {frequencyLabels[frequency] ?? frequency}
              </span>
              <span className="text-textDark/70 dark:text-textPrimary/70">
                {formatTotalsMap(totals)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
