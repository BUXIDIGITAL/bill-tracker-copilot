'use client';

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { BillFormModal } from './components/BillFormModal';
import { DayDrawer } from './components/DayDrawer';
import { IconButton } from './components/IconButton';
import { IncomeFormModal } from './components/IncomeFormModal';
import { IncomeOverview } from './components/IncomeOverview';
import { MonthGrid } from './components/MonthGrid';
import { RecurringOverview, type FrequencyTotal } from './components/RecurringOverview';
import { SearchBar } from './components/SearchBar';
import { SummaryChart } from './components/SummaryChart';
import { ThemeToggle } from './components/ThemeToggle';
import { TotalsBar } from './components/TotalsBar';
import { formatCurrency } from './lib/currency';
import {
  addDays,
  getIncomeOccurrencesInMonth,
  getIncomeOccurrencesInRange,
  getOccurrencesInMonth,
  getOccurrencesInRange,
  isOverdue,
} from './lib/recurrence';
import {
  exportAppDataToJSON,
  importAppDataFromJSON,
  saveBills,
  saveIncomes,
  seedDemoDataOnce,
  seedIncomeDemoDataOnce,
} from './lib/storage';
import type { PersistedData } from './lib/storage';
import type { Bill, Currency, Income } from './lib/types';

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
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [displayMonth, setDisplayMonth] = useState<Date>(() => startOfMonth(todayDate));
  const [selectedDate, setSelectedDate] = useState<string | null>(todayKey);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [incomeFormOpen, setIncomeFormOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [importConfirmOpen, setImportConfirmOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<PersistedData | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    const initialBills = seedDemoDataOnce();
    const initialIncomes = seedIncomeDemoDataOnce();
    setBills(initialBills);
    setIncomes(initialIncomes);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    saveBills(bills);
  }, [bills, hydrated]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    saveIncomes(incomes);
  }, [hydrated, incomes]);

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

  const visibleIncomes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return incomes.filter((income) => {
      if (query) {
        const haystack = `${income.name} ${income.notes ?? ''} ${income.source ?? ''}`.toLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }

      const occurrences = dateFilterInstance
        ? getIncomeOccurrencesInRange(income, dateFilterInstance, dateFilterInstance)
        : getIncomeOccurrencesInMonth(income, displayMonth);

      return occurrences.length > 0;
    });
  }, [dateFilterInstance, displayMonth, incomes, searchQuery]);

  const occurrencesByDate = useMemo(() => {
    const map: Record<string, { bills: Bill[]; incomes: Income[] }> = {};

    const ensureEntry = (dateKey: string) => {
      if (!map[dateKey]) {
        map[dateKey] = { bills: [], incomes: [] };
      }
      return map[dateKey];
    };

    activeBills.forEach((bill) => {
      const occurrenceKeys = dateFilterInstance
        ? getOccurrencesInRange(bill, dateFilterInstance, dateFilterInstance)
        : getOccurrencesInMonth(bill, displayMonth);
      occurrenceKeys.forEach((dateKey) => {
        ensureEntry(dateKey).bills.push(bill);
      });
    });

    visibleIncomes.forEach((income) => {
      const occurrenceKeys = dateFilterInstance
        ? getIncomeOccurrencesInRange(income, dateFilterInstance, dateFilterInstance)
        : getIncomeOccurrencesInMonth(income, displayMonth);
      occurrenceKeys.forEach((dateKey) => {
        ensureEntry(dateKey).incomes.push(income);
      });
    });

    return map;
  }, [activeBills, dateFilterInstance, displayMonth, visibleIncomes]);

  const dayCounts = useMemo(() => {
    const counts: Record<string, { bills: number; incomes: number }> = {};
    Object.entries(occurrencesByDate).forEach(([dateKey, dayItems]) => {
      counts[dateKey] = {
        bills: dayItems.bills.length,
        incomes: dayItems.incomes.length,
      };
    });
    return counts;
  }, [occurrencesByDate]);

  const daySummaries = useMemo(() => {
    return Object.entries(occurrencesByDate)
      .map(([dateKey, dayItems]) => {
        const parsed = parseKey(dateKey);
        if (!parsed) {
          return null;
        }
        return {
          dateKey,
          date: parsed,
          label: daySummaryFormatter.format(parsed),
          billsForDay: dayItems.bills,
          incomesForDay: dayItems.incomes,
        };
      })
      .filter(
        (entry): entry is {
          dateKey: string;
          date: Date;
          label: string;
          billsForDay: Bill[];
          incomesForDay: Income[];
        } => entry !== null,
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

  const incomeCategoryTotals = useMemo(() => {
    const map = new Map<string, Partial<Record<Currency, number>>>();

    visibleIncomes.forEach((income) => {
      const occurrences = getIncomeOccurrencesInMonth(income, displayMonth);
      if (!occurrences.length) {
        return;
      }
      const key = income.category ?? '';
      const currentTotals = map.get(key) ?? {};
      const existing = currentTotals[income.currency] ?? 0;
      currentTotals[income.currency] = Number(
        (existing + income.amount * occurrences.length).toFixed(2),
      );
      map.set(key, currentTotals);
    });

    return Array.from(map.entries())
      .map(([category, totals]) => ({
        category,
        totals,
      }))
      .sort((a, b) => {
        const labelA = a.category || 'Uncategorized';
        const labelB = b.category || 'Uncategorized';
        return labelA.localeCompare(labelB);
      });
  }, [displayMonth, visibleIncomes]);

  const overdueDates = useMemo(() => {
    const set = new Set<string>();
    Object.entries(occurrencesByDate).forEach(([key, dayItems]) => {
      if (dayItems.bills.length > 0 && isOverdue(key)) {
        set.add(key);
      }
    });
    return set;
  }, [occurrencesByDate]);

  const selectedDayItems = useMemo(() => {
    if (!selectedDate) {
      return { bills: [] as Bill[], incomes: [] as Income[] };
    }
    return (
      occurrencesByDate[selectedDate] ?? { bills: [] as Bill[], incomes: [] as Income[] }
    );
  }, [occurrencesByDate, selectedDate]);

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

  const monthlyIncomeTotals = useMemo(() => {
    const totals: Partial<Record<Currency, number>> = {};
    visibleIncomes.forEach((income) => {
      const occurrences = getIncomeOccurrencesInMonth(income, displayMonth);
      if (occurrences.length === 0) {
        return;
      }
      accumulateTotals(totals, income.currency, income.amount, occurrences.length);
    });
    return totals;
  }, [displayMonth, visibleIncomes]);

  const monthlyNetSummaries = useMemo(() => {
    const currencies = new Set<Currency>();
    (Object.keys(monthlyIncomeTotals) as Currency[]).forEach((currency) =>
      currencies.add(currency),
    );
    (Object.keys(monthlyTotals) as Currency[]).forEach((currency) => currencies.add(currency));

    return Array.from(currencies)
      .map((currency) => {
        const income = monthlyIncomeTotals[currency] ?? 0;
        const expenses = monthlyTotals[currency] ?? 0;
        const net = Number((income - expenses).toFixed(2));
        return { currency, income, expenses, net };
      })
      .filter(({ income, expenses, net }) => income !== 0 || expenses !== 0 || net !== 0)
      .sort((a, b) => a.currency.localeCompare(b.currency));
  }, [monthlyIncomeTotals, monthlyTotals]);

  const daySummariesListMargin = monthlyNetSummaries.length > 0 ? 'mt-6' : 'mt-4';

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

  const billsDueToday = useMemo(() => {
    return activeBills.filter(
      (bill: Bill) => getOccurrencesInRange(bill, todayDate, todayDate).length > 0,
    );
  }, [activeBills, todayDate]);

  const incomesToday = useMemo(() => {
    return incomes.filter(
      (income) => getIncomeOccurrencesInRange(income, todayDate, todayDate).length > 0,
    );
  }, [incomes, todayDate]);

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

  function handleSaveIncome(income: Income) {
    setIncomes((current: Income[]) => {
      const index = current.findIndex((item) => item.id === income.id);
      if (index >= 0) {
        const clone = [...current];
        clone[index] = income;
        return clone;
      }
      return [...current, income];
    });
    setIncomeFormOpen(false);
    setEditingIncome(null);
  }

  function handleDeleteIncome(id: string) {
    setIncomes((current: Income[]) => current.filter((income: Income) => income.id !== id));
  }

  function handleExport() {
    const data = exportAppDataToJSON({ bills, incomes });
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
      const imported = importAppDataFromJSON(text);
      setPendingImport(imported);
      setImportConfirmOpen(true);
      setImportError(null);
    } catch (error) {
      console.error('Failed to import data', error);
      setImportError('Invalid JSON file. Please export from this app and retry.');
    } finally {
      event.target.value = '';
    }
  }

  function confirmImport() {
    if (pendingImport) {
      setBills(pendingImport.bills);
      setIncomes(pendingImport.incomes);
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
            onClick={() => {
              setEditingIncome(null);
              setIncomeFormOpen(true);
            }}
            className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-background transition hover:bg-emerald-500/90"
          >
            + Add income
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
        <div className="space-y-6">
          <RecurringOverview items={recurringOverviewItems} />
          <IncomeOverview items={incomeCategoryTotals} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <MonthGrid
          monthDate={displayMonth}
          dayCounts={dayCounts}
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
              {billsDueToday.map((bill) => (
                <div key={bill.id} className="flex items-center justify-between">
                  <span>{bill.name}</span>
                  <span className="text-accent">
                    {formatCurrency(bill.amount, bill.currency)}
                  </span>
                </div>
              ))}
              {incomesToday.map((income) => (
                <div key={income.id} className="flex items-center justify-between">
                  <span>{income.name}</span>
                  <span className="text-emerald-500 dark:text-emerald-400">
                    +{formatCurrency(income.amount, income.currency)}
                  </span>
                </div>
              ))}
              {billsDueToday.length === 0 && incomesToday.length === 0 && (
                <p className="text-textDark/60 dark:text-textPrimary/60">
                  Nothing scheduled today.
                </p>
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
        {monthlyNetSummaries.length > 0 && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {monthlyNetSummaries.map(({ currency, income, expenses, net }) => {
              const netPositive = net > 0;
              const netClass = netPositive
                ? 'text-emerald-500 dark:text-emerald-400'
                : 'text-danger';
              const incomeDisplay = income > 0
                ? `+${formatCurrency(income, currency)}`
                : formatCurrency(income, currency);
              const expensesDisplay = expenses > 0
                ? `-${formatCurrency(expenses, currency)}`
                : formatCurrency(expenses, currency);
              const netDisplay = netPositive
                ? `+${formatCurrency(net, currency)}`
                : formatCurrency(net, currency);
              return (
                <div
                  key={currency}
                  className="rounded-2xl border border-mutedLight/40 bg-backgroundLight/40 p-4 text-sm dark:border-muted/40 dark:bg-background/40"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-textDark/60 dark:text-textPrimary/60">
                    {currency}
                  </p>
                  <div className="mt-3 space-y-2 text-textDark/80 dark:text-textPrimary/80">
                    <div className="flex items-center justify-between">
                      <span>Money earned</span>
                      <span className="font-semibold text-emerald-500 dark:text-emerald-400">
                        {incomeDisplay}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Bills & subscriptions</span>
                      <span className="font-semibold text-textDark/70 dark:text-textPrimary/70">
                        {expensesDisplay}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Money left over</span>
                      <span className={`font-semibold ${netClass}`}>{netDisplay}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {daySummaries.length === 0 ? (
          <p className="mt-3 text-sm text-textDark/60 dark:text-textPrimary/60">
            No bills or income entries are scheduled for this month.
          </p>
        ) : (
          <ul className={`${daySummariesListMargin} space-y-4`}>
            {daySummaries.map(({ dateKey, label, billsForDay, incomesForDay }) => (
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
                  {incomesForDay.map((income) => (
                    <li
                      key={`${dateKey}-${income.id}`}
                      className="flex items-center gap-2 text-sm text-textDark/80 dark:text-textPrimary/80"
                    >
                      <span className="text-emerald-500">+</span>
                      <span className="flex-1">{income.name}</span>
                      <span className="text-emerald-500 dark:text-emerald-400">
                        {formatCurrency(income.amount, income.currency)}
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
        bills={selectedDayItems.bills}
        incomes={selectedDayItems.incomes}
        onClose={() => setDrawerOpen(false)}
        onEdit={(bill) => {
          setEditingBill(bill);
          setFormOpen(true);
        }}
        onDelete={handleDeleteBill}
        onEditIncome={(income) => {
          setEditingIncome(income);
          setIncomeFormOpen(true);
        }}
        onDeleteIncome={handleDeleteIncome}
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

      <IncomeFormModal
        open={incomeFormOpen}
        initialIncome={editingIncome}
        onClose={() => {
          setIncomeFormOpen(false);
          setEditingIncome(null);
        }}
        onSave={handleSaveIncome}
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
              Importing will overwrite your current list with {pendingImport?.bills.length ?? 0}{' '}
              bills and {pendingImport?.incomes.length ?? 0} income entries from the selected file.
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
