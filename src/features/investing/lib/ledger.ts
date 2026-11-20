import type { Holding, InvestmentAccount, Trade } from '@/features/investing/lib/types';

/*
 * Turns trades into positions, using the average-cost method: a buy adds shares and their
 * cost (price × shares + fees); a sell removes shares at the position's average cost, and the
 * difference from the sale proceeds (price × shares − fees) is the realized gain. Dividends are
 * income and don't change positions. Trades are applied in date order (then entry order).
 */

export interface Position {
  symbol: string;
  account: InvestmentAccount;
  shares: number;
  /** Remaining cost; null when any shares came from a buy without a price. */
  cost: number | null;
}

export interface Ledger {
  positions: Position[];
  /** Realized gain per sell trade id (null when the cost wasn't known). */
  realized: Record<string, number | null>;
  realizedTotal: number;
  dividendsTotal: number;
  /** The first trade that sells more than was held at that date, if any. */
  problem: { tradeId: string; message: string } | null;
}

const EPS = 1e-9;
const key = (symbol: string, account: string) => `${symbol}|${account}`;
const round = (n: number) => Math.round(n * 100) / 100;

export const sortTrades = (trades: Trade[]) =>
  [...trades].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));

export function computeLedger(trades: Trade[]): Ledger {
  const open = new Map<string, Position>();
  const realized: Record<string, number | null> = {};
  let realizedTotal = 0;
  let dividendsTotal = 0;
  let problem: Ledger['problem'] = null;

  for (const t of sortTrades(trades)) {
    if (t.type === 'dividend') {
      dividendsTotal += t.amount ?? 0;
      continue;
    }
    const k = key(t.symbol, t.account);
    const p = open.get(k) ?? { symbol: t.symbol, account: t.account, shares: 0, cost: 0 };
    const shares = t.shares ?? 0;
    if (t.type === 'buy') {
      p.shares += shares;
      p.cost = p.cost === null || t.price === null ? null : p.cost + shares * t.price + t.fees;
      open.set(k, p);
      continue;
    }
    // Sell
    if (shares > p.shares + EPS) {
      problem ??= {
        tradeId: t.id,
        message: `On ${t.date} this sells ${shares} ${t.symbol} in ${t.account}, but only ${round(p.shares * 1e6) / 1e6} were held then.`,
      };
      continue;
    }
    const avg = p.cost === null || p.shares === 0 ? null : p.cost / p.shares;
    const gain = avg === null || t.price === null ? null : shares * t.price - t.fees - avg * shares;
    realized[t.id] = gain === null ? null : round(gain);
    if (gain !== null) realizedTotal += gain;
    p.shares -= shares;
    p.cost = avg === null ? null : p.cost! - avg * shares;
    if (p.shares <= EPS) open.delete(k);
    else open.set(k, p);
  }

  return {
    positions: [...open.values()].map((p) => ({ ...p, cost: p.cost === null ? null : round(p.cost) })),
    realized,
    realizedTotal: round(realizedTotal),
    dividendsTotal: round(dividendsTotal),
    problem,
  };
}

/** Open positions in the shape the portfolio summary uses. */
export const toHoldings = (ledger: Ledger): Holding[] =>
  ledger.positions.map((p) => ({ id: key(p.symbol, p.account), symbol: p.symbol, shares: p.shares, costBasis: p.cost, account: p.account }));

/** Shares of a symbol held in an account just before `date` ends, for the trade form's hint. */
export function sharesHeld(trades: Trade[], symbol: string, account: InvestmentAccount, date: string, excludeId?: string) {
  const ledger = computeLedger(trades.filter((t) => t.date <= date && t.id !== excludeId));
  return ledger.positions.find((p) => p.symbol === symbol && p.account === account)?.shares ?? 0;
}
