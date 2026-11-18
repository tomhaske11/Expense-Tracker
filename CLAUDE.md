@AGENTS.md

# expenseAI — Project Guide

## 1. Application type
- **Web app, mostly client-side:** single-user, Next.js App Router.
- **Data:** browser `localStorage` only; no database. Optional password gate (`APP_PASSWORD`).
- **Server:** POST routes call Claude: `/api/quick-add` (text), `/api/receipt` (photo), `/api/coach`, `/api/assistant`. None store data.
- **Rendering:** all pages `'use client'`, prerendered static.

## 2. Main features (`src/features/`)
| Feature | Does | Routes |
|---|---|---|
| `expenses/` (core) | Data model, storage, CRUD, search/filter, quick add (text or receipt) | `/` (Expenses, Add tabs) |
| `analytics/` | Summary, pie, category/vendor rankings, monthly insights (streak, daily budget, Claude coach) | `/` (Dashboard tab), `/top-categories`, `/top-vendors`, `/monthly-insights` |
| `export/` | Quick CSV from the header; modal with CSV/JSON/PDF, filters, and preview | header button, Dashboard banner |
| `assistant/` | Chat + one-click clean-up; browser-run tools; edits are approved proposals | `/assistant`, Expenses tab |

## 3. Tech stack (`package.json`)
- **Next.js 16.3.1** (Turbopack). Newer than training data: read `node_modules/next/dist/docs/` before unfamiliar APIs.
- **React 19.2**, TypeScript 5 `strict`, `@/*` → `./src/*`.
- **Tailwind CSS v4** via `@tailwindcss/postcss`; no `tailwind.config.js`, tokens in `globals.css` (`@theme inline`).
- **Libraries:** Recharts 3, date-fns 4, jspdf, lucide-react, `@anthropic-ai/sdk` (server only), zod.
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
    assistant/             CHAT AGENT: lib/ (tools.ts zod schemas, runTools.ts, protocol.ts, cleanup.ts),
      hooks/useAssistantChat.ts (tool loop), server/, components/ (AssistantTranscript is shared)
  integrations/anthropic/  server-only client, CLAUDE_MODEL ('claude-opus-5-5'), describeAnthropicError
  lib/                     SHARED, domain-free: utils.ts; server-only session.ts, rateLimit.ts
  proxy.ts                 if APP_PASSWORD: pages → /login, /api/* → 401
public/                    static assets
docs/                      dev docs, how-tos
```
**Import direction:** `app → assistant → analytics → export → expenses → lib`. Never import upward.
- `lib/` and `integrations/` import no feature; a helper needing `Expense` belongs in a feature.
- Only `server/` folders, `src/app/api/`, and `integrations/` may import `@/integrations/*` or the SDK. Mark those files `import 'server-only'`. Others may only `import type` from the SDK.
- Import across features by full path. Don't add barrel `index.ts` files.

**Where new code goes:**
- New metric: `analytics/lib/stats.ts`
- New filter: `expenses/lib/filters.ts`
- New screen:
  1. Create `src/app/<name>/page.tsx`.
  2. Put its UI in the right feature's `components/`.
  3. In `src/app/page.tsx` add a desktop header link (`hidden sm:flex`) **and** mobile floating button (`sm:hidden`).
- Pages hold no aggregation logic (`top-categories/page.tsx` still does; move it out when you touch it).

## 5. External systems
- **Anthropic Claude API** from the server, `ANTHROPIC_API_KEY` in `.env.local`. The key never reaches the browser.
  - All use refusal fallbacks. Quick add, receipts, coach: `beta.messages.parse` + zod, `effort: 'low'`.
  - Text, photos and assistant tool results go to Anthropic (the UI says so); the coach sends aggregates only. `sanitize` re-validates output.
  - Assistant: `beta.messages.stream`, `effort: 'medium'`; the browser keeps history, runs tools, loops (max 10).
  - Claude never writes to storage: quick add prefills a form; `propose_changes` shows a card the user approves.
- **Exports** download via a Blob link. **Fonts** (`next/font/google`) load at build time.
- **Adding one:** route in `src/app/api/<name>/`, client in `src/integrations/<name>/`, secrets in `.env.local`. Claude routes call `limitClaudeRequest`.

## 6. Build and deploy
```bash
npm run dev        # http://localhost:3000
npm run build      # production build (pages static, API routes dynamic)
npm start          # serve the build
npm run lint       # must stay clean
npx tsc --noEmit   # after a build/dev run (LayoutProps types live in .next/)
```
- **No deploy setup** (no Dockerfile/CI). Deploy with `next build` + `next start` (API routes need a server).
- **Before hosting publicly,** set `APP_PASSWORD`. Rate limits are in memory (`LIMITS`): run one process.
- **Never commit `.next/`.** CI (if added): `.github/workflows/` running lint, tsc, build.

## Rules the code depends on
**Data layer:** only `useExpenses` and `useDailyBudget` touch `localStorage`. For `useExpenses`:
- Module-level store via `useSyncExternalStore`: shared; writes notify subscribers; `storage` event syncs tabs.
  - `getSnapshot` must return a stable reference (cached on the raw string); never build a new array per read.
  - Server snapshot is `null` → `isLoading: true`; pages must render a loading state.
- `getExpensesSnapshot()` reads the store outside React (assistant tools).
- Storage is written **only on mutations**, never on load (so corrupt data isn't overwritten). No "save on change" effect.

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
- Never hard-code category colors (a validated dark palette) or icons.

**Reuse**
- Money uses `formatCurrency`; never `toFixed` in UI text.
- Check `filters.ts` and `stats.ts` before writing a helper.
- Known duplication, don't add more: `top-categories` date filtering; two CSV exporters.

**Validation (`ExpenseForm`)**
- Date required; amount > 0 matching `/^\d+\.?\d{0,2}$/`; description required.
- Future dates: blocked by the input's `max`; quick add clamps to today.
- The parent resets the form by changing its `key`.

**Lint**
- No `any` and no `eslint-disable`.
- For Recharts callbacks, use `PieLabelRenderProps` / `TooltipContentProps`.
- Never call setState from an effect to mirror props.

## UI conventions
- **Theme:** dark only, black + teal. Use `globals.css` tokens (`bg-canvas`/`panel`, `border-line`, `text-ink*`, `bg-accent` + `text-accent-ink`), never raw grays/blues. Inline Tailwind only.
- **Page shell:** `min-h-screen bg-canvas`, `<AppHeader />` (`app/_components/`), content `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8`, an existing page's spinner.
- **Cards:** `bg-panel border border-line rounded-lg p-6`, no shadows/gradients. Primary buttons: teal, `rounded-full`.
- **Empty states:** handle both "no expenses" and "none in the selected range".
- **Icons:** from `lib/icons.tsx` (themed lucide), never lucide directly or emoji; categories: `<CategoryIcon>`.
- **Charts:** fixed-height wrapper around `ResponsiveContainer`; colors from `lib/chartTheme.ts`; tooltips use `formatCurrency`.
- **No light theme:** no `dark:` variants.

## Git and workflow
- **Branches:** `main` integrates; features on `feature/<name>`, often in worktrees (`docs/dev/worktrees.md`).
- **Slash commands:** `/parallel-work`, `/integrate-parallel-work`, `/document-feature <name>`.
- **Commits:** imperative ("Implement Top Vendors page"); merges "Merge feature/<name>: <summary>".
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
