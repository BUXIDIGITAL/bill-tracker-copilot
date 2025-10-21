import type { Bill, Income, IncomeRecurrenceType, Recurrence } from './types';

const MS_PER_DAY = 86_400_000;

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function parseISODate(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return startOfDay(new Date(year, (month ?? 1) - 1, day ?? 1));
}

function toISODateString(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, days: number): Date {
  return startOfDay(new Date(date.getTime() + days * MS_PER_DAY));
}

export function addMonthsSafe(date: Date, months: number): Date {
  const year = date.getFullYear();
  const month = date.getMonth();
  const targetMonth = month + months;
  const targetYear = year + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(targetYear, normalizedMonth + 1, 0).getDate();
  const day = Math.min(date.getDate(), lastDayOfTargetMonth);
  return startOfDay(new Date(targetYear, normalizedMonth, day));
}

function getIntervalDays(recurrence: Recurrence): number {
  switch (recurrence.type) {
    case 'WEEKLY':
      return 7;
    case 'EVERY_30_DAYS':
      return 30;
    case 'MONTHLY':
    case 'QUARTERLY':
    case 'ANNUALLY':
      return 0;
    case 'CUSTOM_DAYS':
      return Math.max(1, recurrence.intervalDays ?? 1);
    default:
      return 0;
  }
}

function advanceDate(date: Date, recurrence: Recurrence): Date {
  switch (recurrence.type) {
    case 'WEEKLY':
      return addDays(date, 7);
    case 'EVERY_30_DAYS':
      return addDays(date, 30);
    case 'MONTHLY':
      return addMonthsSafe(date, 1);
    case 'QUARTERLY':
      return addMonthsSafe(date, 3);
    case 'ANNUALLY':
      return addMonthsSafe(date, 12);
    case 'CUSTOM_DAYS':
      return addDays(date, Math.max(1, recurrence.intervalDays ?? 1));
    default:
      return addDays(date, 30);
  }
}

function rewindToStart(anchor: Date, start: Date, recurrence: Recurrence): Date {
  let current = anchor;
  if (current >= start) {
    return current;
  }

  const intervalDays = getIntervalDays(recurrence);
  if (intervalDays > 0) {
    const diff = start.getTime() - anchor.getTime();
    const steps = Math.floor(diff / (intervalDays * MS_PER_DAY));
    if (steps > 0) {
      current = addDays(anchor, steps * intervalDays);
    }
  }

  let safety = 0;
  while (current < start && safety < 500) {
    current = advanceDate(current, recurrence);
    safety += 1;
  }
  return current;
}

function generateOccurrences(bill: Bill, rangeStart: Date, rangeEnd: Date): string[] {
  if (!bill.active) {
    return [];
  }

  const occurrences: string[] = [];
  const first = parseISODate(bill.firstDueDate);
  const start = startOfDay(rangeStart);
  const end = startOfDay(rangeEnd);

  if (first > end) {
    return [];
  }

  let current = rewindToStart(first, start, bill.recurrence);
  let guard = 0;

  while (current <= end && guard < 500) {
    if (current >= start) {
      occurrences.push(toISODateString(current));
    }
    current = advanceDate(current, bill.recurrence);
    guard += 1;
  }

  return occurrences;
}

export function getOccurrencesInMonth(bill: Bill, monthDate: Date): string[] {
  const start = startOfDay(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1));
  const end = startOfDay(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0));
  return generateOccurrences(bill, start, end);
}

export function getOccurrencesInRange(bill: Bill, start: Date, end: Date): string[] {
  return generateOccurrences(bill, startOfDay(start), startOfDay(end));
}

export function getNextDue(bill: Bill, from: Date = new Date()): string | null {
  if (!bill.active) {
    return null;
  }

  const rangeStart = startOfDay(from);
  const rangeEnd = addDays(rangeStart, 365); // look ahead a year
  const occurrences = generateOccurrences(bill, rangeStart, rangeEnd);
  return occurrences.length > 0 ? occurrences[0] : null;
}

export function isOverdue(dateString: string, reference: Date = new Date()): boolean {
  const date = parseISODate(dateString);
  const today = startOfDay(reference);
  return date < today;
}

function advanceIncomeDate(date: Date, recurrence: IncomeRecurrenceType): Date | null {
  switch (recurrence) {
    case 'ONE_TIME':
      return null;
    case 'BIWEEKLY':
      return addDays(date, 14);
    case 'MONTHLY':
      return addMonthsSafe(date, 1);
    default:
      return null;
  }
}

function rewindIncomeToStart(first: Date, start: Date, recurrence: IncomeRecurrenceType): Date {
  if (first >= start || recurrence === 'ONE_TIME') {
    return first;
  }

  let current = first;
  let guard = 0;
  while (current < start && guard < 500) {
    const next = advanceIncomeDate(current, recurrence);
    if (!next) {
      break;
    }
    current = next;
    guard += 1;
  }
  return current;
}

function generateIncomeOccurrences(
  income: Income,
  rangeStart: Date,
  rangeEnd: Date,
): string[] {
  const start = startOfDay(rangeStart);
  const end = startOfDay(rangeEnd);
  const first = parseISODate(income.date);

  if (first > end) {
    return [];
  }

  if (income.recurrence === 'ONE_TIME') {
    if (first >= start && first <= end) {
      return [toISODateString(first)];
    }
    return [];
  }

  const occurrences: string[] = [];
  let current = rewindIncomeToStart(first, start, income.recurrence);
  let guard = 0;

  while (current <= end && guard < 500) {
    if (current >= start) {
      occurrences.push(toISODateString(current));
    }
    const next = advanceIncomeDate(current, income.recurrence);
    if (!next) {
      break;
    }
    current = next;
    guard += 1;
  }

  return occurrences;
}

export function getIncomeOccurrencesInMonth(income: Income, monthDate: Date): string[] {
  const start = startOfDay(new Date(monthDate.getFullYear(), monthDate.getMonth(), 1));
  const end = startOfDay(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0));
  return generateIncomeOccurrences(income, start, end);
}

export function getIncomeOccurrencesInRange(income: Income, start: Date, end: Date): string[] {
  return generateIncomeOccurrences(income, startOfDay(start), startOfDay(end));
}
