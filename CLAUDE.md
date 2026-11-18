@AGENTS.md

# Expense Tracker — Project Guide

## 1. Application type
- **Web app, mostly client-side:** a single-user expense tracker on Next.js (App Router).
- **Data:** lives only in browser `localStorage`. No database, server actions, or auth.
- **Server:** one API route, `POST /api/quick-add`, which calls Claude. It only parses text; it never stores or sees saved expenses.
- **Rendering:** every page is a `'use client'` component, prerendered as static HTML at build time.

## 2. Main features (`src/features/`)
| Feature | Does | Routes |
|---|---|---|
| `expenses/` (core) | Data model, categories, storage, add/edit/delete, search and filter, natural-language quick add | `/` (Expenses, Add tabs) |
| `analytics/` | Summary and pie chart, category/vendor rankings, monthly insights (donut, top 3, budget streak) | `/` (Dashboard tab), `/top-categories`, `/top-vendors`, `/monthly-insights` |
| `export/` | Quick CSV from the header; modal with CSV/JSON/PDF, filters, and preview | header button, Dashboard banner |

## 3. Tech stack (`package.json`)
- **Next.js 16.3.1** (Turbopack, `src/` folder convention). This is newer than most training data, so read `node_modules/next/dist/docs/` before using an unfamiliar API.
- **React 19.2.** TypeScript 5 (`strict`); `@/*` maps to `./src/*`.
- **Tailwind CSS v4** via `@tailwindcss/postcss`. No `tailwind.config.js`; theme tokens are in `src/app/globals.css` under `@theme inline`.
- **Libraries:** Recharts 3, date-fns 4, jspdf + jspdf-autotable (PDF is generated in the browser), `@anthropic-ai/sdk` + zod (server only).
- **Lint:** ESLint 9 flat config (next core-web-vitals + typescript).
- **Tests:** no test framework is installed.

## 4. Code organization
Feature-first: routes are thin, logic lives in features, and domain-free helpers live in `lib/`.
```
src/
  app/                     ROUTES: one folder per URL; page.tsx composes feature components
    layout.tsx, globals.css, page.tsx ("/" tabs), top-categories/, top-vendors/, monthly-insights/
    api/quick-add/route.ts POST endpoint: validates input, calls the server parser
  features/
    expenses/              CORE DOMAIN
      types.ts             Expense, ExpenseCategory, ExpenseFormData, DateRangeFilter
      constants.ts         EXPENSE_CATEGORIES, CATEGORY_COLORS, CATEGORY_ICONS, STORAGE_KEY
      hooks/useExpenses.ts the ONLY localStorage access + CRUD
      lib/filters.ts       getCurrentMonthExpenses, filterExpenses, filterExpensesByDateRange
      lib/quickAdd.ts      zod request/response schemas for quick add (client imports types only)
      server/              server-only code ('server-only'): parseExpenseText calls Claude
      components/          ExpenseForm, ExpenseList, QuickAddInput
    analytics/             READ-ONLY AGGREGATION + CHARTS
      types.ts, lib/stats.ts (calculateCategoryBreakdown, calculateVendorStats, calculateBudgetStreak)
      components/          Dashboard, MonthlyInsights
    export/
      lib/exportService.ts CSV / JSON / PDF (put new export work here)
      lib/quickCsv.ts      legacy one-click CSV used by the header button; don't extend it
      components/          ExportModal
  integrations/anthropic/  server-only Claude client + CLAUDE_MODEL ('claude-opus-5-5')
  lib/utils.ts             SHARED, domain-free: formatCurrency, formatDate, generateId
public/                    static assets (stays at the repo root)
docs/dev/, docs/user/      implementation docs and how-to guides (/document-feature)
```
**Import direction:** `app → analytics → export → expenses → lib`. Never import upward.
- `lib/` and `integrations/` import no feature. A helper that needs `Expense` belongs in a feature.
- Only `server/` folders, `src/app/api/`, and `integrations/` may import `@/integrations/*` or the SDK. Mark those files `import 'server-only'`.
- Import across features by full path. Don't add barrel `index.ts` files.

**Where new code goes:**
- New metric: `analytics/lib/stats.ts`
- New filter: `expenses/lib/filters.ts`
- New screen:
  1. Create `src/app/<name>/page.tsx`.
  2. Put its UI in the right feature's `components/`.
  3. Add entry points in `src/app/page.tsx`: a desktop header link (`hidden sm:flex`) **and** a mobile floating button (`sm:hidden`).
- Pages should not hold aggregation logic. `top-categories/page.tsx` still does, so don't copy it; move logic out when you touch it.

## 5. External systems
- **Anthropic Claude API** (quick add only), called from the server with `ANTHROPIC_API_KEY` in `.env.local` (gitignored). The key must never reach the browser.
  - Requests use `beta.messages.parse` with a zod output schema, `effort: 'low'`, and server-side refusal fallbacks.
  - The user's text is sent to Anthropic; the form says so. Server code re-validates Claude's output (`sanitize`) before returning it.
  - The user always reviews the prefilled form before saving. Keep that: Claude never writes to storage.
