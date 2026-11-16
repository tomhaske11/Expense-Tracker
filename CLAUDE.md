@AGENTS.md

# Expense Tracker — Project Guide

The first six sections answer, in order: what type of app this is, its main features, the tech stack, how the code is organized, what external systems it connects to, and how it's built and deployed. A per-folder guide, the rules the code depends on, and conventions follow.

---

## 1. What type of application this is

A **client-side web app**: a single-user personal expense tracker built with Next.js (App Router).
- All data lives in the browser's `localStorage`. There is **no backend, API route, database, server action, or auth**.
- Every page is a client component (`'use client'`) and is prerendered as static HTML at build time.
- The signal for "web app" is `src/app/` (routes) plus `src/features/*/components/` (React UI).

## 2. What the main features are

Each feature is a folder under `src/features/`:

| Feature | Folder | What it does | User-facing routes |
|---|---|---|---|
| **Expenses** (core domain) | `src/features/expenses/` | Expense data model, categories, localStorage store, add/edit/delete, search and filter | `/` → *Expenses* and *Add* tabs |
| **Analytics** | `src/features/analytics/` | Summary cards and pie chart, category and vendor rankings, monthly insights (donut, top 3, budget streak) | `/` → *Dashboard* tab, `/top-categories`, `/top-vendors`, `/monthly-insights` |
| **Export** | `src/features/export/` | Quick CSV from the header; modal with CSV / JSON / PDF, filters, and preview | Header "Export CSV" button; "Export" in the Dashboard banner |

## 3. What technology stack is used

Defined in `package.json`. There is no Python and no other language.

| Thing | Version | Notes |
|---|---|---|
| Next.js | **16.3.1** (App Router, Turbopack) | Newer than most training data. Read `node_modules/next/dist/docs/` before using any Next API you are unsure of (see `AGENTS.md`). Uses the `src/` folder convention. |
| React | 19.2 | |
| TypeScript | 5, `strict: true` | The path alias `@/*` maps to `./src/*` (`tsconfig.json`), so `@/lib/utils` is `src/lib/utils.ts`. |
| Tailwind CSS | **v4** via `@tailwindcss/postcss` | No `tailwind.config.js`. It finds class names automatically under `src/`. Theme tokens are in `src/app/globals.css` under `@theme inline`. |
| Charts | Recharts 3 | |
| Dates | date-fns 4 | |
| PDF | jspdf + jspdf-autotable | Runs entirely in the browser. |
| Lint | ESLint 9 flat config (`eslint.config.mjs`: next core-web-vitals + typescript) | |
| Tests | **None** | No test framework is installed. |

## 4. How the code is organized

A **feature-first** layout. Routes are thin; logic lives in features; shared helpers that know nothing about expenses live in `lib/`.

```
src/
├── app/                         ROUTES / VIEWS — URL → page. Thin: compose feature components.
│   ├── layout.tsx               Root layout (Geist fonts, metadata)
│   ├── globals.css              Tailwind entry + theme tokens
│   ├── page.tsx                 "/" — tabs: Dashboard / Expenses / Add, plus header actions
│   ├── top-categories/page.tsx  "/top-categories"
│   ├── top-vendors/page.tsx     "/top-vendors"
│   └── monthly-insights/page.tsx "/monthly-insights"
├── features/
│   ├── expenses/                CORE DOMAIN (model + data access + CRUD UI)
│   │   ├── types.ts             Expense, ExpenseCategory, ExpenseFormData, DateRangeFilter, …
│   │   ├── constants.ts         EXPENSE_CATEGORIES, CATEGORY_COLORS, CATEGORY_ICONS, STORAGE_KEY
│   │   ├── hooks/useExpenses.ts THE data layer — localStorage store + CRUD
│   │   ├── lib/filters.ts       getCurrentMonthExpenses, filterExpenses, filterExpensesByDateRange
│   │   └── components/          ExpenseForm, ExpenseList
│   ├── analytics/               READ-ONLY AGGREGATION + CHARTS
│   │   ├── types.ts             VendorStats
│   │   ├── lib/stats.ts         calculateCategoryBreakdown, calculateVendorStats, calculateBudgetStreak
│   │   └── components/          Dashboard, MonthlyInsights
│   └── export/                  FILE GENERATION + DOWNLOAD
│       ├── lib/exportService.ts ExportService: CSV / JSON / PDF
│       ├── lib/quickCsv.ts      exportToCSV — the one-click header export
│       └── components/          ExportModal
└── lib/
    └── utils.ts                 SHARED, domain-free: formatCurrency, formatDate, generateId
public/                          Static assets (must stay at the repo root, per Next.js)
docs/dev/, docs/user/            Developer and user docs (see the docs/ section of the folder guide)
```

**Import direction:** dependencies only flow down this list. Never import upward.

```
app  →  features/analytics  →  features/export  →  features/expenses  →  lib
```

