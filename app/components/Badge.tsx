'use client';

import clsx from 'clsx';

interface BadgeProps {
  value: number;
  variant?: 'default' | 'danger' | 'income';
}

export function Badge({ value, variant = 'default' }: BadgeProps) {
  if (value <= 0) {
    return null;
  }

  return (
    <span
      className={clsx(
        'rounded-full px-2 py-0.5 text-xs font-semibold',
        variant === 'danger'
          ? 'bg-danger/20 text-danger'
          : variant === 'income'
            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300'
            : 'bg-accent/20 text-accent',
      )}
    >
      {value}
    </span>
  );
}
