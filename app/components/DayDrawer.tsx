'use client';

import { useEffect, useMemo } from 'react';
import clsx from 'clsx';
import { IconButton } from './IconButton';
import { formatCurrency } from '../lib/currency';
import type { Bill, Income } from '../lib/types';

interface DayDrawerProps {
  open: boolean;
  date: string | null;
  bills: Bill[];
  incomes: Income[];
  onClose: () => void;
  onEdit: (bill: Bill) => void;
  onDelete: (billId: string) => void;
  onEditIncome: (income: Income) => void;
  onDeleteIncome: (incomeId: string) => void;
}

const recurrenceLabels: Record<string, string> = {
  WEEKLY: 'Weekly',
  EVERY_30_DAYS: 'Every 30 days',
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  ANNUALLY: 'Annually',
  CUSTOM_DAYS: 'Custom interval',
};

const incomeRecurrenceLabels: Record<Income['recurrence'], string> = {
  ONE_TIME: 'One-time',
  BIWEEKLY: 'Bi-weekly',
  MONTHLY: 'Monthly',
};

export function DayDrawer({
  open,
  date,
  bills,
  incomes,
  onClose,
  onEdit,
  onDelete,
  onEditIncome,
  onDeleteIncome,
}: DayDrawerProps) {
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && open) {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const formattedDate = useMemo(() => {
    if (!date) return '';
    const [year, month, day] = date.split('-').map(Number);
    if (!year || !month || !day) return date;
    const instance = new Date(year, month - 1, day);
    return new Intl.DateTimeFormat('en-CA', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(instance);
  }, [date]);

  const billCount = bills.length;
  const incomeCount = incomes.length;
  const totalCount = billCount + incomeCount;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={clsx(
        'fixed inset-0 z-40 flex justify-end transition-opacity',
        open ? 'pointer-events-auto' : 'pointer-events-none',
      )}
    >
      <div
        className={clsx(
          'absolute inset-0 bg-black/60 transition-opacity',
          open ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={clsx(
          'relative h-full w-full max-w-md transform bg-surfaceLight p-6 shadow-xl transition-transform dark:bg-surface',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <header className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-textDark/60 dark:text-textPrimary/60">
              Daily summary
            </p>
            <h2 className="text-xl font-semibold text-textDark dark:text-textPrimary">
              {formattedDate}
            </h2>
            <p className="text-sm text-textDark/60 dark:text-textPrimary/60">
              {totalCount} item{totalCount === 1 ? '' : 's'} · Bills {billCount} · Income{' '}
              {incomeCount}
            </p>
          </div>
          <IconButton aria-label="Close bill drawer" onClick={onClose}>
            ✕
          </IconButton>
        </header>

        <div className="space-y-6 overflow-y-auto pb-20">
          {totalCount === 0 && (
            <p className="rounded-2xl bg-mutedLight/60 p-4 text-sm text-textDark/60 dark:bg-muted/40 dark:text-textPrimary/60">
              Nothing scheduled for this day.
            </p>
          )}

          {billCount > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-textDark/60 dark:text-textPrimary/50">
                Bills
              </p>
              {bills.map((bill) => (
                <article
                  key={bill.id}
                  className="rounded-2xl bg-mutedLight/70 p-4 dark:bg-muted/50"
                >
                  <header className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-semibold text-textDark dark:text-textPrimary">
                        {bill.name}
                      </h3>
                      <p className="text-sm text-accent">
                        {formatCurrency(bill.amount, bill.currency)}
                      </p>
                    </div>
                    <span className="rounded-full bg-accent/10 px-3 py-1 text-xs uppercase tracking-wide text-accent">
                      {bill.recurrence.type === 'CUSTOM_DAYS'
                        ? `${bill.recurrence.intervalDays ?? 1}-day`
                        : recurrenceLabels[bill.recurrence.type]}
                    </span>
                  </header>
                  {bill.notes && (
                    <p className="mt-3 text-sm text-textDark/70 dark:text-textPrimary/70">
                      {bill.notes}
                    </p>
                  )}
                  <footer className="mt-4 flex gap-2">
                    <button
                      type="button"
                      className="rounded-full bg-accent/20 px-4 py-1 text-sm font-medium text-accent transition hover:bg-accent/30"
                      onClick={() => onEdit(bill)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="rounded-full bg-danger/20 px-4 py-1 text-sm font-medium text-danger transition hover:bg-danger/30"
                      onClick={() => onDelete(bill.id)}
                    >
                      Delete
                    </button>
                  </footer>
                </article>
              ))}
            </div>
          )}

          {incomeCount > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-textDark/60 dark:text-textPrimary/50">
                Income
              </p>
              {incomes.map((income) => (
                <article
                  key={income.id}
                  className="rounded-2xl bg-emerald-500/10 p-4 dark:bg-emerald-500/10"
                >
                  <header className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-semibold text-textDark dark:text-textPrimary">
                        {income.name}
                      </h3>
                      <p className="text-sm text-emerald-500 dark:text-emerald-400">
                        +{formatCurrency(income.amount, income.currency)}
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
                        {incomeRecurrenceLabels[income.recurrence]}
                      </span>
                      {income.category && (
                        <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
                          {income.category}
                        </span>
                      )}
                    </div>
                  </header>
                  {income.notes && (
                    <p className="mt-3 text-sm text-textDark/70 dark:text-textPrimary/70">
                      {income.notes}
                    </p>
                  )}
                  {income.source && (
                    <p className="mt-2 text-xs text-textDark/60 dark:text-textPrimary/60">
                      Source: {income.source}
                    </p>
                  )}
                  <footer className="mt-4 flex gap-2">
                    <button
                      type="button"
                      className="rounded-full bg-emerald-500/20 px-4 py-1 text-sm font-medium text-emerald-600 transition hover:bg-emerald-500/30 dark:text-emerald-300"
                      onClick={() => onEditIncome(income)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="rounded-full bg-danger/20 px-4 py-1 text-sm font-medium text-danger transition hover:bg-danger/30"
                      onClick={() => onDeleteIncome(income.id)}
                    >
                      Delete
                    </button>
                  </footer>
                </article>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
