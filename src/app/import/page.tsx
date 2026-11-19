'use client';

import Link from 'next/link';
import { useExpenses } from '@/features/expenses/hooks/useExpenses';
import ImportCenter from '@/features/imports/components/ImportCenter';
import AppShell, { PageTitle } from '@/app/_components/AppShell';
import { ArrowLeftIcon } from '@/lib/icons';

/** Part of Add: bring in many transactions from a bank or a statement file. */
export default function ImportPage() {
  // Wait for stored expenses: the review dedupes against them.
  const { isLoading } = useExpenses();

  return (
    <AppShell loading={isLoading}>
      <Link href="/add" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink mb-4">
        <ArrowLeftIcon className="w-4 h-4" />
        Add expenses
      </Link>
      <PageTitle
        title="Import transactions"
        subtitle="Sync a connected bank or upload a statement. You review everything before it's saved."
      />
      <ImportCenter />
    </AppShell>
  );
}