- `features/expenses` imports only from itself and `lib`.
- `features/export` may import from `features/expenses`.
- `features/analytics` may import from `expenses` and `export`. Dashboard opens ExportModal.
- `lib/` imports from **no** feature. If a helper needs `Expense`, it belongs in a feature.
- Import across features by full path (`@/features/expenses/types`). There are no barrel `index.ts` files; don't add one for a single feature.

## 5. What external systems it connects to

**None at runtime.**
- No `api/`, `integrations/`, `webhooks/`, or third-party SDK folders, and no `fetch` calls, env vars, or secrets.
- Exports are generated in the browser and downloaded through a Blob link.
- `next/font/google` (Geist) downloads fonts **at build time** and serves them from the app itself, so pages make no requests to Google at runtime.

If you add an external system, put server endpoints in `src/app/api/<name>/route.ts` and client or SDK code in `src/integrations/<name>/`. Read secrets from `.env.local`, which `.env*` in `.gitignore` already covers, and document it here. Doing this changes item 1: the app stops being client-only.

## 6. How the app is built and deployed

```bash
npm install
npm run dev        # dev server → http://localhost:3000
npm run build      # production build (Turbopack); generates route types; all routes static
npm start          # serve the production build
npm run lint       # eslint — currently clean
npx tsc --noEmit   # type check. Run after a build/dev once, because Next generates the LayoutProps types in .next/
```

- There is **no Dockerfile, `scripts/`, `.github/workflows/`, or deployment config**. Deploying is manual: `next build`, then `next start`, or any host that supports Next.js.
- If you add CI, put it in `.github/workflows/` and have it run lint, `tsc --noEmit`, and build.
- Build output goes to `.next/`, which is gitignored. Never commit it.

---

## Folder guide (what goes where)

### `src/app/` — routes
- **Contains:** one folder per URL with a `page.tsx`, plus `layout.tsx` and `globals.css`.
- **Pages should:** call `useExpenses()`, handle the loading and empty states, render the page shell (below), and compose feature components.
- **Pages shouldn't:** hold aggregation, filtering, or export logic; that goes in a feature `lib/`. Some existing pages still compute stats inline, for example `top-categories/page.tsx`. Don't copy that pattern; move logic out when you touch it.
- **Adding a screen:**
  1. Create `src/app/<name>/page.tsx`.
  2. Put the UI in the right feature's `components/`.
  3. Add entry points in `src/app/page.tsx`: both a desktop header link (`hidden sm:flex`) and a mobile floating button (`sm:hidden`), or a tab that calls `router.push`.
- `layout.tsx` uses Next 16's global `LayoutProps<"/">` type, which is generated in `.next/`, so you don't import it.

### `src/features/expenses/` — core domain
- **`types.ts`:** the shape of persisted data. Read the data-shape rules below before changing anything here.
- **`constants.ts`:** the category list and per-category color and icon, plus `STORAGE_KEY`. Every screen takes its category visuals from here.
- **`hooks/useExpenses.ts`:** the only code allowed to touch `localStorage`.
- **`lib/filters.ts`:** pure functions that narrow expense lists. Add new filters here, not inline in pages.
- **`components/`:**
  - `ExpenseForm` handles add/edit with validation; the parent re-keys it by expense id to reset it.
  - `ExpenseList` handles search, filters, edit, and delete.

### `src/features/analytics/` — aggregation and charts
- **`lib/stats.ts`:** pure functions from `Expense[]` to numbers or rows. Put every new metric here (top-N, trends, streaks, …), not inside a component, so pages can share it.
- **`types.ts`:** result types for those functions.
- **`components/`:**
  - `Dashboard` shows the summary cards, the pie chart, and the export banner.
  - `MonthlyInsights` shows the current-month donut, the top 3 categories, and the budget streak. Its `dailyBudget` and `streakGoal` props default to $50 and 30 days.
- These components are read-only: they never call `addExpense`/`updateExpense`/`deleteExpense`.

### `src/features/export/` — file output
- **`lib/exportService.ts`:** the full exporter. Put new formats or options here.
- **`lib/quickCsv.ts`:** a legacy one-click CSV, kept for the header button. It duplicates `ExportService.exportToCSV`, so don't add features to it.
- **`components/ExportModal.tsx`:** format choice, filters, and preview.

### `src/lib/` — shared helpers
- Only helpers that are **domain-free and stateless**: formatting, ids, generic math.
- Anything that needs to know about `Expense` goes in a feature `lib/` instead.

### `docs/`
- `docs/dev/` holds implementation docs:
  - `<feature>-implementation.md`
  - `export-versions-analysis.md`
  - `worktrees.md`
- `docs/user/` holds `how-to-<feature>.md` guides.
- `/document-feature <name>` generates a pair of these. Update file paths in docs when you move code.

