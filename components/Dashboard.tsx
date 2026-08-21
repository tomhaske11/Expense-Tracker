'use client';

import { useMemo, useState } from 'react';
import { Expense } from '@/types/expense';
import {
  formatCurrency,
  getCurrentMonthExpenses,
  calculateCategoryBreakdown,
} from '@/lib/utils';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/lib/constants';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import CloudExportHub from '@/components/CloudExportHub';

interface DashboardProps {
  expenses: Expense[];
}

export default function Dashboard({ expenses }: DashboardProps) {
  const [isCloudHubOpen, setIsCloudHubOpen] = useState(false);

  const summary = useMemo(() => {
    const totalSpending = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const monthlyExpenses = getCurrentMonthExpenses(expenses);
    const monthlySpending = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const categoryBreakdown = calculateCategoryBreakdown(expenses);

    return {
      totalSpending,
      monthlySpending,
      categoryBreakdown,
      expenseCount: expenses.length,
      monthlyExpenseCount: monthlyExpenses.length,
    };
  }, [expenses]);

  const chartData = summary.categoryBreakdown.map((item) => ({
    name: item.category,
    value: item.amount,
    percentage: item.percentage,
  }));

  const topCategory = summary.categoryBreakdown[0];
  const averageExpense = summary.expenseCount > 0 ? summary.totalSpending / summary.expenseCount : 0;

  return (
    <>
      <div className="space-y-6">
        {/* Cloud Export CTA */}
        {expenses.length > 0 && (
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full blur-3xl animate-pulse"></div>
            </div>
            <div className="relative px-8 py-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex-1 min-w-[300px]">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-2xl">
                      ☁️
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">Cloud Export Hub</h3>
                      <p className="text-blue-100 text-sm mt-1">Share • Sync • Automate • Collaborate</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 mt-4 text-white/90 text-sm flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span>3 Integrations Active</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>⚡</span>
                      <span>Auto-backup enabled</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>📊</span>
                      <span>5 Export Templates</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsCloudHubOpen(true)}
                  className="px-8 py-4 bg-white rounded-xl font-bold text-lg hover:scale-105 transition-transform shadow-xl"
                >
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Open Hub
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title="Total Spending"
            value={formatCurrency(summary.totalSpending)}
            icon="💰"
            color="blue"
            subtitle={`${summary.expenseCount} expenses`}
          />
          <SummaryCard
            title="This Month"
            value={formatCurrency(summary.monthlySpending)}
            icon="📅"
            color="green"
            subtitle={`${summary.monthlyExpenseCount} expenses`}
          />
          <SummaryCard
            title="Average Expense"
            value={formatCurrency(averageExpense)}
            icon="📊"
            color="purple"
            subtitle="Per transaction"
          />
          <SummaryCard
            title="Top Category"
            value={topCategory?.category || 'N/A'}
            icon={topCategory ? CATEGORY_ICONS[topCategory.category] : '📦'}
            color="orange"
            subtitle={topCategory ? formatCurrency(topCategory.amount) : 'No data'}
          />
        </div>

        {/* Charts */}
        {summary.categoryBreakdown.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Spending by Category</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderCustomLabel}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Category Breakdown</h2>
              <div className="space-y-3">
                {summary.categoryBreakdown.map((item) => (
                  <div key={item.category} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{CATEGORY_ICONS[item.category]}</span>
                        <span className="font-medium text-gray-700">{item.category}</span>
                      </div>
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(item.amount)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${item.percentage}%`,
                            backgroundColor: CATEGORY_COLORS[item.category],
                          }}
                        />
                      </div>
                      <span className="text-xs text-gray-600 w-12 text-right">
                        {item.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {summary.categoryBreakdown.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-500">No expenses to display. Add some expenses to see your spending breakdown!</p>
          </div>
        )}
      </div>

      <CloudExportHub
        isOpen={isCloudHubOpen}
        onClose={() => setIsCloudHubOpen(false)}
        expenses={expenses}
      />
    </>
  );
}

interface SummaryCardProps {
  title: string;
  value: string;
  icon: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
  subtitle: string;
}

function SummaryCard({ title, value, icon, color, subtitle }: SummaryCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function renderCustomLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percentage,
}: any) {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percentage < 5) return null;

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="text-xs font-semibold"
    >
      {`${percentage.toFixed(0)}%`}
    </text>
  );
}

function CustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white px-4 py-2 rounded-lg shadow-lg border border-gray-200">
        <p className="font-medium text-gray-900">{payload[0].name}</p>
        <p className="text-sm text-gray-600">{formatCurrency(payload[0].value)}</p>
        <p className="text-xs text-gray-500">{payload[0].payload.percentage.toFixed(1)}%</p>
      </div>
    );
  }
  return null;
}
