'use client';

import { useExpenses } from '@/features/expenses/hooks/useExpenses';
import MonthlyInsights from '@/features/analytics/components/MonthlyInsights';
import AppHeader from '@/app/_components/AppHeader';

export default function MonthlyInsightsPage() {
  const { expenses, isLoading } = useExpenses();

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

      <main className="px-4 sm:px-6 lg:px-8 py-8">
        <MonthlyInsights expenses={expenses} />
      </main>
    </div>
  );
}
