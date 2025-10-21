'use client';

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { BillFormModal } from './components/BillFormModal';
import { DayDrawer } from './components/DayDrawer';
import { IconButton } from './components/IconButton';
import { MonthGrid } from './components/MonthGrid';
import { RecurringOverview, type FrequencyTotal } from './components/RecurringOverview';
import { SearchBar } from './components/SearchBar';
import { SummaryChart } from './components/SummaryChart';
import { ThemeToggle } from './components/ThemeToggle';
import { TotalsBar } from './components/TotalsBar';
import { formatCurrency } from './lib/currency';
import {
  addDays,
  getOccurrencesInMonth,
  getOccurrencesInRange,
  isOverdue,
} from './lib/recurrence';
import {
  exportBillsToJSON,
  importBillsFromJSON,
  saveBills,
  seedDemoDataOnce,
} from './lib/storage';
import type { Bill, Currency } from './lib/types';

const daySummaryFormatter = new Intl.DateTimeFormat('en-CA', {
  weekday: 'short',
  month: 'long',
  day: 'numeric',
});

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function startOfMonth(date: Date): Date {
  return startOfDay(new Date(date.getFullYear(), date.getMonth(), 1));
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseKey(key: string | null): Date | null {
  if (!key) {
    return null;
  }
  const [rawYear, rawMonth, rawDay] = key.split('-').map(Number);
  if (!rawYear || !rawMonth || !rawDay) {
    return null;
  }
  return startOfDay(new Date(rawYear, rawMonth - 1, rawDay));
}

function accumulateTotals(
  totals: Partial<Record<Currency, number>>,
  currency: Currency,
  amount: number,
  occurrences: number,
) {
  const current = totals[currency] ?? 0;
  totals[currency] = Number((current + amount * occurrences).toFixed(2));
}

export default function HomePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const todayDate = useMemo(() => startOfDay(new Date()), []);
  const todayKey = useMemo(() => toDateKey(todayDate), [todayDate]);

  const [bills, setBills] = useState<Bill[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [displayMonth, setDisplayMonth] = useState<Date>(() => startOfMonth(todayDate));
  const [selectedDate, setSelectedDate] = useState<string | null>(todayKey);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<Bill[] | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    const initial = seedDemoDataOnce();
    setBills(initial);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    saveBills(bills);
  }, [bills, hydrated]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    bills.forEach((bill) => {
      if (bill.category) {
        set.add(bill.category);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [bills]);

  const dateFilterInstance = useMemo(() => parseKey(dateFilter), [dateFilter]);

  useEffect(() => {
    if (!dateFilterInstance) {
      return;
    }
    setDisplayMonth(startOfMonth(dateFilterInstance));
    setSelectedDate(toDateKey(dateFilterInstance));
  }, [dateFilterInstance]);

  useEffect(() => {
    if (selectedCategory === 'ALL') {
      return;
    }
    if (!categories.includes(selectedCategory)) {
      setSelectedCategory('ALL');
    }
  }, [categories, selectedCategory]);

  const activeBills = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return bills.filter((bill) => {
      if (!bill.active) {
        return false;
      }
      if (selectedCategory !== 'ALL' && (bill.category ?? '') !== selectedCategory) {
        return false;
      }
      if (query) {
        const haystack = `${bill.name} ${bill.notes ?? ''}`.toLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }
      if (dateFilterInstance) {
        const matchesDay =
          getOccurrencesInRange(bill, dateFilterInstance, dateFilterInstance).length > 0;
        if (!matchesDay) {
          return false;
        }
      }
      return true;
    });
  }, [bills, selectedCategory, searchQuery, dateFilterInstance]);

  const occurrencesByDate = useMemo(() => {
    const map: Record<string, Bill[]> = {};
    activeBills.forEach((bill) => {
      const occurrenceKeys = dateFilterInstance
        ? getOccurrencesInRange(bill, dateFilterInstance, dateFilterInstance)
        : getOccurrencesInMonth(bill, displayMonth);
      occurrenceKeys.forEach((dateKey) => {
        if (!map[dateKey]) {
          map[dateKey] = [];
        }
        map[dateKey].push(bill);
      });
    });
    return map;
  }, [activeBills, displayMonth, dateFilterInstance]);

  const countsByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.entries(occurrencesByDate).forEach(([dateKey, dayBills]) => {
      counts[dateKey] = dayBills.length;
    });
    return counts;
  }, [occurrencesByDate]);

  const daySummaries = useMemo(() => {
    return (Object.entries(occurrencesByDate) as [string, Bill[]][])
      .map(([dateKey, dayBills]) => {
        const parsed = parseKey(dateKey);
        if (!parsed) {
          return null;
        }
        return {
          dateKey,
          date: parsed,
          label: daySummaryFormatter.format(parsed),
          billsForDay: dayBills,
        };
      })
      .filter((entry): entry is { dateKey: string; date: Date; label: string; billsForDay: Bill[] } =>
        entry !== null,
      )
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [occurrencesByDate]);

  const chartPoints = useMemo(() => {
    const daysInMonth = new Date(
      displayMonth.getFullYear(),
      displayMonth.getMonth() + 1,
      0,
    ).getDate();
    const weeksInMonth = Math.ceil(daysInMonth / 7);
    const totals = Array.from({ length: weeksInMonth }, () => 0);

    activeBills.forEach((bill) => {
      const occurrences = getOccurrencesInMonth(bill, displayMonth);
      occurrences.forEach((dateKey) => {
        const date = parseKey(dateKey);
        if (!date) {
          return;
        }
        const weekIndex = Math.min(
          weeksInMonth - 1,
          Math.floor((date.getDate() - 1) / 7),
        );
        totals[weekIndex] += bill.amount;
      });
    });

    return totals.map((total, index) => ({
      label: `W${index + 1}`,
      amount: Number(total.toFixed(2)),
    }));
  }, [activeBills, displayMonth]);

  const recurringOverviewItems = useMemo<FrequencyTotal[]>(() => {
    const map = new Map<string, Partial<Record<Currency, number>>>();

    activeBills.forEach((bill) => {
      const occurrenceKeys = getOccurrencesInMonth(bill, displayMonth);
      if (!occurrenceKeys.length) {
        return;
      }

      const currentTotals = map.get(bill.recurrence.type) ?? {};
      const existing = currentTotals[bill.currency] ?? 0;
      currentTotals[bill.currency] = Number(
        (existing + bill.amount * occurrenceKeys.length).toFixed(2),
      );
      map.set(bill.recurrence.type, currentTotals);
    });

    return Array.from(map.entries()).map(([frequency, totals]) => ({
      frequency,
      totals,
    }));
  }, [activeBills, displayMonth]);

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
    if (!selectedDate) {
      return [];
    }
    const target = parseKey(selectedDate);
    if (!target) {
      return [];
    }
    return activeBills.filter(
      (bill: Bill) => getOccurrencesInRange(bill, target, target).length > 0,
    );
  }, [activeBills, selectedDate]);

  const monthlyTotals = useMemo(() => {
    const totals: Partial<Record<Currency, number>> = {};
    activeBills.forEach((bill: Bill) => {
      const occurrences = getOccurrencesInMonth(bill, displayMonth);
      if (occurrences.length === 0) {
        return;
      }
      accumulateTotals(totals, bill.currency, bill.amount, occurrences.length);
    });
    return totals;
  }, [activeBills, displayMonth]);

  const next7Totals = useMemo(() => {
    const totals: Partial<Record<Currency, number>> = {};
    const start = startOfDay(new Date());
    const end = addDays(start, 6);
    activeBills.forEach((bill: Bill) => {
      const occurrences = getOccurrencesInRange(bill, start, end);
      if (occurrences.length === 0) {
        return;
      }
      accumulateTotals(totals, bill.currency, bill.amount, occurrences.length);
    });
    return totals;
  }, [activeBills]);

  const next30Totals = useMemo(() => {
    const totals: Partial<Record<Currency, number>> = {};
    const start = startOfDay(new Date());
    const end = addDays(start, 29);
    activeBills.forEach((bill: Bill) => {
      const occurrences = getOccurrencesInRange(bill, start, end);
      if (occurrences.length === 0) {
        return;
      }
      accumulateTotals(totals, bill.currency, bill.amount, occurrences.length);
    });
    return totals;
  }, [activeBills]);

  function handleSelectDay(dateKey: string) {
    setSelectedDate(dateKey);
    const parsed = parseKey(dateKey);
    if (parsed) {
      setDisplayMonth(startOfMonth(parsed));
    }
    setDrawerOpen(true);
  }

  function handleChangeMonth(offset: number) {
    setDisplayMonth((current: Date) => {
      const next = new Date(current.getFullYear(), current.getMonth() + offset, 1);
      return startOfMonth(next);
    });
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
    if (!file) {
      return;
    }
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
      <main className="flex min-h-screen items-center justify-center bg-backgroundLight text-textDark dark:bg-background dark:text-textPrimary">
        <p className="text-textDark/60 dark:text-textPrimary/70">Loading your bills…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-6 rounded-3xl bg-surfaceLight p-6 shadow-glow dark:bg-surface">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-textDark/60 dark:text-textPrimary/60">
              Subscription & Bill Organizer
            </p>
            <h1 className="text-3xl font-semibold text-textDark dark:text-textPrimary">
              Bill Tracker
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-textDark/60 dark:text-textPrimary/60">
              Stay on top of every recurring cost with a clean calendar, detailed drawer, and quick import/export controls.
            </p>
          </div>
          <ThemeToggle />
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
            className="rounded-full border border-mutedLight px-5 py-2 text-sm font-semibold text-textDark transition hover:border-textDark dark:border-muted dark:text-textPrimary dark:hover:border-textPrimary"
          >
            Import JSON
          </button>
        </div>
      </header>

      <SearchBar
        query={searchQuery}
        onQueryChange={setSearchQuery}
        category={selectedCategory}
        onCategoryChange={setSelectedCategory}
        categories={categories}
        date={dateFilter}
        onDateChange={setDateFilter}
        onReset={() => {
          setSearchQuery('');
          setSelectedCategory('ALL');
          setDateFilter('');
        }}
      />

      <TotalsBar
        monthlyTotals={monthlyTotals}
        next7Totals={next7Totals}
        next30Totals={next30Totals}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <SummaryChart points={chartPoints} />
        <RecurringOverview items={recurringOverviewItems} />
      </div>

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
          <article className="rounded-3xl bg-surfaceLight p-6 shadow-glow dark:bg-surface">
            <h2 className="text-lg font-semibold text-textDark dark:text-textPrimary">Today</h2>
            <p className="mt-1 text-sm text-textDark/60 dark:text-textPrimary/60">{todayKey}</p>
            <div className="mt-4 space-y-3 text-sm text-textDark/70 dark:text-textPrimary/70">
              {activeBills
                .map((bill: Bill) => ({
                  bill,
                  due: getOccurrencesInRange(bill, todayDate, todayDate)[0],
                }))
                .filter((entry) => entry.due)
                .map(({ bill }) => (
                  <div key={bill.id} className="flex items-center justify-between">
                    <span>{bill.name}</span>
                    <span className="text-accent">
                      {formatCurrency(bill.amount, bill.currency)}
                    </span>
                  </div>
                ))}
              {activeBills.every(
                (bill) => !getOccurrencesInRange(bill, todayDate, todayDate).length,
              ) && (
                <p className="text-textDark/60 dark:text-textPrimary/60">No bills due today.</p>
              )}
            </div>
          </article>

          {importError && (
            <div className="rounded-3xl bg-danger/10 p-4 text-sm text-danger shadow-glow">
              {importError}
            </div>
          )}

          <article className="rounded-3xl bg-surfaceLight p-6 shadow-glow dark:bg-surface">
            <h2 className="text-lg font-semibold text-textDark dark:text-textPrimary">
              Quick navigation
            </h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <IconButton
                variant="solid"
                onClick={() => {
                  setDisplayMonth(startOfMonth(todayDate));
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

      <section className="rounded-3xl bg-surfaceLight p-6 shadow-glow dark:bg-surface">
        <h2 className="text-lg font-semibold text-textDark dark:text-textPrimary">
          This month at a glance
        </h2>
        {daySummaries.length === 0 ? (
          <p className="mt-3 text-sm text-textDark/60 dark:text-textPrimary/60">
            No bills are scheduled for this month.
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {daySummaries.map(({ dateKey, label, billsForDay }) => (
              <li key={dateKey}>
                <p className="text-sm font-semibold uppercase tracking-wide text-textDark/70 dark:text-textPrimary/70">
                  {label}
                </p>
                <ul className="mt-2 space-y-1">
                  {billsForDay.map((bill) => (
                    <li
                      key={`${dateKey}-${bill.id}`}
                      className="flex items-center gap-2 text-sm text-textDark/80 dark:text-textPrimary/80"
                    >
                      <span className="text-accent">–</span>
                      <span className="flex-1">{bill.name}</span>
                      <span className="text-textDark/60 dark:text-textPrimary/60">
                        {formatCurrency(bill.amount, bill.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>

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
          <div className="w-full max-w-md rounded-3xl bg-surfaceLight p-6 shadow-2xl dark:bg-surface">
            <h2 className="text-xl font-semibold text-textDark dark:text-textPrimary">
              Replace all bills?
            </h2>
            <p className="mt-3 text-sm text-textDark/70 dark:text-textPrimary/70">
              Importing will overwrite your current list with {pendingImport?.length ?? 0}{' '}
              bills from the selected file.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={cancelImport}
                className="rounded-full border border-mutedLight px-5 py-2 text-sm font-medium text-textDark/80 transition hover:border-textDark dark:border-muted dark:text-textPrimary/80 dark:hover:border-textPrimary"
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
