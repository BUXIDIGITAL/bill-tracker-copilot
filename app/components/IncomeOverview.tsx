'use client';

import { formatTotalsMap } from '../lib/currency';
import type { Currency } from '../lib/types';

export interface CategoryTotal {
  category: string;
  totals: Partial<Record<Currency, number>>;
}

interface IncomeOverviewProps {
  items: CategoryTotal[];
}

export function IncomeOverview({ items }: IncomeOverviewProps) {
  return (
    <section className="rounded-3xl bg-surfaceLight p-6 shadow-glow dark:bg-surface">
      <header className="mb-4 flex items-baseline justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-textDark/60 dark:text-textPrimary/60">
            Income breakdown
          </p>
          <h2 className="text-xl font-semibold text-textDark dark:text-textPrimary">
            By category
          </h2>
        </div>
      </header>

      {items.length === 0 ? (
        <p className="text-sm text-textDark/60 dark:text-textPrimary/60">
          No income entries match the current filters.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map(({ category, totals }) => (
            <li
              key={category || 'uncategorized'}
              className="flex items-center justify-between rounded-2xl border border-transparent bg-emerald-500/10 px-4 py-3 text-sm text-textDark shadow-sm transition hover:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-textPrimary"
            >
              <span className="font-medium">
                {category || 'Uncategorized'}
              </span>
              <span className="text-emerald-500 dark:text-emerald-400">
                {formatTotalsMap(totals)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
