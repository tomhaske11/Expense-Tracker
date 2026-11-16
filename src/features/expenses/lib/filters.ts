import { endOfMonth, isWithinInterval, parseISO, startOfMonth, startOfYear, subDays } from 'date-fns';
import { DateRangeFilter, Expense, ExpenseCategory } from '@/features/expenses/types';

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

export function filterExpensesByDateRange(
  expenses: Expense[],
  dateRange: DateRangeFilter
): Expense[] {
  const now = new Date();

  switch (dateRange) {
    case 'last7days': {
      const startDate = subDays(now, 7);
      return expenses.filter((expense) => {
        const expenseDate = parseISO(expense.date);
        return expenseDate >= startDate;
      });
    }
    case 'last30days': {
      const startDate = subDays(now, 30);
      return expenses.filter((expense) => {
        const expenseDate = parseISO(expense.date);
        return expenseDate >= startDate;
      });
    }
    case 'thisMonth': {
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      return expenses.filter((expense) => {
        const expenseDate = parseISO(expense.date);
        return isWithinInterval(expenseDate, { start, end });
      });
    }
    case 'thisYear': {
      const startDate = startOfYear(now);
      return expenses.filter((expense) => {
        const expenseDate = parseISO(expense.date);
        return expenseDate >= startDate;
      });
    }
    case 'allTime':
    default:
      return expenses;
  }
}
