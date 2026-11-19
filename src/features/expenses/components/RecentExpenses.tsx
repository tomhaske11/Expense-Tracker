import Link from 'next/link';
import { Expense } from '@/features/expenses/types';
import CategoryIcon from '@/features/expenses/components/CategoryIcon';
import { formatCurrency, formatDate } from '@/lib/utils';

/** The latest few expenses with a link to the full list. Read-only: editing lives in Transactions. */
export default function RecentExpenses({ expenses, limit = 5 }: { expenses: Expense[]; limit?: number }) {
  const recent = [...expenses]
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);

  return (
    <section className="bg-panel border border-line rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-ink">Recent transactions</h2>
        <Link href="/transactions" className="text-sm text-accent hover:text-accent-strong">
          See all {expenses.length}
        </Link>
      </div>
      <ul className="divide-y divide-line">
        {recent.map((e) => (
          <li key={e.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <CategoryIcon category={e.category} className="w-5 h-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-ink truncate">{e.description}</p>
              <p className="text-xs text-ink-muted">
                {e.category} · {formatDate(e.date)}
              </p>
            </div>
            <p className="font-semibold text-ink tabular-nums">{formatCurrency(e.amount)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
