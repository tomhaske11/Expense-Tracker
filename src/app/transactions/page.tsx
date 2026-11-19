'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useExpenses } from '@/features/expenses/hooks/useExpenses';
import { Expense, ExpenseFormData } from '@/features/expenses/types';
import ExpenseList from '@/features/expenses/components/ExpenseList';
import EditExpenseDialog from '@/features/expenses/components/EditExpenseDialog';
import CleanupPanel from '@/features/assistant/components/CleanupPanel';
import AppShell, { PageTitle } from '@/app/_components/AppShell';

/** Transactions: what did I spend, and is it right? Search, edit, delete and clean up. */
export default function TransactionsPage() {
  const { expenses, isLoading, updateExpense, deleteExpense } = useExpenses();
  const [editing, setEditing] = useState<Expense | null>(null);
  const close = useCallback(() => setEditing(null), []);

  const save = (data: ExpenseFormData) => {
    if (editing) updateExpense(editing.id, data);
    setEditing(null);
  };

  return (
    <AppShell loading={isLoading}>
      <PageTitle
        title="Transactions"
        subtitle={expenses.length > 0 ? `${expenses.length} expenses in your account.` : undefined}
      />
      {expenses.length === 0 ? (
        <div className="bg-panel border border-line rounded-lg p-8 text-center">
          <p className="text-ink-muted mb-4">No expenses yet.</p>
          <Link href="/add" className="px-5 py-2.5 bg-accent text-accent-ink rounded-full hover:bg-accent-strong font-medium">
            Add an expense
          </Link>
        </div>
      ) : (
        <>
          <CleanupPanel />
          <ExpenseList expenses={expenses} onEdit={setEditing} onDelete={deleteExpense} />
        </>
      )}
      {editing && <EditExpenseDialog expense={editing} onSave={save} onClose={close} />}
    </AppShell>
  );
}
