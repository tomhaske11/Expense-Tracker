'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { MonthlySpending } from '@/features/analytics/types';
import { formatCurrency } from '@/lib/utils';
import { CATEGORY_COLORS } from '@/features/expenses/constants';

interface MonthlyComparisonChartProps {
  monthlyData: MonthlySpending[];
}

export default function MonthlyComparisonChart({ monthlyData }: MonthlyComparisonChartProps) {
  if (monthlyData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Monthly Comparison</h2>
        <div className="h-80 flex items-center justify-center text-gray-500">
          No monthly data available
        </div>
      </div>
    );
  }

  // Prepare chart data
  const chartData = monthlyData.map((month) => ({
    name: month.monthLabel,
    amount: month.amount,
    count: month.count,
    Food: month.categories.Food || 0,
    Transportation: month.categories.Transportation || 0,
    Entertainment: month.categories.Entertainment || 0,
    Shopping: month.categories.Shopping || 0,
    Bills: month.categories.Bills || 0,
    Other: month.categories.Other || 0,
  }));

  // Calculate growth rate
  const growthRates = monthlyData.slice(1).map((month, index) => {
    const prevAmount = monthlyData[index].amount;
    const currentAmount = month.amount;
    const growth = prevAmount > 0 ? ((currentAmount - prevAmount) / prevAmount) * 100 : 0;
    return {
      month: month.monthLabel,
      growth,
    };
  });

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Monthly Comparison</h2>
        <p className="text-sm text-gray-600">
          Compare spending across months and see category breakdown
        </p>
      </div>

      <div className="h-80 mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickLine={{ stroke: '#e5e7eb' }}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="Food" stackId="a" fill={CATEGORY_COLORS.Food} />
            <Bar dataKey="Transportation" stackId="a" fill={CATEGORY_COLORS.Transportation} />
            <Bar dataKey="Entertainment" stackId="a" fill={CATEGORY_COLORS.Entertainment} />
            <Bar dataKey="Shopping" stackId="a" fill={CATEGORY_COLORS.Shopping} />
            <Bar dataKey="Bills" stackId="a" fill={CATEGORY_COLORS.Bills} />
            <Bar dataKey="Other" stackId="a" fill={CATEGORY_COLORS.Other} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-gray-200">
        <div className="text-center">
          <p className="text-sm text-gray-600">Total Months</p>
          <p className="text-lg font-semibold text-gray-900">{monthlyData.length}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">Avg per Month</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatCurrency(
              monthlyData.reduce((sum, m) => sum + m.amount, 0) / (monthlyData.length || 1)
            )}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">Highest Month</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatCurrency(Math.max(...monthlyData.map((m) => m.amount)))}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">Lowest Month</p>
          <p className="text-lg font-semibold text-gray-900">
            {formatCurrency(
              Math.min(...monthlyData.filter((m) => m.amount > 0).map((m) => m.amount))
            )}
          </p>
        </div>
      </div>

      {/* Growth Trends */}
      {growthRates.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Month-over-Month Growth</h3>
          <div className="space-y-2">
            {growthRates.slice(-6).map((rate) => (
              <div key={rate.month} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{rate.month}</span>
                <span
                  className={`font-medium ${
                    rate.growth > 0
                      ? 'text-red-600'
                      : rate.growth < 0
                      ? 'text-green-600'
                      : 'text-gray-600'
                  }`}
                >
                  {rate.growth > 0 && '+'}
                  {rate.growth.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);
    return (
      <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200 max-w-xs">
        <p className="font-medium text-gray-900 mb-2">{payload[0].payload.name}</p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-gray-600">{entry.name}:</span>
              </div>
              <span className="font-medium text-gray-900">{formatCurrency(entry.value)}</span>
            </div>
          ))}
          <div className="pt-2 mt-2 border-t border-gray-200 flex items-center justify-between text-sm font-semibold">
            <span className="text-gray-900">Total:</span>
            <span className="text-gray-900">{formatCurrency(total)}</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {payload[0].payload.count} transaction{payload[0].payload.count !== 1 ? 's' : ''}
        </p>
      </div>
    );
  }
  return null;
}