- **Exports** download through a Blob link. **Fonts** (`next/font/google`) are fetched at build time.
- **Adding one:** endpoints in `src/app/api/<name>/route.ts`, client code in `src/integrations/<name>/`, secrets in `.env.local`.

## 6. Build and deploy
```bash
npm run dev        # http://localhost:3000
npm run build      # production build; all routes static
npm start          # serve the build
npm run lint       # must stay clean
npx tsc --noEmit   # run after a build or dev run (LayoutProps types are generated in .next/)
```
- **No deploy setup:** no Dockerfile, `scripts/`, CI, or deploy config. Deploy with `next build` + `next start` (not a static export: the API route needs a server).
- **Before hosting publicly,** add auth or rate limiting to `/api/quick-add`. There's no login, so anyone could spend the API key.
- **If you add CI,** use `.github/workflows/` and run lint, tsc, and build.
- **Never commit `.next/`.**

## Rules the code depends on
**Data layer (`useExpenses`)**
- It's a module-level store read through `useSyncExternalStore`:
  - All callers share one store.
  - Writes notify subscribers, and the `storage` event syncs other tabs.
  - `getSnapshot` must return a stable reference. The store caches on the raw stored string, so never build a new array per read.
  - The server snapshot is `null`, which becomes `isLoading: true`. Pages must render a loading state while it's true.
- Storage is written **only on mutations**, never on load, so corrupt data isn't overwritten by opening a page. Don't add a "save on every change" effect.

**Data shape**
- `Expense` fields:
  - `id`
  - `date`: `yyyy-MM-dd`
  - `amount`: number, USD
  - `category`
  - `description`
  - `createdAt` / `updatedAt`: ISO timestamps
- **No schema version or migration.** Renaming or retyping a field breaks stored data. Add fields as optional, or migrate in `readExpenses`.
- `description` doubles as the vendor name.

**Dates**
- Use `parseISO(expense.date)`, never `new Date(expense.date)`. The latter parses as UTC and shifts the day in western timezones.
- Use date-fns for all date math.

**Categories**
- Closed union: `Food | Transportation | Entertainment | Shopping | Bills | Other`.
- To add one, update `ExpenseCategory` **and** `EXPENSE_CATEGORIES`, `CATEGORY_COLORS`, and `CATEGORY_ICONS`. tsc flags any you miss.
- Never hard-code category colors or icons.

**Reuse**
- Money uses `formatCurrency`; never `toFixed` in UI text.
- Check `filters.ts` and `stats.ts` before writing a helper.
- Known duplication; don't add more:
  - `top-categories` has its own date filtering.
  - There are two CSV exporters.

**Validation (`ExpenseForm`)**
- Date required; amount > 0 matching `/^\d+\.?\d{0,2}$/`; description required.
- Future dates are blocked by the date input's `max` (browser validation); quick add clamps them to today.
- The parent resets the form by changing its `key`.

**Lint**
- No `any` and no `eslint-disable`.
- For Recharts callbacks, use `PieLabelRenderProps` / `TooltipContentProps`.
- Never call setState from an effect to mirror props.

## UI conventions
- **Styling:** Tailwind utilities inline; no CSS modules or component library.
- **Page shell:**
  - `min-h-screen bg-gray-50`
  - Sticky white header with the 💸 logo linking to `/` and a "Back to Dashboard" link
  - Content in `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8`
  - Copy the spinner loading state from an existing page
- **Cards:** `bg-white rounded-lg shadow-sm p-6`. The accent is `from-blue-600 to-purple-600`.
- **Empty states:** always handle both "no expenses" and "none in the selected range".
- **Charts:** an explicit-height container around `ResponsiveContainer`; tooltips use `formatCurrency`.
- **Dark mode:** unsupported. No `dark:` variants, and don't add partial dark mode.

## Git and workflow
- **Branches:** `main` is the integration branch. Features go on `feature/<name>` branches, often in sibling worktrees (`../expense-tracker-*`); see `docs/dev/worktrees.md`.
- **Slash commands** (`.claude/commands/`):
  - `/parallel-work` sets up worktrees.
  - `/integrate-parallel-work` merges them.
  - `/document-feature <name>` generates docs.
- **Commit messages:** imperative ("Implement Top Vendors analytics page"). Merges: "Merge feature/<name>: <summary>".
- **When to commit or push:** only when asked.
- **Don't commit** scratch files (`*.work.txt`, `INTEGRATION-REPORT.md`, mockup PNGs).
- **Moving files:** use `git mv`.
- **`AGENTS.md`:** `next dev` may rewrite it. Leave it intact, and keep the `@AGENTS.md` import at the top of this file.

## Definition of done
1. `npm run build`, `npx tsc --noEmit`, and `npm run lint` are clean.
2. The changed route loads in `npm run dev`, with data and empty states checked.
3. Stored data still loads (no breaking `Expense` change without a migration).
4. Code is in the right folder and follows the import direction; helpers are reused.
5. Any new screen is reachable from `/` on desktop and mobile.
