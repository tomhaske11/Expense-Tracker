@AGENTS.md

# expenseAI — Project Guide

## 1. Application type
- **Multi-user web app** on Next.js (App Router), heading for an iPhone app via Capacitor.
- **Accounts and data:** Supabase. Users sign in with Supabase Auth; expenses, holdings, watchlist and bank connections live in Postgres. The browser queries Supabase directly, and row-level security (RLS) limits every query to the signed-in user's rows. Setup and schema: `docs/dev/accounts.md`.
- **Server:** API routes call Claude (`/api/quick-add`, `receipt`, `assistant`, `imports/*`, `markets/news/notes`), the bank provider (`/api/bank/*`), the market-data provider (`/api/markets/*`) or Supabase admin (`/api/account`).
- **Rendering:** all pages are `'use client'` and prerendered static, which suits bundling them into the native app.

## 2. Main features (`src/features/`)
| Feature | Does | Routes |
|---|---|---|
| `expenses/` (core) | Data model, the Supabase-backed store, CRUD, search/filter, quick add (text or receipt photo), edit dialog, recent list | `/transactions`, `/add` |
| `analytics/` | All metrics (`stats.ts`); the Spending explorer (category / vendor / month over a period, opening on this month) | `/spending` |
| `export/` | Backup download and restore (versioned JSON), CSV/JSON/PDF export modal, one-time import of pre-accounts browser data | `/account` (Your data, and the one-time import offer) |
| `imports/` | Bank linking (sandbox provider today), bank sync and statement upload (CSV/OFX/PDF) → shared pipeline → review → save | `/import`; banks are linked and disconnected in `/account` (Connected banks) |
| `investing/` | Market overview (index funds), holdings entered by hand, watchlist, news with Claude's "why it matters" notes. Market data comes from a provider behind a shared cache | `/` (Home) |
| `assistant/` | "Ask your money" chat and one-click clean-up; tools run in the browser (spending tools on the cached expenses; market tools call `/api/markets/analysis`); edits are proposals the user approves | `/assistant` (Ask), clean-up on `/transactions` |

Account pages live in `src/app`: `/login`, `/signup`, `/forgot-password`, `/auth/confirm` (email-link route), `/account` (sign out, connected banks, your data, change password, delete account), `/account/password`.

## 3. Tech stack (`package.json`)
- **Next.js 16.4.6** (Turbopack, `src/`). This is newer than most training data: read `node_modules/next/dist/docs/` before using an unfamiliar API. Middleware is `src/proxy.ts`.
- **React 19.2.** TypeScript 5 (`strict`); `@/*` maps to `./src/*`.
- **Tailwind CSS v4** via `@tailwindcss/postcss`. No `tailwind.config.js`; theme tokens are in `src/app/globals.css`.
- **Libraries:** Recharts 3, date-fns 4, jspdf + jspdf-autotable (PDF in the browser), lucide-react (icons, via `lib/icons.tsx`), `@supabase/supabase-js` + `@supabase/ssr`, `@anthropic-ai/sdk` (server only), zod.
- **Lint:** ESLint 9 flat config (next core-web-vitals + typescript).
- **Tests:** no test framework is installed yet. End-to-end checks so far were ad-hoc scripts outside the repo; adding Vitest + Playwright is a planned next step.

