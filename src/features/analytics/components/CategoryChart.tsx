'use client';

import { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { CategorySpending } from '@/features/analytics/types';
import { formatCurrency } from '@/lib/utils';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/features/expenses/constants';

interface CategoryChartProps {
  categoryData: CategorySpending[];
}

type ViewType = 'pie' | 'bar' | 'list';

export default function CategoryChart({ categoryData }: CategoryChartProps) {
  const [viewType, setViewType] = useState<ViewType>('pie');

  if (categoryData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Category Breakdown</h2>
        <div className="h-80 flex items-center justify-center text-gray-500">
          No category data available
        </div>
      </div>
    );
  }

  // Prepare chart data
  const chartData = categoryData.map((cat) => ({
    name: cat.category,
    value: cat.amount,
    percentage: cat.percentage,
    count: cat.count,
    average: cat.averageAmount,
  }));

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Category Breakdown</h2>
          <p className="text-sm text-gray-600 mt-1">Spending distribution by category</p>
        </div>

        {/* View Type Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewType('pie')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewType === 'pie'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Pie
          </button>
          <button
            onClick={() => setViewType('bar')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewType === 'bar'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Bar
          </button>
          <button
            onClick={() => setViewType('list')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              viewType === 'list'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            List
          </button>
        </div>
      </div>

      {/* Chart Views */}
      {viewType === 'pie' && (
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
              <Tooltip content={<CustomPieTooltip />} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {viewType === 'bar' && (
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                type="number"
                tick={{ fill: '#6b7280', fontSize: 12 }}
                tickFormatter={(value) => `$${value}`}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: '#6b7280', fontSize: 12 }}
                width={100}
              />
              <Tooltip content={<CustomBarTooltip />} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {viewType === 'list' && (
        <div className="space-y-4">
          {categoryData.map((cat) => (
            <div
              key={cat.category}
              className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{CATEGORY_ICONS[cat.category]}</span>
                  <div>
                    <h4 className="font-semibold text-gray-900">{cat.category}</h4>
                    <p className="text-sm text-gray-600">{cat.count} transactions</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(cat.amount)}</p>
                  <p className="text-sm text-gray-600">{cat.percentage.toFixed(1)}%</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${cat.percentage}%`,
                      backgroundColor: CATEGORY_COLORS[cat.category],
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Average: {formatCurrency(cat.averageAmount)}</span>
                <span>Total: {formatCurrency(cat.amount)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {viewType !== 'list' && (
        <div className="mt-6 pt-6 border-t border-gray-200 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Categories</p>
            <p className="text-lg font-semibold text-gray-900">{categoryData.length}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Top Category</p>
            <p className="text-lg font-semibold text-gray-900">
              {categoryData[0]?.category || 'N/A'}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Total Spent</p>
            <p className="text-lg font-semibold text-gray-900">
              {formatCurrency(categoryData.reduce((sum, cat) => sum + cat.amount, 0))}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Transactions</p>
            <p className="text-lg font-semibold text-gray-900">
              {categoryData.reduce((sum, cat) => sum + cat.count, 0)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function renderCustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percentage }: any) {
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

function CustomPieTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200">
        <p className="font-medium text-gray-900 mb-1">{payload[0].name}</p>
        <p className="text-sm font-semibold text-gray-900">{formatCurrency(payload[0].value)}</p>
        <p className="text-xs text-gray-600 mt-1">
          {payload[0].payload.percentage.toFixed(1)}% of total
        </p>
        <p className="text-xs text-gray-600">
          {payload[0].payload.count} transaction{payload[0].payload.count !== 1 ? 's' : ''}
        </p>
        <p className="text-xs text-gray-600">
          Avg: {formatCurrency(payload[0].payload.average)}
        </p>
      </div>
    );
  }
  return null;
}

function CustomBarTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white px-4 py-3 rounded-lg shadow-lg border border-gray-200">
        <p className="font-medium text-gray-900 mb-1">{payload[0].payload.name}</p>
        <p className="text-sm font-semibold text-gray-900">{formatCurrency(payload[0].value)}</p>
        <p className="text-xs text-gray-600 mt-1">
          {payload[0].payload.percentage.toFixed(1)}% of total
        </p>
        <p className="text-xs text-gray-600">
          {payload[0].payload.count} transaction{payload[0].payload.count !== 1 ? 's' : ''}
        </p>
        <p className="text-xs text-gray-600">
          Avg: {formatCurrency(payload[0].payload.average)}
        </p>
      </div>
    );
  }
  return null;
}
