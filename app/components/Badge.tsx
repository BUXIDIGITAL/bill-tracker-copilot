'use client';

import clsx from 'clsx';

interface BadgeProps {
  value: number;
  variant?: 'default' | 'danger';
}

export function Badge({ value, variant = 'default' }: BadgeProps) {
  if (value <= 0) {
    return null;
  }

  return (
    <span
      className={clsx(
        'ml-auto rounded-full px-2 py-0.5 text-xs font-semibold',
        variant === 'danger' ? 'bg-danger/20 text-danger' : 'bg-accent/20 text-accent',
      )}
    >
      {value}
    </span>
  );
}
