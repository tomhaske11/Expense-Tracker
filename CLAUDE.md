@AGENTS.md

# Expense Tracker — Project Guide

## 1. Application type
- **Web app, mostly client-side:** single-user, Next.js App Router.
- **Data:** browser `localStorage` only. No database, server actions, or auth.
- **Server:** POST routes call Claude: `/api/quick-add` (text), `/api/receipt` (photo), `/api/coach`, `/api/assistant`. None store data.
- **Rendering:** all pages `'use client'`, prerendered static.

## 2. Main features (`src/features/`)
| Feature | Does | Routes |
|---|---|---|
| `expenses/` (core) | Data model, categories, storage, add/edit/delete, search and filter, quick add from text or a receipt photo | `/` (Expenses, Add tabs) |
| `analytics/` | Summary, pie chart, category/vendor rankings, monthly insights (donut, top 3, streak, daily budget, Claude coach) | `/` (Dashboard tab), `/top-categories`, `/top-vendors`, `/monthly-insights` |
| `export/` | Quick CSV from the header; modal with CSV/JSON/PDF, filters, and preview | header button, Dashboard banner |
| `assistant/` | "Ask your money" chat; Claude's tools run in the browser, edits are proposals the user approves | `/assistant` |

## 3. Tech stack (`package.json`)
- **Next.js 16.3.1** (Turbopack, `src/`). Newer than most training data: read `node_modules/next/dist/docs/` before using an unfamiliar API.
- **React 19.2.** TypeScript 5 (`strict`); `@/*` maps to `./src/*`.
- **Tailwind CSS v4** via `@tailwindcss/postcss`. No `tailwind.config.js`; tokens are in `globals.css` (`@theme inline`).
- **Libraries:** Recharts 3, date-fns 4, jspdf + jspdf-autotable (browser PDF), `@anthropic-ai/sdk` (server; `import type` elsewhere), zod.
- **Lint:** ESLint 9 flat config (next core-web-vitals + typescript). **Tests:** none installed.

## 4. Code organization
Feature-first: thin routes, logic in features, domain-free helpers in `lib/`.
```
src/
  app/                     ROUTES: a folder per URL; page.tsx composes features
    layout.tsx, globals.css, page.tsx ("/" tabs), top-categories/, top-vendors/, monthly-insights/, assistant/
    api/<quick-add|receipt|coach|assistant>/  validate input, call feature server code
  features/
    expenses/              CORE DOMAIN
      types.ts             Expense, ExpenseCategory, ExpenseFormData, DateRangeFilter
      constants.ts         EXPENSE_CATEGORIES, CATEGORY_COLORS, CATEGORY_ICONS, STORAGE_KEY
      hooks/useExpenses.ts expense storage + CRUD
      lib/filters.ts       getCurrentMonthExpenses, filterExpenses, filterExpensesByDateRange
      lib/quickAdd.ts      zod schemas for quick add + receipts; lib/receiptImage.ts resizes photos
      server/              'server-only': parseExpenseText, parseReceiptImage call Claude
      components/          ExpenseForm, ExpenseList, QuickAddInput
    analytics/             AGGREGATION, CHARTS, COACH
      lib/stats.ts         all metrics (breakdowns, vendors, streak, suggestDailyBudget)
      lib/coach.ts         buildCoachSummary + zod schemas; server/coachInsights.ts calls Claude
      hooks/useDailyBudget.ts  daily budget in localStorage
      components/          Dashboard, MonthlyInsights, BudgetCoach
    export/
      lib/exportService.ts CSV / JSON / PDF (new export work goes here)
      lib/quickCsv.ts      legacy header-button CSV; don't extend it
      components/          ExportModal
    assistant/             CHAT AGENT: lib/ (tools.ts zod schemas, runTools.ts, protocol.ts),
      hooks/useAssistantChat.ts (tool loop), server/streamAssistantTurn.ts, components/
  integrations/anthropic/  server-only client, CLAUDE_MODEL ('claude-opus-5-5'), describeAnthropicError
  lib/utils.ts             SHARED, domain-free: formatCurrency, formatDate, generateId
public/                    static assets
docs/dev/, docs/user/      dev docs and how-tos (/document-feature)
```
**Import direction:** `app → assistant → analytics → export → expenses → lib`. Never import upward.
- `lib/` and `integrations/` import no feature. A helper that needs `Expense` belongs in a feature.
- Only `server/` folders, `src/app/api/`, and `integrations/` may import `@/integrations/*` or the SDK. Mark those files `import 'server-only'`. Others may only `import type` from the SDK.
- Import across features by full path. Don't add barrel `index.ts` files.

**Where new code goes:**
- New metric: `analytics/lib/stats.ts`
- New filter: `expenses/lib/filters.ts`
- New screen:
  1. Create `src/app/<name>/page.tsx`.
  2. Put its UI in the right feature's `components/`.
  3. In `src/app/page.tsx` add a desktop header link (`hidden sm:flex`) **and** a mobile floating button (`sm:hidden`).
- Pages hold no aggregation logic. `top-categories/page.tsx` still does; don't copy it, move it out when you touch it.