## 4. Code organization
Feature-first: routes are thin, logic lives in features, and domain-free helpers live in `lib/`.
```
src/
  app/                     ROUTES: one folder per URL; page.tsx composes feature components
    page.tsx (Home: investments), transactions/, spending/, add/, import/, assistant/
    login/, signup/, forgot-password/, auth/confirm/route.ts, account/
    api/*/route.ts         validate input, call feature server code
    _components/           AppShell (header nav, mobile tab bar, sync-error banner, loading state, PageTitle), Brand, AuthCard
  features/
    expenses/              CORE DOMAIN
      types.ts, constants.ts  Expense (+ source), categories (colors, icons)
      hooks/useExpenses.ts the Supabase-backed expense store + CRUD (see Rules)
      lib/filters.ts       date/category/search filters
      lib/quickAdd.ts, lib/receiptImage.ts; server/parseExpenseText.ts (Claude)
      components/          ExpenseForm, ExpenseList, EditExpenseDialog, QuickAddInput, CategoryIcon
    analytics/             AGGREGATION, CHARTS, COACH
      lib/stats.ts         all metrics
      components/          SpendingExplorer, CategoryBreakdown (donut + list), VendorCard
    export/
      lib/exportService.ts CSV / JSON / PDF; lib/backup.ts backup format + planRestore
      components/          ExportModal, BackupPanel, LocalDataImport
    imports/               BANK & STATEMENT IMPORT (docs/dev/bank-import.md)
      lib/pipeline.ts, statements.ts, protocol.ts; server/bank/ (BankProvider, mock, connectionStore)
      components/          ImportCenter (sync + upload + review), ImportReview, BankConnectionsPanel + ConnectBankDialog (Account)
    investing/             MARKETS & PORTFOLIO (docs/dev/investing.md)
      lib/types.ts, markets.ts (index funds, disclaimer), portfolio.ts (summarizePortfolio, formatPercent),
                           technicals.ts (moving averages, RSI, levels, computeTrend, testPattern), analysis.ts (request schemas)
      hooks/               useHoldings, useWatchlist (Supabase), useMarketData (usePrices, useNews, useNewsNotes)
      server/market/       MarketDataProvider, mock + Massive providers, cached getPrices/getNews; server/newsNotes.ts (Claude)
      components/          MarketOverview, PortfolioPanel, HoldingForm, Watchlist, NewsFeed, PriceChart, Sparkline, Change
    assistant/             CHAT AGENT: lib/ (tools, runTools, protocol, cleanup), hooks/useAssistantChat.ts (tool loop),
                           server/streamAssistantTurn.ts, components/ (AssistantChat, AssistantTranscript, ProposalCard, CleanupPanel)
  integrations/
    anthropic/             server-only Claude client, CLAUDE_MODEL ('claude-opus-5-5'), describeAnthropicError
    supabase/              env.ts, browser.ts (browser client), server.ts (requireUser, admin client)
  lib/                     SHARED, domain-free: utils.ts, icons.tsx, chartTheme.ts; server-only redis.ts (Upstash REST), rateLimit.ts, cache.ts (shared cache with stale fallback)
  proxy.ts                 Supabase session refresh + gate: pages → /login, /api/* → 401
supabase/migrations/       SQL schema (tables, RLS, grants, realtime)
public/                    static assets
docs/dev/, docs/user/      implementation docs (accounts, bank import, ...) and how-to guides
```
**Import direction:** `app → assistant → investing → analytics → export → imports → expenses → lib`. (`investing` doesn't use the expense features today.) Never import upward.
- `lib/` and `integrations/` import no feature. A helper that needs `Expense` belongs in a feature.
- `integrations/anthropic`, `getSupabaseAdmin()` and the bank layer are server-only (`import 'server-only'`); only `server/` folders and `src/app/api/` use them. Client code may only `import type` from the Anthropic SDK.
- The Supabase **browser** client (`integrations/supabase/browser.ts`) is used by the data-layer hooks (`useExpenses`, `useHoldings`, `useWatchlist`) and the account pages. Don't query Supabase from other components; add to a hook instead.
- Import across features by full path. Don't add barrel `index.ts` files.

**Where new code goes:**
- New metric: `analytics/lib/stats.ts`
- New filter: `expenses/lib/filters.ts`
- New table or column: a new file in `supabase/migrations/` (never edit an applied one) with RLS policies and grants, then the matching row mapping in the hook.
- New screen:
  1. Create `src/app/<name>/page.tsx`.
  2. Put its UI in the right feature's `components/`.
  3. Decide which destination it belongs to (see Navigation below). Prefer a view or section inside an existing destination; add a new one to `AppShell` only if it answers a question no destination does, and then on desktop and mobile both.
- Pages should not hold aggregation logic: it goes in `analytics/lib/stats.ts`, UI in a feature component.

## 5. External systems
- **Supabase** (Auth + Postgres). Env: `NEXT_PUBLIC_SUPABASE_URL` (bare project URL, no `/rest/v1`), `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (browser-safe), `SUPABASE_SECRET_KEY` (server only; bypasses RLS). See `.env.example` and `docs/dev/accounts.md`.
  - Clients pin `db: { schema: 'public' }` because the project's default exposed schema may differ.
  - Every API route starts with `requireUser(request)`, which accepts the session cookie (web) or `Authorization: Bearer <access token>` (native app).
  - `getSupabaseAdmin()` bypasses RLS: use it only for server-only tables and admin actions, always filtered by the verified user id.
- **Anthropic Claude API**, called from the server with `ANTHROPIC_API_KEY`. The key must never reach the browser.
  - All calls use server-side refusal fallbacks. Quick add, receipts, imports and news notes: `beta.messages.parse` with a zod schema, `effort: 'low'`. Assistant: `beta.messages.stream`, `effort: 'medium'`; the browser keeps the history, runs the tools and loops (max 10 steps).
  - User text, photos, assistant tool results and import descriptions are sent to Anthropic; the UI says so in each place. News notes send only headlines and summaries. Server code re-validates Claude's output (`sanitize`).
  - Claude never writes data directly: quick add prefills a form; `propose_changes` shows a card the user approves; imports are reviewed before saving.
  - Claude routes call `await limitClaudeRequest(request, user.id)`: per-user and app-wide limits, counted in Upstash Redis (`KV_REST_API_URL` / `KV_REST_API_TOKEN`) so they hold across Vercel instances; in memory when those aren't set. If Redis is unreachable in production, Claude features pause (503) rather than run unlimited.
- **Banks:** `BANK_PROVIDER` (`mock` only so far). Tokens are stored server-side in `bank_connections`, encrypted with `BANK_TOKEN_KEY` (required for live providers). Details: `docs/dev/bank-import.md`.
- **Market data:** `MARKET_DATA_PROVIDER` (`mock` or `massive`; default `massive` when `MASSIVE_API_KEY` is set, otherwise sandbox data labeled in the UI). Prices and news are cached in Redis (`lib/cache.ts`) and shared by all users; only ticker symbols leave the server, never holdings. Details: `docs/dev/investing.md`.
- **Investing guardrail:** Claude explains news, indicators and historical base rates; it never recommends buying, selling or holding a specific investment, never gives price targets, and never states that something will happen. Every market figure it cites comes from a tool (`technicals.ts`), not its own arithmetic. Keep the disclaimer on screens and in answers that discuss investing.
- **Exports** download through a Blob link. **Fonts** (`next/font/google`) are fetched at build time.

## 6. Build and deploy
```bash
npm run dev        # http://localhost:3000 (restart after changing .env.local)
npm run build      # production build (pages static, API routes dynamic)
npm start          # serve the build
npm run lint       # must stay clean
npx tsc --noEmit   # run after a build or dev run (route types are generated in .next/)
```
- **Target:** Vercel (app) + Supabase. Set the env vars from `.env.example` in Vercel, and add the deployed origin to Supabase Auth's Site URL and Redirect URLs.
- **If you add CI,** use `.github/workflows/` and run lint, tsc, build (and tests once they exist).
- **Never commit `.next/`, `.env.local` or `.data/`.**

## Rules the code depends on
**Data layer (`useExpenses`)**
- A module-level store read through `useSyncExternalStore`, shared by every caller.
  - It loads on the first subscriber; the snapshot is `null` (→ `isLoading: true`) until then. Pages must render a loading state while it's true.
  - `getSnapshot` must return a stable reference; only replace the array when data changes.
  - Mutations are optimistic: update the cache, persist in the background, and on failure roll back and set `syncError` (shown by `SyncErrorBanner` in the header). Keep that pattern for new mutations.
  - Realtime changes for the user's rows trigger a refetch, deferred while the user's own writes are in flight. Signing out (or another user signing in) clears the cache.
- `getExpensesSnapshot()` reads the cache outside React (assistant tools, imports).
- `importExpenses(records, 'merge' | 'replace')` is the bulk path (restores, imports, local-data import).
- Pre-accounts data in `localStorage` is only read for the one-time import offer (`readLocalExpenses`) and is never modified or deleted.

**Data shape**
- `Expense` fields: `id` (client-generated), `date` (`yyyy-MM-dd`), `amount` (number, USD), `category`, `description`, `createdAt` / `updatedAt` (ISO), optional `source` (`kind`, `externalId`, `connectionId`, `accountId`, `rawDescription`) on imported expenses. Keep `source` on edits; it's what stops re-imports.
- Database columns are snake_case (`created_at`, `user_id`); the hook maps them. `amount` is `numeric(12,2)`; convert with `Number()`.
- Changing the shape needs a new migration and a `BACKUP_VERSION` bump in `export/lib/backup.ts`.
- `description` doubles as the vendor name.

**Dates**
- Use `parseISO(expense.date)`, never `new Date(expense.date)`. The latter parses as UTC and shifts the day in western timezones.
- Use date-fns for all date math.

**Categories**
- Closed union: `Food | Transportation | Entertainment | Shopping | Bills | Other`. The database has the same check constraint.
- To add one, update `ExpenseCategory`, `EXPENSE_CATEGORIES`, `CATEGORY_COLORS`, `CATEGORY_ICONS` (tsc flags misses), and add a migration that updates the `expenses.category` check.
- Never hard-code category colors (a palette validated for the dark surface) or icons.

**Reuse**
- Money uses `formatCurrency`; never `toFixed` in UI text.
- Check `filters.ts` and `stats.ts` before writing a helper.
- One component per view: the category donut + list is `CategoryBreakdown`; export is `ExportModal` only.

**Validation (`ExpenseForm`)**
- Date required; amount > 0 matching `/^\d+\.?\d{0,2}$/`; description required.
- Future dates are blocked by the date input's `max`; quick add clamps them to today.
- The parent resets the form by changing its `key`.

**Lint**
- No `any` and no `eslint-disable`.
- For Recharts callbacks, use `PieLabelRenderProps` / `TooltipContentProps`.
- Never call setState from an effect to mirror props. Fetching in an effect is fine if state is set in the promise callback.
- Don't call impure functions like `Date.now()` during render; do it in effects or handlers.

## UI conventions
- **Theme:** dark only, black + teal. Use the tokens in `globals.css` (`bg-canvas`, `bg-panel`, `bg-panel-raised`, `border-line`, `text-ink` / `-soft` / `-muted` / `-faint`, `bg-accent` + `text-accent-ink`), never raw grays or blues. Inline Tailwind; no CSS modules or component library. No `dark:` variants and no light theme.
- **Page shell:** wrap signed-in pages in `<AppShell loading={isLoading}>` (header, nav, mobile tab bar, spinner) and start with `<PageTitle>`. Auth pages use `AuthCard`.
- **Cards:** `bg-panel border border-line rounded-lg p-6`, no shadows or gradients. Primary buttons are teal and `rounded-full`.
- **Empty states:** always handle both "no expenses" and "none in the selected range".
- **Icons:** import from `lib/icons.tsx` (themed lucide), never from lucide directly, and no emoji. Category icons via `<CategoryIcon>`.
- **Charts:** an explicit-height container around `ResponsiveContainer`; colors from `lib/chartTheme.ts`; tooltips use `formatCurrency`.

## Navigation (one place per job)
Each destination answers one question; don't put the same thing in two places.
| Destination | Question | Route |
|---|---|---|
| Home | How are my investments doing, and what's moving the market? | `/` |
| Transactions | What did I spend, and is it right? | `/transactions` |
| Spending | Where does my money go over time? | `/spending` (`?view=vendor` / `month`) |
| Ask | Answer a question about my money | `/assistant` |
| Add (action) | Record something | `/add`, `/import` |
| Account (profile icon) | Manage my account, connected banks and data | `/account` (`#banks`) |
- Desktop: links in the header plus a teal Add button. Mobile: bottom tab bar (Home, Transactions, ＋, Spending, Ask). Both come from `AppShell`.
- Old routes `/top-categories`, `/top-vendors`, `/monthly-insights`, `/invest` redirect (`next.config.ts`).

## Git and workflow
- **Branches:** `main` is the integration branch. Features go on `feature/<name>` branches, sometimes in sibling worktrees; see `docs/dev/worktrees.md`.
- **Slash commands** (`.claude/commands/`): `/parallel-work` sets up worktrees, `/integrate-parallel-work` merges them, `/document-feature <name>` generates docs.
- **Commit messages:** imperative ("Implement Top Vendors analytics page"). Merges: "Merge feature/<name>: <summary>".
- **When to commit or push:** only when asked.
- **Don't commit** scratch files (`*.work.txt`, `INTEGRATION-REPORT.md`, mockup PNGs; all gitignored).
- **Moving files:** use `git mv`.
- **`AGENTS.md`:** `next dev` may rewrite it. Leave it intact, and keep the `@AGENTS.md` import at the top of this file.

## Definition of done
1. `npm run build`, `npx tsc --noEmit`, and `npm run lint` are clean.
2. The changed route loads in `npm run dev` while signed in, with data and empty states checked.
3. Existing data still loads (no breaking `Expense` change without a migration).
4. Code is in the right folder and follows the import direction; helpers are reused.
5. Any new screen is reachable from `/` on desktop and mobile.
6. Anything that touches data respects RLS: no secret-key queries without a user-id filter.
