'use client'

import { DollarSign, Users, ShoppingCart, TrendingUp } from 'lucide-react'
import StatCard from '@/components/StatCard'
import { MonthlyRevenueChart, ExpensePieChart } from '@/components/Charts'

const monthlyData = [
  { month: 'Jan', revenue: 120000, expenses: 80000, profit: 40000 },
  { month: 'Feb', revenue: 95000, expenses: 65000, profit: 30000 },
  { month: 'Mar', revenue: 150000, expenses: 90000, profit: 60000 },
  { month: 'Apr', revenue: 110000, expenses: 70000, profit: 40000 },
  { month: 'May', revenue: 130000, expenses: 85000, profit: 45000 },
  { month: 'Jun', revenue: 160000, expenses: 95000, profit: 65000 },
]

const expenseData = [
  { category: 'Wood', amount: 45000 },
  { category: 'Labor', amount: 35000 },
  { category: 'Hardware', amount: 15000 },
  { category: 'Rent', amount: 25000 },
  { category: 'Utilities', amount: 10000 },
]

export default function Home() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of your furniture workshop</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Revenue"
          value="PKR 765,000"
          icon={<DollarSign size={20} />}
          color="green"
          subtitle="Last 6 months"
        />
        <StatCard
          title="Total Expenses"
          value="PKR 485,000"
          icon={<TrendingUp size={20} />}
          color="red"
          subtitle="Last 6 months"
        />
        <StatCard
          title="Net Profit"
          value="PKR 280,000"
          icon={<DollarSign size={20} />}
          color="blue"
          subtitle="Last 6 months"
        />
        <StatCard
          title="Active Orders"
          value="12"
          icon={<ShoppingCart size={20} />}
          color="purple"
          subtitle="In progress"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlyRevenueChart data={monthlyData} />
        <ExpensePieChart data={expenseData} />
      </div>
    </div>
  )
}