## 5. External systems
- **Anthropic Claude API**, called from the server with `ANTHROPIC_API_KEY` in `.env.local` (gitignored). The key must never reach the browser.
  - All use server-side refusal fallbacks. Quick add, receipts, coach: `beta.messages.parse`, zod schema, `effort: 'low'`.
  - Text and photos go to Anthropic (the UI says so); `sanitize` re-validates output. The coach sends only aggregates.
  - Assistant: `beta.messages.stream`, `effort: 'medium'`. The browser keeps history, runs tools, loops (max 10 steps). Tool results go to Anthropic; the chat says so.
  - Claude never writes to storage: quick add prefills a form; the assistant's `propose_changes` shows a card the user approves.
- **Exports** download via a Blob link. **Fonts** (`next/font/google`) load at build time.
- **Adding one:** route in `src/app/api/<name>/`, client in `src/integrations/<name>/`, secrets in `.env.local`.

## 6. Build and deploy
```bash
npm run dev        # http://localhost:3000
npm run build      # production build (pages static, API routes dynamic)
npm start          # serve the build
npm run lint       # must stay clean
npx tsc --noEmit   # after a build/dev run (LayoutProps types live in .next/)
```
- **No deploy setup** (no Dockerfile, CI, or config). Deploy with `next build` + `next start`; not a static export (API routes need a server).
- **Before hosting publicly,** add auth or rate limiting to all `/api/*` routes. There's no login, so anyone could spend the API key.
- **Never commit `.next/`.** CI (if added): `.github/workflows/` running lint, tsc, build.

## Rules the code depends on
**Data layer:** only `useExpenses` and `useDailyBudget` touch `localStorage`. For `useExpenses`:
- Module-level store via `useSyncExternalStore`: shared; writes notify subscribers; `storage` event syncs tabs.
  - `getSnapshot` must return a stable reference (cached on the raw string); never build a new array per read.
  - Server snapshot is `null` → `isLoading: true`; pages must render a loading state.
- `getExpensesSnapshot()` reads the store outside React (assistant tools).
- Storage is written **only on mutations**, never on load, so opening a page can't overwrite corrupt data. No "save on every change" effect.

**Data shape**
- `Expense`: `id`, `date` (`yyyy-MM-dd`), `amount` (number, USD), `category`, `description`, `createdAt`/`updatedAt` (ISO).
- **No schema version or migration.** Renaming/retyping a field breaks stored data. Add optional fields, or migrate in `readExpenses`.
- `description` doubles as the vendor name.

**Dates**
- Use `parseISO(expense.date)`, never `new Date(expense.date)` (parses as UTC, shifts the day in western timezones).
- Use date-fns for all date math.

**Categories**
- Closed union: `Food | Transportation | Entertainment | Shopping | Bills | Other`.
- To add one, update `ExpenseCategory` **and** `EXPENSE_CATEGORIES`, `CATEGORY_COLORS`, `CATEGORY_ICONS` (tsc flags misses).
- Never hard-code category colors or icons.

**Reuse**
- Money uses `formatCurrency`; never `toFixed` in UI text.
- Check `filters.ts` and `stats.ts` before writing a helper.
- Known duplication, don't add more: `top-categories` date filtering; two CSV exporters.

**Validation (`ExpenseForm`)**
- Date required; amount > 0 matching `/^\d+\.?\d{0,2}$/`; description required.
- Future dates: blocked by the date input's `max`; quick add clamps to today.
- The parent resets the form by changing its `key`.

**Lint**
- No `any` and no `eslint-disable`.
- For Recharts callbacks, use `PieLabelRenderProps` / `TooltipContentProps`.
- Never call setState from an effect to mirror props.

## UI conventions
- **Styling:** Tailwind utilities inline; no CSS modules or component library.
- **Page shell:** `min-h-screen bg-gray-50`; sticky white header with the 💸 logo (links to `/`) and "Back to Dashboard"; content in `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8`; copy an existing page's spinner.
- **Cards:** `bg-white rounded-lg shadow-sm p-6`; accent `from-blue-600 to-purple-600`.
- **Empty states:** handle both "no expenses" and "none in the selected range".
- **Charts:** explicit-height container around `ResponsiveContainer`; tooltips use `formatCurrency`.
- **Dark mode:** unsupported; no `dark:` variants.

## Git and workflow
- **Branches:** `main` integrates; features go on `feature/<name>`, often in sibling worktrees (`docs/dev/worktrees.md`).
- **Slash commands** (`.claude/commands/`): `/parallel-work`, `/integrate-parallel-work` (worktrees), `/document-feature <name>`.
- **Commits:** imperative ("Implement Top Vendors analytics page"); merges "Merge feature/<name>: <summary>".
- **When to commit or push:** only when asked.
- **Don't commit** `*.work.txt`, `INTEGRATION-REPORT.md`, mockup PNGs.
- **Move files** via `git mv`.
- **`AGENTS.md`:** `next dev` may rewrite it. Leave it intact; keep the `@AGENTS.md` import at the top.

## Definition of done
1. `npm run build`, `npx tsc --noEmit`, and `npm run lint` are clean.
2. The changed route loads in `npm run dev`, with data and empty states checked.
3. Stored data still loads (no breaking `Expense` change without a migration).
4. Code is in the right folder and follows the import direction; helpers are reused.
5. Any new screen is reachable from `/` on desktop and mobile.
