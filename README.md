# expenseAI

A personal expense tracker with Claude built in: a dark, black-and-teal web app on Next.js 16, React 19,
TypeScript and Tailwind CSS, with accounts and data in Supabase. Live at https://expenseai-omega.vercel.app.

## How the app is organized

Each place in the app answers one question:

| Destination | Answers | What's there |
|---|---|---|
| **Home** (`/`) | How are my investments doing? | Index trends (S&P 500, Nasdaq-100, Dow, Russell 2000), your holdings by account (brokerage, 401(k), IRA), a watchlist, and news with Claude's "why it matters" notes |
| **Transactions** (`/transactions`) | What did I buy, sell and earn? | Your buys, sells and dividends by account, with realized gains (average cost); holdings on Home are calculated from these |
| **Spending** (`/spending`) | Where does my money go over time? | One period picker (opens on this month) and a Category / Vendor / Month switch |
| **Ask** (`/assistant`) | Answer a question about my money | Chat with Claude about your expenses, your holdings and market trends (moving averages, RSI, support and resistance, and what has historically followed a signal); spending edits need your approval |
| **＋ Add** (`/add`, `/import`) | Record something | An expense (type it in plain words, scan a receipt, fill in the form, or import from a connected bank or a statement), or a trade |
| **Account** (`/account`) | Manage my account and data | Sign out, connected banks (link, disconnect), password, backup and restore, export (CSV, JSON, PDF), delete account |

On desktop these are in the header; on mobile there's a bottom tab bar with Add in the middle.

Categories: Food, Transportation, Entertainment, Shopping, Bills, Other.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase and Anthropic keys (see docs/dev/accounts.md)
npm run dev                  # http://localhost:3000
```

```bash
npm run build && npm start   # production build
npm run lint                 # must stay clean
npx tsc --noEmit             # type-check
```

## Project structure

Feature-first layout under `src/` (`CLAUDE.md` has the details and the rules):

```
src/
  app/            routes: /, transactions, spending, add, import, assistant, account, auth pages, api/*
  features/
    expenses/     core domain: types, the Supabase-backed store, filters, form, list
    analytics/    stats, Spending explorer
    export/       backup and restore, CSV / JSON / PDF export
    imports/      bank sync and statement upload
    investing/    markets, holdings, watchlist, news
    assistant/    "Ask your money" chat and clean-up
  integrations/   Anthropic and Supabase clients
  lib/            shared, domain-free helpers
supabase/         database migrations
docs/             dev/ and user/ documentation; ROADMAP.md
```

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md).

## License

This project is open source and available under the MIT License.
