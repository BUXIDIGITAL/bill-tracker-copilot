'use client';

import type { ChangeEvent, FormEvent } from 'react';

interface SearchBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  category: string;
  onCategoryChange: (value: string) => void;
  categories: string[];
  date: string;
  onDateChange: (value: string) => void;
  onReset: () => void;
}

export function SearchBar({
  query,
  onQueryChange,
  category,
  onCategoryChange,
  categories,
  date,
  onDateChange,
  onReset,
}: SearchBarProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl bg-surfaceLight p-4 shadow-glow dark:bg-surface"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <label className="flex flex-1 flex-col gap-2 text-sm">
          <span className="text-textDark/70 dark:text-textPrimary/70">Search by name</span>
          <input
            value={query}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onQueryChange(event.target.value)
            }
            placeholder="e.g. Netflix"
            className="rounded-2xl border border-mutedLight bg-surfaceLight px-4 py-2.5 text-textDark placeholder:text-textDark/40 focus:border-accent dark:border-muted dark:bg-muted/30 dark:text-textPrimary"
          />
        </label>

        <label className="flex w-full flex-col gap-2 text-sm md:w-48">
          <span className="text-textDark/70 dark:text-textPrimary/70">Category</span>
          <select
            value={category}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              onCategoryChange(event.target.value)
            }
            className="rounded-2xl border border-mutedLight bg-surfaceLight px-4 py-2.5 text-textDark focus:border-accent dark:border-muted dark:bg-muted/30 dark:text-textPrimary"
          >
            <option value="ALL">All</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="flex w-full flex-col gap-2 text-sm md:w-56">
          <span className="text-textDark/70 dark:text-textPrimary/70">Filter by date</span>
          <input
            type="date"
            value={date}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              onDateChange(event.target.value)
            }
            className="rounded-2xl border border-mutedLight bg-surfaceLight px-4 py-2.5 text-textDark focus:border-accent dark:border-muted dark:bg-muted/30 dark:text-textPrimary"
          />
        </label>

        <button
          type="button"
          onClick={onReset}
          className="rounded-full border border-mutedLight px-5 py-2 text-sm font-medium text-textDark transition hover:border-textDark dark:border-muted dark:text-textPrimary/80 dark:hover:border-textPrimary"
        >
          Clear filters
        </button>
      </div>
    </form>
  );
}
