import { formatCurrency } from '@/lib/utils';
import type { Holding, InvestmentAccount, PriceSeries } from '@/features/investing/lib/types';

export interface Position {
  holding: Holding;
  /** Null when the symbol couldn't be priced. */
  price: number | null;
  value: number | null;
  dayChange: number | null;
  /** Value minus cost basis, when both are known. */
  gain: number | null;
  gainPercent: number | null;
  /** Share of the priced portfolio, 0-100. */
  weight: number;
}

export interface PortfolioSummary {
  positions: Position[];
  value: number;
  dayChange: number;
  /** Relative to yesterday's value of today's holdings. */
  dayChangePercent: number;
  /** Over positions that have a cost basis. */
  gain: number | null;
  gainPercent: number | null;
  byAccount: { account: InvestmentAccount; value: number; percent: number }[];
  /** Symbols that couldn't be priced. */
  unpriced: string[];
}

/** Value, today's change, gain and account split for a set of holdings at the given prices. */
export function summarizePortfolio(holdings: Holding[], prices: Record<string, PriceSeries | null | undefined>): PortfolioSummary {
  const raw = holdings.map((holding) => {
    const quote = prices[holding.symbol]?.quote;
    if (!quote) return { holding, price: null, value: null, dayChange: null, gain: null, gainPercent: null };
    const value = quote.price * holding.shares;
    const gain = holding.costBasis !== null ? value - holding.costBasis : null;
    return {
      holding,
      price: quote.price,
      value,
      dayChange: quote.change * holding.shares,
      gain,
      gainPercent: gain !== null && holding.costBasis ? (gain / holding.costBasis) * 100 : null,
    };
  });

  const value = raw.reduce((sum, p) => sum + (p.value ?? 0), 0);
  const dayChange = raw.reduce((sum, p) => sum + (p.dayChange ?? 0), 0);
  const withBasis = raw.filter((p) => p.gain !== null);
  const basis = withBasis.reduce((sum, p) => sum + (p.holding.costBasis ?? 0), 0);
  const gain = withBasis.length ? withBasis.reduce((sum, p) => sum + (p.gain ?? 0), 0) : null;

  const accounts = new Map<InvestmentAccount, number>();
  for (const p of raw) if (p.value !== null) accounts.set(p.holding.account, (accounts.get(p.holding.account) ?? 0) + p.value);

  return {
    positions: raw
      .map((p) => ({ ...p, weight: value > 0 && p.value !== null ? (p.value / value) * 100 : 0 }))
      .sort((a, b) => (b.value ?? -1) - (a.value ?? -1)),
    value,
    dayChange,
    dayChangePercent: value - dayChange > 0 ? (dayChange / (value - dayChange)) * 100 : 0,
    gain,
    gainPercent: gain !== null && basis > 0 ? (gain / basis) * 100 : null,
    byAccount: [...accounts]
      .map(([account, v]) => ({ account, value: v, percent: value > 0 ? (v / value) * 100 : 0 }))
      .sort((a, b) => b.value - a.value),
    unpriced: raw.filter((p) => p.price === null).map((p) => p.holding.symbol),
  };
}

/** "+1.23%" / "−0.45%" (a real minus sign), for change figures that should never read as color alone. */
export function formatPercent(value: number, digits = 2) {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${Math.abs(value).toFixed(digits)}%`;
}

/** "+$12.34" / "−$5.00", for gains and changes. */
export function formatSignedCurrency(value: number) {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${formatCurrency(Math.abs(value))}`;
}

/** A share of a whole, "42%" or "4.2%". */
export const formatShare = (percent: number, digits = 0) => `${percent.toFixed(digits)}%`;
