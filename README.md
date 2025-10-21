# bill-tracker

Dark-themed subscription and bill organizer built with Next.js App Router and Tailwind CSS. It keeps recurring payments visible on a monthly calendar, supports local editing, and persists everything in `localStorage`.

## Features

- Monthly calendar with per-day bill counts, overdue indicators, and keyboard-friendly navigation.
- Day drawer showing bill details with edit/delete controls.
- Add/Edit modal with validation, recurrence options, notes, and active toggle.
- Accurate recurrence engine (weekly, 30-day, monthly, quarterly, yearly, custom-day intervals).
- Totals bar summarizing monthly, 7-day, and 30-day commitments per currency.
- Export/Import JSON, demo seed data, and local persistence only.

## Prerequisites

- Node.js 18.18+ or 20+
- npm 9+

## Getting Started

```bash
npm install
npm run dev
```

The app runs at `http://localhost:3000`. It seeds demo data on first load and stores changes in the browser.

## Useful Scripts

```bash
npm run dev      # Start Next.js in development mode
npm run build    # Create production build
npm run start    # Run production build
npm run lint     # Check linting errors
npm run format   # Format with Prettier
```

## Changing the Default Currency

- Default currency for new bills is set to `CAD` in `app/components/BillFormModal.tsx` (`useState<Currency>("CAD")`).
- Update that default and the demo seed data in `app/lib/storage.ts` (see the `demoBills` array) if you need a different baseline currency.

## Recurrence Logic Overview

The recurrence helpers live in `app/lib/recurrence.ts`:

- `addMonthsSafe` keeps the day within valid month bounds (e.g., February handling).
- `getOccurrencesInMonth` returns all due dates for a bill within a target month.
- `getOccurrencesInRange` powers the totals and upcoming calculations.
- `getNextDue`, `isOverdue`, and `addDays` support drawer status and badges.
  Each recurrence type resolves to a predictable interval, with `CUSTOM_DAYS` honoring the user-defined day count.

## Deploy with deploy.sh

The repository includes `scripts/deploy.sh` to push changes to GitHub `main`:

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

The script stages all files, commits with message `feat: initial bill-tracker MVP`, force-sets the branch to `main`, pushes to origin, and prints a success message.

## Export / Import Tips

- Export creates `bill-tracker-export.json` with your current bills.
- Importing prompts for confirmation before replacing everything. Always keep a backup export before replacing.

Enjoy tracking your bills with a clean, dark workspace!
