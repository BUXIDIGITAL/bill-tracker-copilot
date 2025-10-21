'use client';

import { formatTotalsMap } from '../lib/currency';
import type { Currency } from '../lib/types';

interface TotalsBarProps {
  monthlyTotals: Partial<Record<Currency, number>>;
  next7Totals: Partial<Record<Currency, number>>;
  next30Totals: Partial<Record<Currency, number>>;
}

export function TotalsBar({ monthlyTotals, next7Totals, next30Totals }: TotalsBarProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-3">
      <article className="rounded-3xl bg-surface p-4 shadow-glow">
        <p className="text-sm uppercase tracking-wide text-textPrimary/60">This month</p>
        <p className="mt-2 text-xl font-semibold text-accent">
          {formatTotalsMap(monthlyTotals)}
        </p>
      </article>
      <article className="rounded-3xl bg-surface p-4 shadow-glow">
        <p className="text-sm uppercase tracking-wide text-textPrimary/60">Next 7 days</p>
        <p className="mt-2 text-xl font-semibold text-accent">
          {formatTotalsMap(next7Totals)}
        </p>
      </article>
      <article className="rounded-3xl bg-surface p-4 shadow-glow">
        <p className="text-sm uppercase tracking-wide text-textPrimary/60">
          Next 30 days
        </p>
        <p className="mt-2 text-xl font-semibold text-accent">
          {formatTotalsMap(next30Totals)}
        </p>
      </article>
    </section>
  );
}
