'use client';

import Link from 'next/link';
import { useExpenses } from '@/features/expenses/hooks/useExpenses';
import MonthOverview from '@/features/analytics/components/MonthOverview';
import RecentExpenses from '@/features/expenses/components/RecentExpenses';
import LocalDataImport from '@/features/export/components/LocalDataImport';
import AppShell, { PageTitle } from '@/app/_components/AppShell';
import { BankIcon, PlusIcon } from '@/lib/icons';

/** Home: how am I doing this month? */
export default function HomePage() {
  const { expenses, isLoading } = useExpenses();

  return (
    <AppShell loading={isLoading}>
      <div className="space-y-6">
        <LocalDataImport expenses={expenses} />

        {expenses.length === 0 ? (
          <section className="bg-panel border border-line rounded-lg p-8 sm:p-12 text-center max-w-2xl mx-auto">
            <h1 className="text-2xl font-semibold text-ink mb-2">Welcome to expenseAI</h1>
            <p className="text-ink-muted mb-6">
              Add your first expense, or bring in a bank statement, and this page will show how your month is going.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/add"
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-accent text-accent-ink rounded-full hover:bg-accent-strong font-medium"
              >
                <PlusIcon className="w-4 h-4" />
                Add an expense
              </Link>
              <Link
                href="/import"
                className="flex items-center justify-center gap-2 px-5 py-2.5 border border-line text-ink-soft rounded-full hover:border-accent hover:text-accent font-medium"
              >
                <BankIcon className="w-4 h-4" />
                Import from bank or statement
              </Link>
            </div>
          </section>
        ) : (
          <>
            <PageTitle title="This month" subtitle="How your spending is tracking against your daily budget." />
            <MonthOverview expenses={expenses} />
            <RecentExpenses expenses={expenses} />
          </>
        )}
      </div>
    </AppShell>
  );
}
