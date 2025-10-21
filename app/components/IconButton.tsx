'use client';

import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import clsx from 'clsx';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'solid' | 'ghost';
}

export function IconButton({
  children,
  className,
  variant = 'ghost',
  ...props
}: PropsWithChildren<IconButtonProps>) {
  return (
    <button
      type="button"
      className={clsx(
        'inline-flex items-center justify-center rounded-full p-2 transition-colors',
        variant === 'solid'
          ? 'bg-accent/20 text-textPrimary hover:bg-accent/30'
          : 'text-textPrimary/70 hover:text-textPrimary',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
