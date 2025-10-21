'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { MonthGrid } from './components/MonthGrid';
import { DayDrawer } from './components/DayDrawer';
import { BillFormModal } from './components/BillFormModal';
import { TotalsBar } from './components/TotalsBar';
import { IconButton } from './components/IconButton';
import type { Bill, Currency } from './lib/types';
import {
  addDays,
  getOccurrencesInMonth,
  getOccurrencesInRange,
  isOverdue,
} from './lib/recurrence';
import {
  exportBillsToJSON,
  importBillsFromJSON,
  loadBills,
  saveBills,
  seedDemoDataOnce,
} from './lib/storage';

function toKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseKey(key: string): Date | null {
  const [year, month, day] = key.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function accumulateTotals(
  totals: Partial<Record<Currency, number>>,
  currency: Currency,
  amount: number,
  occurrences: number,
) {
  totals[currency] = Number(((totals[currency] ?? 0) + occurrences * amount).toFixed(2));
}

const todayDate = new Date();
const todayKey = toKey(todayDate);

export default function HomePage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [displayMonth, setDisplayMonth] = useState<Date>(
    () => new Date(todayDate.getFullYear(), todayDate.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(todayKey);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<Bill[] | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const existing = loadBills();
    if (existing.length) {
      setBills(existing);
    } else {
      setBills(seedDemoDataOnce());
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') return;
    saveBills(bills);
  }, [bills, hydrated]);

  const occurrencesByDate = useMemo(() => {
    const map: Record<string, Bill[]> = {};
    bills.forEach((bill: Bill) => {
      const dates = getOccurrencesInMonth(bill, displayMonth);
      dates.forEach((dateKey) => {
        if (!map[dateKey]) {
          map[dateKey] = [];
        }
        map[dateKey].push(bill);
      });
    });
    return map;
  }, [bills, displayMonth]);

  const countsByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    (Object.entries(occurrencesByDate) as [string, Bill[]][]).forEach(([key, arr]) => {
      counts[key] = arr.length;
    });
    return counts;
  }, [occurrencesByDate]);

  const overdueDates = useMemo(() => {
    const set = new Set<string>();
    Object.keys(occurrencesByDate).forEach((key) => {
      if (isOverdue(key)) {
        set.add(key);
      }
    });
    return set;
  }, [occurrencesByDate]);

  const selectedBills = useMemo(() => {
    if (!selectedDate) return [];
    const target = parseKey(selectedDate);
    if (!target) return [];
    return bills.filter(
      (bill: Bill) => getOccurrencesInRange(bill, target, target).length > 0,
    );
  }, [bills, selectedDate]);

  const monthlyTotals = useMemo(() => {
    const totals: Partial<Record<Currency, number>> = {};
    bills.forEach((bill: Bill) => {
      const occurrences = getOccurrencesInMonth(bill, displayMonth);
      if (occurrences.length === 0) return;
      accumulateTotals(totals, bill.currency, bill.amount, occurrences.length);
    });
    return totals;
  }, [bills, displayMonth]);

  const next7Totals = useMemo(() => {
    const totals: Partial<Record<Currency, number>> = {};
    const start = new Date();
    const end = addDays(start, 6);
    bills.forEach((bill: Bill) => {
      const occurrences = getOccurrencesInRange(bill, start, end);
      if (occurrences.length === 0) return;
      accumulateTotals(totals, bill.currency, bill.amount, occurrences.length);
    });
    return totals;
  }, [bills]);

  const next30Totals = useMemo(() => {
    const totals: Partial<Record<Currency, number>> = {};
    const start = new Date();
    const end = addDays(start, 29);
    bills.forEach((bill: Bill) => {
      const occurrences = getOccurrencesInRange(bill, start, end);
      if (occurrences.length === 0) return;
      accumulateTotals(totals, bill.currency, bill.amount, occurrences.length);
    });
    return totals;
  }, [bills]);

  function handleSelectDay(dateKey: string) {
    setSelectedDate(dateKey);
    const parsed = parseKey(dateKey);
    if (parsed) {
      setDisplayMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
    }
    setDrawerOpen(true);
  }

  function handleChangeMonth(offset: number) {
    setDisplayMonth(
      (current: Date) => new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  }

  function handleSaveBill(bill: Bill) {
    setBills((current: Bill[]) => {
      const index = current.findIndex((item: Bill) => item.id === bill.id);
      if (index >= 0) {
        const clone = [...current];
        clone[index] = bill;
        return clone;
      }
      return [...current, bill];
    });
    setFormOpen(false);
    setEditingBill(null);
  }

  function handleDeleteBill(id: string) {
    setBills((current: Bill[]) => current.filter((bill: Bill) => bill.id !== id));
  }

  function handleExport() {
    const data = exportBillsToJSON(bills);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'bill-tracker-export.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported = importBillsFromJSON(text);
      setPendingImport(imported);
      setImportConfirmOpen(true);
      setImportError(null);
    } catch (error) {
      console.error('Failed to import bills', error);
      setImportError('Invalid JSON file. Please export from this app and retry.');
    } finally {
      event.target.value = '';
    }
  }

  function confirmImport() {
    if (pendingImport) {
      setBills(pendingImport);
    }
    setPendingImport(null);
    setImportConfirmOpen(false);
  }

  function cancelImport() {
    setPendingImport(null);
    setImportConfirmOpen(false);
  }

  if (!hydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-textPrimary/70">Loading your bills…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col justify-between gap-4 rounded-3xl bg-surface p-6 shadow-glow sm:flex-row sm:items-center">
        <div>
          <p className="text-sm uppercase tracking-wide text-textPrimary/60">
            Subscription & Bill Organizer
          </p>
          <h1 className="text-3xl font-semibold text-textPrimary">Bill Tracker</h1>
          <p className="mt-2 max-w-2xl text-sm text-textPrimary/60">
            Stay on top of every recurring cost with a clean calendar, detailed drawer,
            and quick import/export controls.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              setEditingBill(null);
              setFormOpen(true);
            }}
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-background transition hover:bg-accent/90"
          >
            + Add bill
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="rounded-full border border-accent/50 px-5 py-2 text-sm font-semibold text-accent transition hover:border-accent"
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-full border border-muted px-5 py-2 text-sm font-semibold text-textPrimary transition hover:border-textPrimary"
          >
            Import JSON
          </button>
        </div>
      </header>

      <TotalsBar
        monthlyTotals={monthlyTotals}
        next7Totals={next7Totals}
        next30Totals={next30Totals}
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <MonthGrid
          monthDate={displayMonth}
          occurrences={countsByDate}
          overdueDates={overdueDates}
          selectedDate={selectedDate}
          todayKey={todayKey}
          onSelectDay={handleSelectDay}
          onChangeMonth={handleChangeMonth}
        />

        <section className="space-y-6">
          <article className="rounded-3xl bg-surface p-6 shadow-glow">
            <h2 className="text-lg font-semibold text-textPrimary">Today</h2>
            <p className="mt-1 text-sm text-textPrimary/60">{todayKey}</p>
            <div className="mt-4 space-y-3 text-sm text-textPrimary/70">
              {bills
                .map((bill: Bill) => ({
                  bill,
                  due: getOccurrencesInRange(bill, todayDate, todayDate)[0],
                }))
                .filter((entry) => entry.due)
                .map(({ bill }) => (
                  <div key={bill.id} className="flex items-center justify-between">
                    <span>{bill.name}</span>
                    <span className="text-accent">
                      {bill.currency} {bill.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              {bills.every(
                (bill) => !getOccurrencesInRange(bill, todayDate, todayDate).length,
              ) && <p>No bills due today.</p>}
            </div>
          </article>

          {importError && (
            <p className="rounded-3xl bg-danger/10 p-4 text-sm text-danger">
              {importError}
            </p>
          )}

          <article className="rounded-3xl bg-surface p-6 shadow-glow">
            <h2 className="text-lg font-semibold text-textPrimary">Quick navigation</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <IconButton
                variant="solid"
                onClick={() => {
                  setDisplayMonth(
                    new Date(todayDate.getFullYear(), todayDate.getMonth(), 1),
                  );
                  setSelectedDate(todayKey);
                }}
              >
                Today
              </IconButton>
              <IconButton variant="solid" onClick={() => handleChangeMonth(-1)}>
                Prev
              </IconButton>
              <IconButton variant="solid" onClick={() => handleChangeMonth(1)}>
                Next
              </IconButton>
            </div>
          </article>
        </section>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleImport}
      />

      <DayDrawer
        open={drawerOpen}
        date={selectedDate}
        bills={selectedBills}
        onClose={() => setDrawerOpen(false)}
        onEdit={(bill) => {
          setEditingBill(bill);
          setFormOpen(true);
        }}
        onDelete={handleDeleteBill}
      />

      <BillFormModal
        open={formOpen}
        defaultDate={selectedDate}
        initialBill={editingBill}
        onClose={() => {
          setFormOpen(false);
          setEditingBill(null);
        }}
        onSave={handleSaveBill}
      />

      {importConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-3xl bg-surface p-6 shadow-2xl">
            <h2 className="text-xl font-semibold text-textPrimary">Replace all bills?</h2>
            <p className="mt-3 text-sm text-textPrimary/70">
              Importing will overwrite your current list with {pendingImport?.length ?? 0}{' '}
              bills from the selected file.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={cancelImport}
                className="rounded-full border border-muted px-5 py-2 text-sm font-medium text-textPrimary/80 transition hover:border-textPrimary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmImport}
                className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-background transition hover:bg-accent/90"
              >
                Replace data
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
