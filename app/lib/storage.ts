import type { Bill } from './types';

const STORAGE_KEY = 'bill-tracker-bills';
const SEED_FLAG_KEY = 'bill-tracker-seeded';

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
  },
];

export function loadBills(): Bill[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
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
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bills));
  } catch (error) {
    console.error('Failed to save bills', error);
  }
}

export function seedDemoDataOnce(): Bill[] {
  if (typeof window === 'undefined') {
    return demoBills;
  }

  try {
    const seeded = window.localStorage.getItem(SEED_FLAG_KEY);
    if (!seeded) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(demoBills));
      window.localStorage.setItem(SEED_FLAG_KEY, 'true');
      return demoBills;
    }
    return loadBills();
  } catch (error) {
    console.error('Failed to seed demo data', error);
    return demoBills;
  }
}

export function exportBillsToJSON(bills: Bill[]): string {
  return JSON.stringify(bills, null, 2);
}

export function importBillsFromJSON(json: string): Bill[] {
  const parsed = JSON.parse(json);
  if (!Array.isArray(parsed)) {
    throw new Error('Invalid JSON payload');
  }

  return parsed.map((item) => {
    if (
      typeof item !== 'object' ||
      item === null ||
      typeof item.id !== 'string' ||
      typeof item.name !== 'string' ||
      typeof item.amount !== 'number' ||
      !item.currency ||
      typeof item.firstDueDate !== 'string' ||
      !item.recurrence ||
      typeof item.recurrence.type !== 'string'
    ) {
      throw new Error('Invalid bill entry in JSON payload');
    }

    const normalized: Bill = {
      id: item.id,
      name: item.name,
      amount: item.amount,
      currency: item.currency,
      firstDueDate: item.firstDueDate,
      recurrence: {
        type: item.recurrence.type,
        intervalDays: item.recurrence.intervalDays,
      },
      notes: item.notes ?? undefined,
      active: item.active ?? true,
    };

    return normalized;
  });
}
