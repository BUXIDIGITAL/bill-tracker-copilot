import type {
  Bill,
  Currency,
  Income,
  IncomeRecurrenceType,
  RecurrenceType,
} from './types';

const BILL_STORAGE_KEY = 'bill-tracker-bills';
const BILL_SEED_FLAG_KEY = 'bill-tracker-seeded';
const INCOME_STORAGE_KEY = 'bill-tracker-incomes';
const INCOME_SEED_FLAG_KEY = 'bill-tracker-income-seeded';

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const today = new Date();
const year = today.getFullYear();
const month = today.getMonth();

const demoBills: Bill[] = [
  {
    id: 'netflix',
    name: 'Netflix',
    amount: 18.99,
    currency: 'CAD',
    firstDueDate: formatLocalDate(new Date(year, month, today.getDate())),
    recurrence: { type: 'MONTHLY' },
    notes: 'Premium plan',
    active: true,
    category: 'Entertainment',
  },
  {
    id: 'hydro',
    name: 'Hydro One',
    amount: 120,
    currency: 'CAD',
    firstDueDate: formatLocalDate(new Date(year, month, 5)),
    recurrence: { type: 'MONTHLY' },
    notes: 'Utility bill',
    active: true,
    category: 'Utilities',
  },
  {
    id: 'internet',
    name: 'Fiber Internet',
    amount: 89.99,
    currency: 'CAD',
    firstDueDate: formatLocalDate(new Date(year, month, 10)),
    recurrence: { type: 'MONTHLY' },
    notes: '1 Gbps plan',
    active: true,
    category: 'Utilities',
  },
  {
    id: 'insurance',
    name: 'Auto Insurance',
    amount: 148.45,
    currency: 'CAD',
    firstDueDate: formatLocalDate(new Date(year, month, 20)),
    recurrence: { type: 'MONTHLY' },
    notes: '',
    active: true,
    category: 'Insurance',
  },
];

const demoIncomes: Income[] = [
  {
    id: 'payday',
    name: 'Payday',
    amount: 2850,
    currency: 'CAD',
    date: formatLocalDate(new Date(year, month, 1)),
    recurrence: 'BIWEEKLY',
    category: 'Salary',
    notes: 'Bi-weekly pay',
    source: 'Employer',
  },
  {
    id: 'freelance-design',
    name: 'Freelance design',
    amount: 450,
    currency: 'CAD',
    date: formatLocalDate(new Date(year, month, 12)),
    recurrence: 'ONE_TIME',
    category: 'Side projects',
    notes: 'Landing page revision',
    source: 'Freelance',
  },
];

export function loadBills(): Bill[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
  const stored = window.localStorage.getItem(BILL_STORAGE_KEY);
    if (!stored) {
      return [];
    }
    const parsed = JSON.parse(stored) as Bill[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to load bills from storage', error);
    return [];
  }
}

export function saveBills(bills: Bill[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(BILL_STORAGE_KEY, JSON.stringify(bills));
  } catch (error) {
    console.error('Failed to save bills', error);
  }
}

export function seedDemoDataOnce(): Bill[] {
  if (typeof window === 'undefined') {
    return demoBills;
  }

  try {
    const seeded = window.localStorage.getItem(BILL_SEED_FLAG_KEY);
    if (!seeded) {
      window.localStorage.setItem(BILL_STORAGE_KEY, JSON.stringify(demoBills));
      window.localStorage.setItem(BILL_SEED_FLAG_KEY, 'true');
      return demoBills;
    }
    return loadBills();
  } catch (error) {
    console.error('Failed to seed demo data', error);
    return demoBills;
  }
}

export function loadIncomes(): Income[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(INCOME_STORAGE_KEY);
    if (!stored) {
      return [];
    }
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((item) => {
        try {
          return normalizeIncome(item);
        } catch (error) {
          console.warn('Skipping invalid income entry from storage', error);
          return null;
        }
      })
      .filter((income): income is Income => income !== null);
  } catch (error) {
    console.error('Failed to load incomes from storage', error);
    return [];
  }
}

