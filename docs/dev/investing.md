# Investing (Home)

What's on Home (`/`; `/invest` redirects there), where the data comes from, and how to switch to
real market data.

## Screens

| Piece | Component | Data |
|---|---|---|
| Markets: 4 index tiles + chart, 1M / 3M / YTD / 1Y | `MarketOverview` | `/api/markets/prices` |
| Your portfolio: value, today, total gain, by account, positions | `PortfolioPanel`, `HoldingForm` | `public.holdings` + prices |
| Watchlist | `Watchlist` | `public.watchlist` + prices |
| News, "Your stocks" (top 5 holdings, then watchlist) or "Market" | `NewsFeed` | `/api/markets/news`, `/api/markets/news/notes` |

Indexes are shown through the funds that track them (SPY, QQQ, DIA, IWM): index values need
a separate data licence, fund prices don't. The UI says so in the disclaimer.

## Data flow

```
browser ──symbols only──▶ /api/markets/prices ─▶ getPrices ─▶ cache (Redis) ─▶ provider.dailyCloses
                          /api/markets/news   ─▶ getNews   ─▶ cache (Redis) ─▶ provider.news
                          /api/markets/news/notes ─▶ getNews (same articles) ─▶ cache ─▶ Claude
holdings, watchlist ◀──── Supabase (RLS: own rows only)
```

- **Only ticker symbols leave the browser** for market data. Share counts and costs stay in
  Supabase and are combined with prices in the browser (`summarizePortfolio`).
- **Caching** (`lib/cache.ts`): one year of daily closes per symbol, fresh for 5 minutes, kept
  3 days as a fallback; news fresh for 15 minutes. Shared across all users, so provider calls
  don't grow with users. If the provider fails or rate-limits, the stale copy is served.
- **Quotes** are derived from the closes: last close vs the one before (`toSeries`).
- **Claude notes** run only on a cache miss, keyed by the set of article ids, so one call
  serves everyone who sees the same headlines. The server looks the articles up itself; the
  browser never sends text to Claude here. Notes count against the Claude rate limits only
  when Claude actually runs.
- **Guardrail:** the notes prompt forbids buy/sell/hold advice and price predictions.

## Ask: market tools

The assistant (`/assistant`) has three market tools, run in the browser like its spending tools:

| Tool | Source | Returns |
|---|---|---|
| `get_market_trend` | `POST /api/markets/analysis` `{kind:'trend'}` → `computeTrend` | price, returns (1d–1y, YTD), 20/50/200-day averages and distance, RSI(14), 52-week range, volatility, 1-year drawdown, support/resistance, trend label, recent crossings |
| `test_market_pattern` | `{kind:'pattern'}` → `testPattern` | for a condition (crosses of the 50/200-day, golden/death cross, RSI 30/70, 10% off the high, new high, 5% drop in a week, crossing a price level): count, median/average return, % positive, best/worst over the horizon, vs the any-day baseline; recent occurrences; whether one is in progress |
| `get_my_holdings` | the user's `holdings` rows | ticker, shares, account, total cost |

- History: up to ~5 years of daily closes per symbol (`getLongHistory`, cached an hour). Massive's
  free plan has 2 years, so pattern tests have smaller samples there; results state the range.
- Events closer together than the horizon count once, so one long move isn't counted many times.
- Support/resistance: swing highs/lows (lower/higher than 5 days on each side) in the past year,
  grouped within 1.5%; the two nearest below and above the price.
- The prompt (`assistant/server/streamAssistantTurn.ts`) has Claude report base rates with sample
  sizes, compare with the baseline, describe scenarios only conditionally, never give targets or
  buy/sell/hold advice, flag sandbox data, and end with "This is information, not investment advice."
- `technicals.ts` is pure; check it with Node's type stripping (no test framework yet).

## Providers (`server/market/`)

`MARKET_DATA_PROVIDER` picks one; by default `massive` when `MASSIVE_API_KEY` is set, else `mock`.

| Provider | Notes |
|---|---|
| `mock` | Repeatable random walks and template headlines; UI shows "sandbox data". A symbol starting `ZZ` is "not found" (for tests). |
| `massive` | [Massive](https://massive.com) (formerly Polygon.io). Daily bars `/v2/aggs/ticker/{t}/range/1/day/…`, news `/v2/reference/news`. Free plan: end of day, 5 requests/min (first loads may show "Unavailable" for some tiles). Starter $29/mo: 15-minute delayed, no request cap. Set `MARKET_DATA_FRESHNESS` to match. |

Showing market data to the public generally needs a business/redistribution licence from
the provider, beyond the individual plans. Settle this before launch (roadmap).

To add a provider: implement `MarketDataProvider` (`dailyCloses`, `news`), register it in
`server/market/index.ts`. Routes, caching and UI don't change.

## Schema

`supabase/migrations/20261120120000_investing.sql`: `holdings` (symbol, shares, optional total
`cost_basis`, `account` in Brokerage / 401(k) / IRA / Roth IRA / HSA / Other) and `watchlist`
(user, symbol). Both RLS-limited to the owner; both deleted with the account. Not yet included
in backups (roadmap).

## Next steps

Linking brokerage and 401(k) accounts (Plaid Investments), holdings file upload, net worth
over time, Claude portfolio insights, and a morning push brief. See `docs/ROADMAP.md`.
