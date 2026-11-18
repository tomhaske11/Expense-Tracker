import { format, parseISO } from 'date-fns';

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

/**
 * A vendor name reduced for matching: lower case, store numbers and punctuation removed
 * ("CHIPOTLE #1234" and "Chipotle" both become "chipotle").
 */
export function normalizeVendor(name: string): string {
  return name
    .toLowerCase()
    .replace(/#\s*\d+/g, ' ')
    .replace(/[^a-z0-9& ]+/g, ' ')
    .replace(/\b\d+\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
