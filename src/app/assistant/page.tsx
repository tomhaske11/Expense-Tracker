'use client';

import { useExpenses } from '@/features/expenses/hooks/useExpenses';
import AssistantChat from '@/features/assistant/components/AssistantChat';
import AppHeader from '@/app/_components/AppHeader';

export default function AssistantPage() {
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          <AssistantChat expenses={expenses} />
        </div>
      </main>
    </div>
  );
}
