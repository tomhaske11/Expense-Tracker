import { RANGES, type PriceRange } from '@/features/investing/lib/types';

/** 1M / 3M / YTD / 1Y segmented control. */
export default function RangePicker({ value, onChange }: { value: PriceRange; onChange: (range: PriceRange) => void }) {
  return (
    <div role="tablist" aria-label="Time range" className="inline-flex self-start sm:self-auto rounded-full border border-line p-0.5">
      {RANGES.map((r) => (
        <button
          key={r}
          type="button"
          role="tab"
          aria-selected={value === r}
          onClick={() => onChange(r)}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${value === r ? 'bg-accent text-accent-ink' : 'text-ink-muted hover:text-ink'}`}
        >
          {r}
        </button>
      ))}
    </div>
  );
}
