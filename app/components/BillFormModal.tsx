'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import clsx from 'clsx';
import { currencyOptions } from '../lib/currency';
import type { Bill, Currency, RecurrenceType } from '../lib/types';

interface BillFormModalProps {
  open: boolean;
  defaultDate: string | null;
  initialBill?: Bill | null;
  onClose: () => void;
  onSave: (bill: Bill) => void;
}

const recurrenceChoices: { value: RecurrenceType; label: string }[] = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'EVERY_30_DAYS', label: 'Every 30 days' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'ANNUALLY', label: 'Annually' },
  { value: 'CUSTOM_DAYS', label: 'Custom N days' },
];

function todayKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function BillFormModal({
  open,
  defaultDate,
  initialBill,
  onClose,
  onSave,
}: BillFormModalProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('0');
  const [currency, setCurrency] = useState<Currency>('CAD');
  const [firstDueDate, setFirstDueDate] = useState<string>(todayKey());
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('MONTHLY');
  const [intervalDays, setIntervalDays] = useState<string>('30');
  const [notes, setNotes] = useState('');
  const [active, setActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const bill = initialBill ?? null;
      setName(bill?.name ?? '');
      setAmount(bill ? bill.amount.toString() : '0');
      setCurrency(bill?.currency ?? 'CAD');
      setFirstDueDate(bill?.firstDueDate ?? defaultDate ?? todayKey());
      setRecurrenceType(bill?.recurrence.type ?? 'MONTHLY');
      setIntervalDays((bill?.recurrence.intervalDays ?? 30).toString());
      setNotes(bill?.notes ?? '');
      setActive(bill?.active ?? true);
      setError(null);
    }
  }, [open, initialBill, defaultDate]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape' && open) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const title = useMemo(() => (initialBill ? 'Edit bill' : 'Add bill'), [initialBill]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(amount);
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      setError('Amount must be greater than zero');
      return;
    }
    if (!firstDueDate) {
      setError('First due date is required');
      return;
    }
    if (recurrenceType === 'CUSTOM_DAYS') {
      const parsedInterval = Number(intervalDays);
      if (!Number.isFinite(parsedInterval) || parsedInterval < 1) {
        setError('Custom interval must be at least 1 day');
        return;
      }
    }

    const bill: Bill = {
      id: initialBill?.id ?? crypto.randomUUID(),
      name: name.trim(),
      amount: Number(value.toFixed(2)),
      currency,
      firstDueDate,
      recurrence:
        recurrenceType === 'CUSTOM_DAYS'
          ? { type: recurrenceType, intervalDays: Number(intervalDays) }
          : { type: recurrenceType },
      notes: notes.trim() || undefined,
      active,
    };

    onSave(bill);
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
          'relative z-10 w-full max-w-xl rounded-3xl bg-surface p-6 shadow-2xl transition-transform',
          open ? 'translate-y-0' : 'translate-y-6 opacity-0',
        )}
        onSubmit={handleSubmit}
      >
        <header className="mb-6">
          <h2 className="text-2xl font-semibold text-textPrimary">{title}</h2>
          <p className="text-sm text-textPrimary/60">
            Keep your recurring costs organized.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm">
            <span className="text-textPrimary/70">Name</span>
            <input
              required
              value={name}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setName(event.target.value)
              }
              className="rounded-2xl border border-muted bg-muted/40 px-4 py-3 text-base text-textPrimary placeholder:text-textPrimary/40 focus:border-accent"
              placeholder="Streaming service"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="text-textPrimary/70">Amount</span>
            <input
              required
              inputMode="decimal"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setAmount(event.target.value)
              }
              className="rounded-2xl border border-muted bg-muted/40 px-4 py-3 text-base text-textPrimary focus:border-accent"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="text-textPrimary/70">Currency</span>
            <select
              value={currency}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                setCurrency(event.target.value as Currency)
              }
              className="rounded-2xl border border-muted bg-muted/40 px-4 py-3 text-base text-textPrimary focus:border-accent"
            >
              {currencyOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="text-textPrimary/70">First due date</span>
            <input
              required
              type="date"
              value={firstDueDate}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setFirstDueDate(event.target.value)
              }
              className="rounded-2xl border border-muted bg-muted/40 px-4 py-3 text-base text-textPrimary focus:border-accent"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm sm:col-span-2">
            <span className="text-textPrimary/70">Recurrence</span>
            <select
              value={recurrenceType}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                setRecurrenceType(event.target.value as RecurrenceType)
              }
              className="rounded-2xl border border-muted bg-muted/40 px-4 py-3 text-base text-textPrimary focus:border-accent"
            >
              {recurrenceChoices.map((choice) => (
                <option key={choice.value} value={choice.value}>
                  {choice.label}
                </option>
              ))}
            </select>
          </label>

          {recurrenceType === 'CUSTOM_DAYS' && (
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-textPrimary/70">Interval (days)</span>
              <input
                required
                type="number"
                min="1"
                value={intervalDays}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setIntervalDays(event.target.value)
                }
                className="rounded-2xl border border-muted bg-muted/40 px-4 py-3 text-base text-textPrimary focus:border-accent"
              />
            </label>
          )}

          <label className="sm:col-span-2 flex flex-col gap-2 text-sm">
            <span className="text-textPrimary/70">Notes</span>
            <textarea
              value={notes}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                setNotes(event.target.value)
              }
              className="min-h-[96px] rounded-2xl border border-muted bg-muted/40 px-4 py-3 text-base text-textPrimary placeholder:text-textPrimary/40 focus:border-accent"
              placeholder="Optional details"
            />
          </label>

          <label className="flex items-center gap-3 text-sm text-textPrimary/80">
            <input
              type="checkbox"
              checked={active}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                setActive(event.target.checked)
              }
              className="h-5 w-5 rounded border border-muted bg-muted/40 text-accent focus:border-accent"
            />
            Active
          </label>
        </div>

        {error && <p className="mt-4 text-sm text-danger">{error}</p>}

        <footer className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-muted px-5 py-2 text-sm font-medium text-textPrimary/80 transition hover:border-textPrimary"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-background transition hover:bg-accent/90"
          >
            Save bill
          </button>
        </footer>
      </form>
    </div>
  );
}