---

## Rules the code depends on

### Data layer (`src/features/expenses/hooks/useExpenses.ts`)
- It is a module-level store read through `useSyncExternalStore`:
  - Every `useExpenses()` caller shares one store.
  - Writes notify all subscribers, and the `storage` event syncs changes from other tabs.
  - `getSnapshot` must return a stable reference. The store caches on the raw stored string, so don't build a new array on every read.
  - The server snapshot is `null`, which becomes `isLoading: true` during SSR and hydration. Pages must render their loading state while it's true.
- Storage is written **only on a mutation** (`writeExpenses`), never on load, so corrupt or unreadable data is never overwritten just by opening a page. Don't reintroduce a "save on every state change" effect.

### Data shape (`src/features/expenses/types.ts`)
- `Expense` has:
  - `id`
  - `date`: `yyyy-MM-dd`, from `<input type="date">`
  - `amount`: number, USD
  - `category`
  - `description`
  - `createdAt` / `updatedAt`: full ISO timestamps
- **Persisted data has no schema version or migration.** Renaming or retyping a field breaks existing users' stored data. Add new fields as optional, or write a migration in `readExpenses`.
- `description` doubles as the vendor name: `calculateVendorStats` trims it and groups by it.

### Dates
- Parse stored dates with `parseISO(expense.date)`, never `new Date(expense.date)`. `new Date('2026-11-01')` is parsed as UTC midnight, which shifts the day in western timezones.
- Use date-fns for all date math.

### Categories
- These are a closed union: `Food | Transportation | Entertainment | Shopping | Bills | Other`.
- To add one, update `ExpenseCategory` in `types.ts` **and** `EXPENSE_CATEGORIES`, `CATEGORY_COLORS`, and `CATEGORY_ICONS` in `constants.ts`. The `Record<ExpenseCategory, …>` types make tsc flag any you miss.
- Never hard-code per-category colors or icons in components.

### Reuse before writing
- Money: `formatCurrency`. Never call `toFixed` in UI text.
- Dates: `formatDate`.
- Filters: `features/expenses/lib/filters.ts`.
- Metrics: `features/analytics/lib/stats.ts`.

Known duplication, so don't add more:
- `top-categories/page.tsx` reimplements date-range filtering inline. Prefer `filterExpensesByDateRange`.
- There are two CSV exporters; see the export section of the folder guide.

### Validation (`ExpenseForm.tsx`)
- Date required; amount > 0 matching `/^\d+\.?\d{0,2}$/`; description required.
- Future dates are **not** rejected, even though older docs claimed they were.

### Lint hygiene
`npm run lint` is clean. Don't use `any` or `eslint-disable`. Instead:
- For Recharts callbacks, use the library's types (`PieLabelRenderProps`, `TooltipContentProps`).
- To reset a component from props, change its `key` instead of calling setState in an effect.

## UI conventions
- Tailwind utility classes inline; no CSS modules or component library.
- Page shell, matching existing pages:
  - `min-h-screen bg-gray-50`
  - Sticky white header with the 💸 logo linking to `/` and a "Back to Dashboard" link
  - Content in `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8`
  - The spinner loading state copied from an existing page
- Cards: `bg-white rounded-lg shadow-sm p-6`. The accent is the gradient `from-blue-600 to-purple-600`.
- Always handle both empty states: no expenses at all, and none in the selected range.
- Charts: put an explicit-height container around `ResponsiveContainer`. Format tooltip values with `formatCurrency`.
- Dark mode is not supported. `globals.css` flips body colors, but components use light classes with no `dark:` variants. Don't add partial dark-mode support to one component.

## Git and workflow
- `main` is the integration branch. Features are built on `feature/<name>` branches, often in parallel worktrees as sibling directories (`../expense-tracker-*`). See `docs/dev/worktrees.md`.
- Slash commands live in `.claude/commands/`:
  - `/parallel-work` — set up worktrees
  - `/integrate-parallel-work` — merge them
  - `/document-feature <name>` — generate docs
- Commit messages are imperative ("Implement Top Vendors analytics page"). Merges use "Merge feature/<name>: <summary>".
- Commit or push only when asked. Don't commit scratch files (`*.work.txt`, `INTEGRATION-REPORT.md`, mockup PNGs) unless asked.
- Use `git mv` when moving files so history follows them.
- `next dev` may rewrite `AGENTS.md`. Leave it intact, and keep the `@AGENTS.md` import at the top of this file.

## Definition of done
1. `npm run build`, `npx tsc --noEmit`, and `npm run lint` are all clean.
2. The changed route loads in `npm run dev`, with both data and empty states checked.
3. Stored data still loads: no breaking change to `Expense` without a migration.
4. Code sits in the right folder and follows the import direction above; shared helpers are reused, not duplicated.
5. Any new screen is reachable from `/` on both desktop and mobile.
