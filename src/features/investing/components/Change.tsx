import { DownIcon, UpIcon } from '@/lib/icons';
import { formatPercent, formatSignedCurrency } from '@/features/investing/lib/portfolio';

/** A gain/loss figure: sign, arrow and color together, so it never relies on color alone. */
export default function Change({ amount, percent, className = '' }: { amount?: number; percent?: number; className?: string }) {
  const value = percent ?? amount ?? 0;
  const tone = value > 0 ? 'text-accent' : value < 0 ? 'text-red-400' : 'text-ink-muted';
  const Arrow = value < 0 ? DownIcon : UpIcon;
  return (
    <span className={`inline-flex items-center gap-0.5 tabular-nums ${tone} ${className}`}>
      {value !== 0 && <Arrow className="w-3.5 h-3.5 shrink-0" />}
      {amount !== undefined && formatSignedCurrency(amount)}
      {amount !== undefined && percent !== undefined && ' '}
      {percent !== undefined && (amount !== undefined ? `(${formatPercent(percent)})` : formatPercent(percent))}
    </span>
  );
}

/** Amber "sandbox" label shown while prices and news are generated, not real. */
export function SandboxBadge() {
  return (
    <span className="text-xs text-amber-300 border border-amber-300/40 rounded-full px-2 py-0.5" title="Generated sample data. Add a market-data key to see real prices and news.">
      sandbox data
    </span>
  );
}
