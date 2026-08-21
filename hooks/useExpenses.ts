'use client';

import { useState, useEffect, useCallback } from 'react';
import { Expense, ExpenseFormData } from '@/types/expense';
import { STORAGE_KEY } from '@/lib/constants';
import { generateId } from '@/lib/utils';

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load expenses from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setExpenses(parsed);
      }
    } catch (error) {
      console.error('Failed to load expenses:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save expenses to localStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
      } catch (error) {
        console.error('Failed to save expenses:', error);
      }
    }
  }, [expenses, isLoading]);

  const addExpense = useCallback((formData: ExpenseFormData) => {
    const now = new Date().toISOString();
    const newExpense: Expense = {
      id: generateId(),
      date: formData.date,
      amount: parseFloat(formData.amount),
      category: formData.category,
      description: formData.description,
      createdAt: now,
      updatedAt: now,
    };

    setExpenses((prev) => [newExpense, ...prev]);
    return newExpense;
  }, []);

  const updateExpense = useCallback((id: string, formData: ExpenseFormData) => {
    setExpenses((prev) =>
      prev.map((expense) =>
        expense.id === id
          ? {
              ...expense,
              date: formData.date,
              amount: parseFloat(formData.amount),
              category: formData.category,
              description: formData.description,
              updatedAt: new Date().toISOString(),
            }
          : expense
      )
    );
  }, []);

  const deleteExpense = useCallback((id: string) => {
    setExpenses((prev) => prev.filter((expense) => expense.id !== id));
  }, []);

  const clearAllExpenses = useCallback(() => {
    setExpenses([]);
  }, []);

  return {
    expenses,
    isLoading,
    addExpense,
    updateExpense,
    deleteExpense,
    clearAllExpenses,
  };
}
