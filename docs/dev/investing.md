# Investing (Invest tab)

What's on `/invest` and Home's markets card, where the data comes from, and how to switch to
real market data.

## Screens

| Piece | Component | Data |
|---|---|---|
| Markets: 4 index tiles + chart, 1M / 3M / YTD / 1Y | `MarketOverview` | `/api/markets/prices` |
| Your portfolio: value, today, total gain, by account, positions | `PortfolioPanel`, `HoldingForm` | `public.holdings` + prices |
| Watchlist | `Watchlist` | `public.watchlist` + prices |
| News, "Your stocks" (top 5 holdings, then watchlist) or "Market" | `NewsFeed` | `/api/markets/news`, `/api/markets/news/notes` |
| Home's "Markets today" card | `MarketsBrief` | prices + news, no Claude |

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
