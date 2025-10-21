import type { Currency } from './types';

const currencyLabels: Record<Currency, string> = {
  CAD: 'CAD',
  USD: 'USD',
  EUR: 'EUR',
};

export const currencyOptions: Currency[] = ['CAD', 'USD', 'EUR'];

export function formatCurrency(amount: number, currency: Currency): string {
  try {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    console.error('Failed to format currency', error);
    return `${currencyLabels[currency]} ${amount.toFixed(2)}`;
  }
}

export function formatTotalsMap(totals: Partial<Record<Currency, number>>): string {
  if (!totals || Object.keys(totals).length === 0) {
    return formatCurrency(0, 'CAD');
  }

  return Object.entries(totals)
    .filter(([, value]) => typeof value === 'number' && !Number.isNaN(value))
    .map(([currency, value]) => formatCurrency(value as number, currency as Currency))
    .join(' · ');
}
