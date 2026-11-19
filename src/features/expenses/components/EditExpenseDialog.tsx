'use client';

import { useEffect } from 'react';
import { Expense, ExpenseFormData } from '@/features/expenses/types';
import ExpenseForm from '@/features/expenses/components/ExpenseForm';
import { CloseIcon } from '@/lib/icons';

interface EditExpenseDialogProps {
  expense: Expense;
  onSave: (data: ExpenseFormData) => void;
  onClose: () => void;
}

/** Edit one expense in place, over the list, so the user keeps their spot and filters. */
export default function EditExpenseDialog({ expense, onSave, onClose }: EditExpenseDialogProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-30 bg-black/70 flex items-end sm:items-center justify-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-expense-title"
        className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-panel border border-line rounded-t-2xl sm:rounded-lg p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 id="edit-expense-title" className="text-xl font-semibold text-ink">
            Edit expense
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 text-ink-muted hover:text-ink">
            <CloseIcon />
          </button>
        </div>
        <ExpenseForm
          key={expense.id}
          initialData={expense}
          onSubmit={onSave}
          onCancel={onClose}
          submitLabel="Save changes"
        />
      </div>
    </div>
  );
}