export function saveIncomes(incomes: Income[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(INCOME_STORAGE_KEY, JSON.stringify(incomes));
  } catch (error) {
    console.error('Failed to save incomes', error);
  }
}

export function seedIncomeDemoDataOnce(): Income[] {
  if (typeof window === 'undefined') {
    return demoIncomes;
  }

  try {
    const seeded = window.localStorage.getItem(INCOME_SEED_FLAG_KEY);
    if (!seeded) {
      window.localStorage.setItem(INCOME_STORAGE_KEY, JSON.stringify(demoIncomes));
      window.localStorage.setItem(INCOME_SEED_FLAG_KEY, 'true');
      return demoIncomes;
    }
    return loadIncomes();
  } catch (error) {
    console.error('Failed to seed income demo data', error);
    return demoIncomes;
  }
}

export interface PersistedData {
  bills: Bill[];
  incomes: Income[];
}

function normalizeBill(item: unknown): Bill {
  if (typeof item !== 'object' || item === null) {
    throw new Error('Invalid bill entry in JSON payload');
  }

  const record = item as Record<string, unknown>;
  const recurrence = record.recurrence as Record<string, unknown> | undefined;

  if (
    typeof record.id !== 'string' ||
    typeof record.name !== 'string' ||
    typeof record.amount !== 'number' ||
    typeof record.currency !== 'string' ||
    typeof record.firstDueDate !== 'string' ||
    !recurrence ||
    typeof recurrence.type !== 'string'
  ) {
    throw new Error('Invalid bill entry in JSON payload');
  }

  return {
    id: record.id,
    name: record.name,
    amount: record.amount,
    currency: record.currency as Currency,
    firstDueDate: record.firstDueDate,
    recurrence: {
      type: recurrence.type as RecurrenceType,
      intervalDays: typeof recurrence.intervalDays === 'number' ? recurrence.intervalDays : undefined,
    },
    notes: typeof record.notes === 'string' ? record.notes : undefined,
    active: typeof record.active === 'boolean' ? record.active : true,
    category: typeof record.category === 'string' ? record.category : undefined,
  };
}

function normalizeIncome(item: unknown): Income {
  if (typeof item !== 'object' || item === null) {
    throw new Error('Invalid income entry in JSON payload');
  }

  const record = item as Record<string, unknown>;
  const recurrenceRaw = typeof record.recurrence === 'string' ? record.recurrence.toUpperCase() : 'ONE_TIME';
  const recurrence: IncomeRecurrenceType = (() => {
    switch (recurrenceRaw) {
      case 'BIWEEKLY':
        return 'BIWEEKLY';
      case 'MONTHLY':
        return 'MONTHLY';
      default:
        return 'ONE_TIME';
    }
  })();

  if (
    typeof record.id !== 'string' ||
    typeof record.name !== 'string' ||
    typeof record.amount !== 'number' ||
    typeof record.currency !== 'string' ||
    typeof record.date !== 'string'
  ) {
    throw new Error('Invalid income entry in JSON payload');
  }

  return {
    id: record.id,
    name: record.name,
    amount: record.amount,
    currency: record.currency as Currency,
    date: record.date,
    recurrence,
    category: typeof record.category === 'string' ? record.category : undefined,
    notes: typeof record.notes === 'string' ? record.notes : undefined,
    source: typeof record.source === 'string' ? record.source : undefined,
  };
}

export function exportAppDataToJSON(data: PersistedData): string {
  return JSON.stringify(data, null, 2);
}

export function importAppDataFromJSON(json: string): PersistedData {
  const parsed = JSON.parse(json);

  if (Array.isArray(parsed)) {
    return {
      bills: parsed.map(normalizeBill),
      incomes: [],
    };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid JSON payload');
  }

  const billsRaw = Array.isArray((parsed as { bills?: unknown }).bills)
    ? (parsed as { bills: unknown[] }).bills
    : [];
  const incomesRaw = Array.isArray((parsed as { incomes?: unknown }).incomes)
    ? (parsed as { incomes: unknown[] }).incomes
    : [];

  return {
    bills: billsRaw.map(normalizeBill),
    incomes: incomesRaw.map(normalizeIncome),
  };
}
