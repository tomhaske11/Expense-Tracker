import { Expense, ExpenseCategory, VendorStats, DateRangeFilter } from '@/types/expense';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, subDays, startOfYear } from 'date-fns';

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

export function calculateVendorStats(expenses: Expense[]): VendorStats[] {
  if (expenses.length === 0) return [];

  const totalSpending = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  // Group expenses by vendor (using description as vendor name)
  const vendorMap = new Map<string, Expense[]>();

  expenses.forEach((expense) => {
    const vendor = expense.description.trim() || 'Unknown';
    if (!vendorMap.has(vendor)) {
      vendorMap.set(vendor, []);
    }
    vendorMap.get(vendor)!.push(expense);
  });

  // Calculate stats for each vendor
  const vendorStats: VendorStats[] = [];

  vendorMap.forEach((vendorExpenses, vendor) => {
    const totalAmount = vendorExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const transactionCount = vendorExpenses.length;
    const averageAmount = totalAmount / transactionCount;

    // Calculate category breakdown
    const categoryBreakdown: Record<string, number> = {};
    vendorExpenses.forEach((expense) => {
      categoryBreakdown[expense.category] = (categoryBreakdown[expense.category] || 0) + expense.amount;
    });

    // Find top category
    let topCategory: ExpenseCategory = vendorExpenses[0].category;
    let maxAmount = 0;
    Object.entries(categoryBreakdown).forEach(([category, amount]) => {
      if (amount > maxAmount) {
        maxAmount = amount;
        topCategory = category as ExpenseCategory;
      }
    });

    vendorStats.push({
      vendor,
      totalAmount,
      percentage: totalSpending > 0 ? (totalAmount / totalSpending) * 100 : 0,
      transactionCount,
      averageAmount,
      topCategory,
      categoryBreakdown: categoryBreakdown as Record<ExpenseCategory, number>,
    });
  });

  // Sort by total amount descending
  return vendorStats.sort((a, b) => b.totalAmount - a.totalAmount);
}
