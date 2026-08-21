import { Expense, ExpenseCategory } from '@/types/expense';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, 'MMM dd, yyyy');
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function getCurrentMonthExpenses(expenses: Expense[]): Expense[] {
  const now = new Date();
  const start = startOfMonth(now);
  const end = endOfMonth(now);

  return expenses.filter((expense) => {
    const expenseDate = parseISO(expense.date);
    return isWithinInterval(expenseDate, { start, end });
  });
}

export function filterExpenses(
  expenses: Expense[],
  filters: {
    startDate: string | null;
    endDate: string | null;
    category: ExpenseCategory | 'All';
    searchQuery: string;
  }
): Expense[] {
  return expenses.filter((expense) => {
    // Date range filter
    if (filters.startDate || filters.endDate) {
      const expenseDate = parseISO(expense.date);
      if (filters.startDate && filters.endDate) {
        const start = parseISO(filters.startDate);
        const end = parseISO(filters.endDate);
        if (!isWithinInterval(expenseDate, { start, end })) {
          return false;
        }
      } else if (filters.startDate) {
        const start = parseISO(filters.startDate);
        if (expenseDate < start) {
          return false;
        }
      } else if (filters.endDate) {
        const end = parseISO(filters.endDate);
        if (expenseDate > end) {
          return false;
        }
      }
    }

    // Category filter
    if (filters.category !== 'All' && expense.category !== filters.category) {
      return false;
    }

    // Search query filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const matchesDescription = expense.description.toLowerCase().includes(query);
      const matchesCategory = expense.category.toLowerCase().includes(query);
      const matchesAmount = expense.amount.toString().includes(query);
      if (!matchesDescription && !matchesCategory && !matchesAmount) {
        return false;
      }
    }

    return true;
  });
}

export function calculateCategoryBreakdown(expenses: Expense[]) {
  const categoryTotals: Record<string, number> = {};
  let total = 0;

  expenses.forEach((expense) => {
    categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
    total += expense.amount;
  });

  return Object.entries(categoryTotals)
    .map(([category, amount]) => ({
      category: category as ExpenseCategory,
      amount,
      percentage: total > 0 ? (amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function exportToCSV(expenses: Expense[]): void {
  const headers = ['Date', 'Category', 'Description', 'Amount'];
  const rows = expenses.map((expense) => [
    formatDate(expense.date),
    expense.category,
    expense.description,
    expense.amount.toFixed(2),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `expenses-${format(new Date(), 'yyyy-MM-dd')}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
