'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useExpenses } from '@/features/expenses/hooks/useExpenses';
import SpendingExplorer, { type SpendingView } from '@/features/analytics/components/SpendingExplorer';
import AppShell, { PageTitle } from '@/app/_components/AppShell';
import { ListIcon } from '@/lib/icons';

const VIEWS: SpendingView[] = ['category', 'vendor', 'month'];

/** Spending: where does my money go over time? */
export default function SpendingPage() {
  const { isLoading } = useExpenses();
  return (
    <AppShell loading={isLoading}>
      <PageTitle title="Spending" subtitle="Where your money goes, by category, vendor or month.">
        <Link href="/transactions" className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 rounded-full border border-line text-ink-soft hover:border-accent hover:text-accent transition-colors text-sm">
          <ListIcon className="w-4 h-4" />
          All transactions
        </Link>
      </PageTitle>
      {/* useSearchParams needs a Suspense boundary on a prerendered page. */}
      <Suspense>
        <Explorer />
      </Suspense>
    </AppShell>
  );
}

function Explorer() {
  const { expenses } = useExpenses();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const requested = params.get('view') as SpendingView | null;
  const view = requested && VIEWS.includes(requested) ? requested : 'category';

  if (expenses.length === 0) {
    return (
      <div className="bg-panel border border-line rounded-lg p-8 text-center">
        <p className="text-ink-muted mb-4">No expenses yet. Add some to see where your money goes.</p>
        <Link href="/add" className="px-5 py-2.5 bg-accent text-accent-ink rounded-full hover:bg-accent-strong font-medium">
          Add an expense
        </Link>
      </div>
    );
  }

  return (
    <SpendingExplorer
      expenses={expenses}
      view={view}
      onViewChange={(v) => router.replace(v === 'category' ? pathname : `${pathname}?view=${v}`, { scroll: false })}
    />
  );
}
