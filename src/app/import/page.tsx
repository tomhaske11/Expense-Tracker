'use client';

import { useExpenses } from '@/features/expenses/hooks/useExpenses';
import ImportCenter from '@/features/imports/components/ImportCenter';
import AppHeader from '@/app/_components/AppHeader';

export default function ImportPage() {
  // Wait for stored expenses: the review dedupes against them.
  const { isLoading } = useExpenses();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-ink-muted">Loading expenses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <AppHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-ink">Import transactions</h1>
          <p className="text-ink-muted">Connect a bank or upload a statement. You review everything before it&apos;s saved.</p>
        </div>
        <ImportCenter />
      </main>
    </div>
  );
}
