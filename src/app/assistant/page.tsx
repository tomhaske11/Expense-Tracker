'use client';

import { useExpenses } from '@/features/expenses/hooks/useExpenses';
import AssistantChat from '@/features/assistant/components/AssistantChat';
import AppShell from '@/app/_components/AppShell';

/** Ask: answer a question about my money. */
export default function AssistantPage() {
  const { expenses, isLoading } = useExpenses();

  return (
    <AppShell loading={isLoading}>
      <div className="max-w-4xl mx-auto">
        <AssistantChat expenses={expenses} />
      </div>
    </AppShell>
  );
}
