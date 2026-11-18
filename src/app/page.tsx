'use client';

import { ReactNode, useState } from 'react';
import { useExpenses } from '@/features/expenses/hooks/useExpenses';
import { Expense, ExpenseFormData } from '@/features/expenses/types';
import { exportToCSV } from '@/features/export/lib/quickCsv';
import ExpenseForm from '@/features/expenses/components/ExpenseForm';
import ExpenseList from '@/features/expenses/components/ExpenseList';
import Dashboard from '@/features/analytics/components/Dashboard';
import CleanupPanel from '@/features/assistant/components/CleanupPanel';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppHeader from '@/app/_components/AppHeader';
import { ChatIcon, DashboardIcon, DownloadIcon, EditIcon, ListIcon, PieIcon, PlusIcon, StoreIcon } from '@/lib/icons';

type Tab = 'dashboard' | 'expenses' | 'add' | 'vendors';

export default function Home() {
  const { expenses, isLoading, addExpense, updateExpense, deleteExpense } = useExpenses();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const router = useRouter();

  const handleAddExpense = (formData: ExpenseFormData) => {
    addExpense(formData);
    setActiveTab('expenses');
  };

  const handleUpdateExpense = (formData: ExpenseFormData) => {
    if (editingExpense) {
      updateExpense(editingExpense.id, formData);
      setEditingExpense(null);
      setActiveTab('expenses');
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setActiveTab('add');
  };

  const handleCancelEdit = () => {
    setEditingExpense(null);
    setActiveTab('expenses');
  };

  const handleExport = () => {
    exportToCSV(expenses);
  };

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
      <AppHeader
        below={
          <nav className="flex gap-1 -mb-px">
            <TabButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<DashboardIcon />}>
              Dashboard
            </TabButton>
            <TabButton
              active={activeTab === 'expenses'}
              onClick={() => {
                setActiveTab('expenses');
                setEditingExpense(null);
              }}
              icon={<ListIcon />}
            >
              Expenses
            </TabButton>
            <TabButton
              active={activeTab === 'add'}
              onClick={() => {
                setActiveTab('add');
                setEditingExpense(null);
              }}
              icon={editingExpense ? <EditIcon /> : <PlusIcon />}
            >
              {editingExpense ? 'Edit' : 'Add'}
            </TabButton>
            <TabButton active={activeTab === 'vendors'} onClick={() => router.push('/top-vendors')} icon={<StoreIcon />}>
              Vendors
            </TabButton>
          </nav>
        }
      >
        <div className="flex items-center gap-2">
          {expenses.length > 0 && (
            <>
              <Link
                href="/assistant"
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-accent text-accent-ink rounded-full hover:bg-accent-strong transition-colors text-sm font-medium"
              >
                <ChatIcon className="w-4 h-4" />
                Ask
              </Link>
              <Link href="/top-categories" className={HEADER_LINK}>
                <DashboardIcon className="w-4 h-4" />
                Top Categories
              </Link>
              <Link href="/monthly-insights" className={HEADER_LINK}>
                <PieIcon className="w-4 h-4" />
                Insights
              </Link>
              <button type="button" onClick={handleExport} className={HEADER_LINK}>
                <DownloadIcon className="w-4 h-4" />
                Export CSV
              </button>
            </>
          )}
        </div>
      </AppHeader>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && <Dashboard expenses={expenses} />}

        {activeTab === 'expenses' && (
          <>
            {expenses.length > 0 && <CleanupPanel />}
            <ExpenseList
              expenses={expenses}
              onEdit={handleEditExpense}
              onDelete={deleteExpense}
            />
          </>
        )}

        {activeTab === 'add' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-panel rounded-lg p-6 border border-line">
              <h2 className="text-xl font-semibold text-ink mb-6">
                {editingExpense ? 'Edit Expense' : 'Add New Expense'}
              </h2>
              <ExpenseForm
                key={editingExpense?.id ?? 'new'}
                onSubmit={editingExpense ? handleUpdateExpense : handleAddExpense}
                onCancel={editingExpense ? handleCancelEdit : undefined}
                initialData={editingExpense || undefined}
                submitLabel={editingExpense ? 'Update Expense' : 'Add Expense'}
              />
            </div>
          </div>
        )}
      </main>

      {/* Mobile Action Buttons */}
      {expenses.length > 0 && (
        <div className="sm:hidden fixed bottom-6 right-6 flex flex-col items-end gap-3">
          <Link
            href="/assistant"
            className="flex items-center gap-2 px-5 py-3 bg-accent text-accent-ink rounded-full shadow-lg shadow-black/50 hover:bg-accent-strong transition-colors font-medium"
          >
            <ChatIcon />
            Ask
          </Link>
          <Link href="/top-categories" className={FLOATING_LINK}>
            <DashboardIcon />
            Analytics
          </Link>
          <Link href="/monthly-insights" className={FLOATING_LINK}>
            <PieIcon />
            Insights
          </Link>
          <button type="button" onClick={handleExport} className={FLOATING_LINK}>
            <DownloadIcon />
            Export
          </button>
        </div>
      )}
    </div>
  );
}

const HEADER_LINK =
  'hidden sm:flex items-center gap-2 px-3 py-2 text-sm text-ink-soft rounded-full border border-line hover:border-accent hover:text-accent transition-colors';
const FLOATING_LINK =
  'flex items-center gap-2 px-5 py-3 bg-panel-raised text-ink border border-line rounded-full shadow-lg shadow-black/50 hover:border-accent hover:text-accent transition-colors font-medium';

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  icon: ReactNode;
}

function TabButton({ active, onClick, children, icon }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
        active
          ? 'border-accent text-accent'
          : 'border-transparent text-ink-muted hover:text-ink hover:border-line'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{children}</span>
    </button>
  );
}
