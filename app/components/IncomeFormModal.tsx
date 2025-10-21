'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import clsx from 'clsx';
import { currencyOptions } from '../lib/currency';
import type { Currency, Income, IncomeRecurrenceType } from '../lib/types';

interface IncomeFormModalProps {
  open: boolean;
  initialIncome?: Income | null;
  onClose: () => void;
  onSave: (income: Income) => void;
}

function todayKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function IncomeFormModal({ open, initialIncome, onClose, onSave }: IncomeFormModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('0');
  const [currency, setCurrency] = useState<Currency>('CAD');
  const [date, setDate] = useState<string>(todayKey());
  const [recurrence, setRecurrence] = useState<IncomeRecurrenceType>('ONE_TIME');
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const income = initialIncome ?? null;
      setName(income?.name ?? '');
      setCategory(income?.category ?? '');
      setAmount(income ? income.amount.toString() : '0');
      setCurrency(income?.currency ?? 'CAD');
      setDate(income?.date ?? todayKey());
      setRecurrence(income?.recurrence ?? 'ONE_TIME');
      setSource(income?.source ?? '');
      setNotes(income?.notes ?? '');
      setError(null);
    }
  }, [open, initialIncome]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && open) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const title = useMemo(() => (initialIncome ? 'Edit income' : 'Add income'), [initialIncome]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Amount must be greater than zero');
      return;
    }
    if (!date) {
      setError('Date is required');
      return;
    }

    const income: Income = {
      id: initialIncome?.id ?? crypto.randomUUID(),
      name: name.trim(),
      amount: Number(parsedAmount.toFixed(2)),
      currency,
      date,
      recurrence,
      category: category.trim() || undefined,
      source: source.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    onSave(income);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={clsx(
        'fixed inset-0 z-50 flex items-center justify-center',
        open ? 'pointer-events-auto' : 'pointer-events-none',
      )}
    >
      <div
        className={clsx(
          'absolute inset-0 bg-black/70 transition-opacity',
          open ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      <form
        className={clsx(
          'relative z-10 w-full max-w-xl rounded-3xl bg-surfaceLight p-6 shadow-2xl transition-transform dark:bg-surface',
          open ? 'translate-y-0' : 'translate-y-6 opacity-0',
        )}
        onSubmit={handleSubmit}
      >
        <header className="mb-6">
          <h2 className="text-2xl font-semibold text-textDark dark:text-textPrimary">{title}</h2>
          <p className="text-sm text-textDark/60 dark:text-textPrimary/60">
            Record salary, paydays, and side income in one place.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-textDark/70 dark:text-textPrimary/70">Name</span>
            <input
              required
              value={name}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setName(event.target.value)}
              className="rounded-2xl border border-mutedLight bg-mutedLight/60 px-4 py-3 text-base text-textDark placeholder:text-textDark/40 focus:border-accent dark:border-muted dark:bg-muted/40 dark:text-textPrimary dark:placeholder:text-textPrimary/40"
              placeholder="Payday"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="text-textDark/70 dark:text-textPrimary/70">Category</span>
            <input
              value={category}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setCategory(event.target.value)}
              className="rounded-2xl border border-mutedLight bg-mutedLight/60 px-4 py-3 text-base text-textDark placeholder:text-textDark/40 focus:border-accent dark:border-muted dark:bg-muted/40 dark:text-textPrimary dark:placeholder:text-textPrimary/40"
              placeholder="e.g. Salary"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="text-textDark/70 dark:text-textPrimary/70">Amount</span>
            <input
              required
              inputMode="decimal"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setAmount(event.target.value)}
              className="rounded-2xl border border-mutedLight bg-mutedLight/60 px-4 py-3 text-base text-textDark focus:border-accent dark:border-muted dark:bg-muted/40 dark:text-textPrimary"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="text-textDark/70 dark:text-textPrimary/70">Currency</span>
            <select
              value={currency}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                setCurrency(event.target.value as Currency)
              }
              className="rounded-2xl border border-mutedLight bg-mutedLight/60 px-4 py-3 text-base text-textDark focus:border-accent dark:border-muted dark:bg-muted/40 dark:text-textPrimary"
            >
              {currencyOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="text-textDark/70 dark:text-textPrimary/70">Date</span>
            <input
              required
              type="date"
              value={date}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setDate(event.target.value)}
              className="rounded-2xl border border-mutedLight bg-mutedLight/60 px-4 py-3 text-base text-textDark focus:border-accent dark:border-muted dark:bg-muted/40 dark:text-textPrimary"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="text-textDark/70 dark:text-textPrimary/70">Repeats</span>
            <select
              value={recurrence}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                setRecurrence(event.target.value as IncomeRecurrenceType)
              }
              className="rounded-2xl border border-mutedLight bg-mutedLight/60 px-4 py-3 text-base text-textDark focus:border-accent dark:border-muted dark:bg-muted/40 dark:text-textPrimary"
            >
              <option value="ONE_TIME">One-time</option>
              <option value="BIWEEKLY">Bi-weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="text-textDark/70 dark:text-textPrimary/70">Source</span>
            <input
              value={source}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setSource(event.target.value)}
              className="rounded-2xl border border-mutedLight bg-mutedLight/60 px-4 py-3 text-base text-textDark placeholder:text-textDark/40 focus:border-accent dark:border-muted dark:bg-muted/40 dark:text-textPrimary dark:placeholder:text-textPrimary/40"
              placeholder="Employer or client"
            />
          </label>

          <label className="sm:col-span-2 flex flex-col gap-2 text-sm">
            <span className="text-textDark/70 dark:text-textPrimary/70">Notes</span>
            <textarea
              value={notes}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setNotes(event.target.value)}
              className="min-h-[96px] rounded-2xl border border-mutedLight bg-mutedLight/60 px-4 py-3 text-base text-textDark placeholder:text-textDark/40 focus:border-accent dark:border-muted dark:bg-muted/40 dark:text-textPrimary dark:placeholder:text-textPrimary/40"
              placeholder="Optional details"
            />
          </label>
        </div>

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}

        <footer className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-mutedLight px-5 py-2 text-sm font-medium text-textDark transition hover:border-textDark dark:border-muted dark:text-textPrimary/80 dark:hover:border-textPrimary"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-background transition hover:bg-accent/90"
          >
            Save income
          </button>
        </footer>
      </form>
    </div>
  );
}
