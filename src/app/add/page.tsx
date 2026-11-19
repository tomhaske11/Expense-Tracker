'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useExpenses } from '@/features/expenses/hooks/useExpenses';
import { ExpenseFormData } from '@/features/expenses/types';
import ExpenseForm from '@/features/expenses/components/ExpenseForm';
import AppShell, { PageTitle } from '@/app/_components/AppShell';
import { BankIcon, CheckCircleIcon, ChevronIcon } from '@/lib/icons';
import { formatCurrency } from '@/lib/utils';

/** Add: the one place to record spending — typed, a receipt photo, by hand, or imported in bulk. */
export default function AddPage() {
  const { isLoading, addExpense } = useExpenses();
  const [added, setAdded] = useState<{ count: number; last: ExpenseFormData } | null>(null);

  const add = (data: ExpenseFormData) => {
    addExpense(data);
    setAdded((prev) => ({ count: (prev?.count ?? 0) + 1, last: data }));
  };

  return (
    <AppShell loading={isLoading}>
      <div className="max-w-2xl mx-auto">
        <PageTitle title="Add expenses" subtitle="Type it, snap a receipt, or fill in the form." />

        {added && (
          <div aria-live="polite" className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 text-sm">
            <p className="flex items-center gap-2 text-ink-soft">
              <CheckCircleIcon className="w-4 h-4 text-accent shrink-0" />
              Added {added.last.description} ({formatCurrency(Number(added.last.amount))})
              {added.count > 1 ? `, ${added.count} so far` : ''}.
            </p>
            <Link href="/transactions" className="text-accent hover:text-accent-strong whitespace-nowrap">
              View transactions
            </Link>
          </div>
        )}

        <section className="bg-panel border border-line rounded-lg p-6">
          {/* A new key clears the form after each add so the next one starts fresh. */}
          <ExpenseForm key={added?.count ?? 0} onSubmit={add} submitLabel="Add expense" />
        </section>

        <Link
          href="/import"
          className="mt-4 flex items-center gap-4 bg-panel border border-line rounded-lg p-6 hover:border-accent transition-colors group"
        >
          <span className="w-11 h-11 shrink-0 rounded-lg flex items-center justify-center bg-accent/10 text-accent">
            <BankIcon className="w-6 h-6" />
          </span>
          <span className="flex-1">
            <span className="block font-semibold text-ink">Import many at once</span>
            <span className="block text-sm text-ink-muted">Connect a bank or upload a statement (CSV, OFX or PDF).</span>
          </span>
          <ChevronIcon className="w-5 h-5 -rotate-90 text-ink-muted group-hover:text-accent" />
        </Link>
      </div>
    </AppShell>
  );
}
