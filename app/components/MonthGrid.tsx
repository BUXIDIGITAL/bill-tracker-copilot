'use client';

import clsx from 'clsx';
import { IconButton } from './IconButton';
import { Badge } from './Badge';

interface CalendarDay {
  date: Date;
  inCurrentMonth: boolean;
}

interface MonthGridProps {
  monthDate: Date;
  occurrences: Record<string, number>;
  overdueDates: Set<string>;
  selectedDate: string | null;
  todayKey: string;
  onSelectDay: (dateKey: string) => void;
  onChangeMonth: (offset: number) => void;
}

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildCalendar(monthDate: Date): CalendarDay[] {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const startDay = firstOfMonth.getDay();
  const daysInMonth = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth() + 1,
    0,
  ).getDate();

  const days: CalendarDay[] = [];

  for (let i = startDay - 1; i >= 0; i -= 1) {
    const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), -i);
    days.push({ date, inCurrentMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
    days.push({ date, inCurrentMonth: true });
  }

  while (days.length % 7 !== 0) {
    const last = days[days.length - 1]?.date ?? firstOfMonth;
    const date = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
    days.push({ date, inCurrentMonth: false });
  }

  return days;
}

export function MonthGrid({
  monthDate,
  occurrences,
  overdueDates,
  selectedDate,
  todayKey,
  onSelectDay,
  onChangeMonth,
}: MonthGridProps) {
  const humanMonth = new Intl.DateTimeFormat('en-CA', {
    month: 'long',
    year: 'numeric',
  }).format(monthDate);

  const days = buildCalendar(monthDate);

  return (
    <section className="rounded-3xl bg-surfaceLight p-6 shadow-glow dark:bg-surface">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-wide text-textDark/60 dark:text-textPrimary/60">
            Month
          </p>
          <h1 className="text-2xl font-semibold text-textDark dark:text-textPrimary">
            {humanMonth}
          </h1>
        </div>
        <div className="flex gap-2">
          <IconButton aria-label="Previous month" onClick={() => onChangeMonth(-1)}>
            ‹
          </IconButton>
          <IconButton aria-label="Next month" onClick={() => onChangeMonth(1)}>
            ›
          </IconButton>
        </div>
      </header>

      <div className="grid grid-cols-7 gap-3 text-center text-sm text-textDark/60 dark:text-textPrimary/60">
        {weekdayLabels.map((label) => (
          <span key={label} className="px-2">
            {label}
          </span>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-7 gap-3">
        {days.map(({ date, inCurrentMonth }) => {
          const key = toKey(date);
          const isToday = key === todayKey;
          const isSelected = key === selectedDate;
          const count = occurrences[key] ?? 0;
          const overdue = overdueDates.has(key);

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDay(key)}
              className={clsx(
                'flex h-20 flex-col rounded-2xl border border-transparent bg-mutedLight/60 p-3 text-left transition dark:bg-muted/30',
                inCurrentMonth
                  ? 'text-textDark dark:text-textPrimary'
                  : 'text-textDark/30 dark:text-textPrimary/30',
                isSelected && 'border-accent bg-accent/10',
                isToday && 'border border-accent/60',
                'hover:border-accent/40 hover:bg-accent/10',
              )}
            >
              <div className="flex items-center gap-2 text-base font-semibold">
                <span>{date.getDate()}</span>
                <Badge value={count} variant={overdue ? 'danger' : 'default'} />
              </div>
              <span className="mt-auto text-xs text-textDark/40 dark:text-textPrimary/40">
                {inCurrentMonth ? '' : date.getMonth() === monthDate.getMonth() ? '' : ''}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
