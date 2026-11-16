import { Expense } from '@/features/expenses/types';
import { formatDate, formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export type ExportFormat = 'csv' | 'json' | 'pdf';

export interface ExportOptions {
  format: ExportFormat;
  expenses: Expense[];
  filename: string;
}

export class ExportService {
  static async exportToCSV(expenses: Expense[], filename: string): Promise<void> {
    const headers = ['Date', 'Category', 'Amount', 'Description'];
    const rows = expenses.map((expense) => [
      formatDate(expense.date),
      expense.category,
      formatCurrency(expense.amount),
      expense.description,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => {
          // Escape quotes and wrap in quotes if contains comma
          const escaped = cell.replace(/"/g, '""');
          return cell.includes(',') || cell.includes('"') ? `"${escaped}"` : escaped;
        }).join(',')
      ),
    ].join('\n');

    this.downloadFile(csvContent, filename, 'text/csv');
  }

  static async exportToJSON(expenses: Expense[], filename: string): Promise<void> {
    const exportData = {
      exportDate: new Date().toISOString(),
      totalExpenses: expenses.length,
      totalAmount: expenses.reduce((sum, exp) => sum + exp.amount, 0),
      expenses: expenses.map((expense) => ({
        date: expense.date,
        category: expense.category,
        amount: expense.amount,
        description: expense.description,
        id: expense.id,
      })),
    };

    const jsonContent = JSON.stringify(exportData, null, 2);
    this.downloadFile(jsonContent, filename, 'application/json');
  }

  static async exportToPDF(expenses: Expense[], filename: string): Promise<void> {
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(20);
    doc.text('Expense Report', 14, 22);

    // Add metadata
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 14, 32);
    doc.text(`Total Expenses: ${expenses.length}`, 14, 38);
    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    doc.text(`Total Amount: ${formatCurrency(total)}`, 14, 44);

    // Add table
    const tableData = expenses.map((expense) => [
      formatDate(expense.date),
      expense.category,
      formatCurrency(expense.amount),
      expense.description,
    ]);

    autoTable(doc, {
      head: [['Date', 'Category', 'Amount', 'Description']],
      body: tableData,
      startY: 50,
      theme: 'grid',
      headStyles: {
        fillColor: [59, 130, 246], // Blue
        textColor: 255,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 30 },
        2: { cellWidth: 30 },
        3: { cellWidth: 'auto' },
      },
    });

    // Save the PDF
    doc.save(filename);
  }

  static async export(options: ExportOptions): Promise<void> {
    const { format, expenses, filename } = options;

    // Simulate processing time for better UX
    await new Promise(resolve => setTimeout(resolve, 500));

    switch (format) {
      case 'csv':
        await this.exportToCSV(expenses, filename);
        break;
      case 'json':
        await this.exportToJSON(expenses, filename);
        break;
      case 'pdf':
        await this.exportToPDF(expenses, filename);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private static downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
