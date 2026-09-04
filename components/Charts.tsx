'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

interface MonthlyChartProps {
  data: { month: string; revenue: number; expenses: number; profit: number }[]
}

const COLORS = ['#FFC726', '#EF4444', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

export function MonthlyRevenueChart({ data }: MonthlyChartProps) {
  return (
    <div className="stat-card">
      <h3 className="text-sm font-bold text-warm-800 mb-4 uppercase tracking-wider">Monthly Overview</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#FAF0DC" />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#A88542' }} />
          <YAxis tick={{ fontSize: 12, fill: '#A88542' }} />
          <Tooltip
            contentStyle={{ borderRadius: '12px', border: '1px solid #FAF0DC', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
          />
          <Legend />
          <Bar dataKey="revenue" name="Revenue" fill="#FFC726" radius={[6, 6, 0, 0]} />
          <Bar dataKey="expenses" name="Expenses" fill="#EF4444" radius={[6, 6, 0, 0]} />
          <Bar dataKey="profit" name="Profit" fill="#22C55E" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

interface ExpensePieChartProps {
  data: { category: string; amount: number }[]
}

export function ExpensePieChart({ data }: ExpensePieChartProps) {
  if (!data.length) {
    return (
      <div className="stat-card">
        <h3 className="text-sm font-bold text-warm-800 mb-4 uppercase tracking-wider">Expense Breakdown</h3>
        <div className="flex items-center justify-center h-[300px] text-warm-400 text-sm">
          No expense data yet
        </div>
      </div>
    )
  }

  return (
    <div className="stat-card">
      <h3 className="text-sm font-bold text-warm-800 mb-4 uppercase tracking-wider">Expense Breakdown</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={100}
            innerRadius={40}
            dataKey="amount"
            nameKey="category"
            label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
            stroke="#FEFCF8"
            strokeWidth={2}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ borderRadius: '12px', border: '1px solid #FAF0DC', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
