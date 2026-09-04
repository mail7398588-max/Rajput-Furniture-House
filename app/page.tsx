'use client'

import { useEffect, useState } from 'react'
import { DollarSign, Users, ShoppingCart, TrendingUp } from 'lucide-react'
import StatCard from '@/components/StatCard'
import { MonthlyRevenueChart, ExpensePieChart } from '@/components/Charts'
import { supabase } from '@/lib/supabase'

const db = () => supabase()

interface DashboardStats {
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  activeOrders: number
  monthlyData: { month: string; revenue: number; expenses: number; profit: number }[]
  expenseCategories: { category: string; amount: number }[]
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatPKR(value: number): string {
  if (value >= 100000) return `PKR ${(value / 100000).toFixed(1)}L`
  if (value >= 1000) return `PKR ${(value / 1000).toFixed(1)}K`
  return `PKR ${value.toLocaleString()}`
}

function getLast6Months(): string[] {
  const months: string[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return months
}

export default function Home() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const last6 = getLast6Months()
        const startMonth = last6[0]

        const [ordersRes, transactionsRes] = await Promise.all([
          db()
            .from('orders')
            .select('id, order_no, total_expense, created_at, customers(order_amount, status, order_date)'),
          db()
            .from('transactions')
            .select('income, expense, category, date'),
        ])

        if (ordersRes.error) throw ordersRes.error
        if (transactionsRes.error) throw transactionsRes.error

        const orders = (ordersRes.data as any[]) || []
        const transactions = (transactionsRes.data as any[]) || []

        let totalRevenue = 0
        let totalExpenses = 0
        let activeOrders = 0

        for (const order of orders) {
          const amount = Number(order.customers?.order_amount) || 0
          const expense = Number(order.total_expense) || 0
          totalRevenue += amount
          totalExpenses += expense

          const status = order.customers?.status
          if (status === 'In Progress' || status === 'Pending') {
            activeOrders++
          }
        }

        const monthlyMap: Record<string, { revenue: number; expenses: number }> = {}
        for (const m of last6) {
          monthlyMap[m] = { revenue: 0, expenses: 0 }
        }

        for (const order of orders) {
          const orderDate = order.customers?.order_date
          if (!orderDate) continue
          const d = new Date(orderDate)
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          if (monthlyMap[key]) {
            monthlyMap[key].revenue += Number(order.customers?.order_amount) || 0
            monthlyMap[key].expenses += Number(order.total_expense) || 0
          }
        }

        const monthlyData = last6.map((m) => {
          const [year, month] = m.split('-')
          const entry = monthlyMap[m]
          return {
            month: MONTH_NAMES[parseInt(month) - 1],
            revenue: entry.revenue,
            expenses: entry.expenses,
            profit: entry.revenue - entry.expenses,
          }
        })

        const categoryMap: Record<string, number> = {}
        for (const tx of transactions) {
          const cat = tx.category || 'Uncategorized'
          categoryMap[cat] = (categoryMap[cat] || 0) + (Number(tx.expense) || 0)
        }

        const expenseCategories = Object.entries(categoryMap)
          .map(([category, amount]) => ({ category, amount }))
          .sort((a, b) => b.amount - a.amount)

        setStats({
          totalRevenue,
          totalExpenses,
          netProfit: totalRevenue - totalExpenses,
          activeOrders,
          monthlyData,
          expenseCategories,
        })
      } catch (err: any) {
        setError(err?.message || 'Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboard()
  }, [])

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500 text-lg">Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <p className="text-red-500 text-lg">Error: {error}</p>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of your furniture workshop</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Revenue"
          value={formatPKR(stats.totalRevenue)}
          icon={<DollarSign size={20} />}
          color="green"
          subtitle="All time"
        />
        <StatCard
          title="Total Expenses"
          value={formatPKR(stats.totalExpenses)}
          icon={<TrendingUp size={20} />}
          color="red"
          subtitle="All time"
        />
        <StatCard
          title="Net Profit"
          value={formatPKR(stats.netProfit)}
          icon={<DollarSign size={20} />}
          color="blue"
          subtitle="All time"
        />
        <StatCard
          title="Active Orders"
          value={String(stats.activeOrders)}
          icon={<ShoppingCart size={20} />}
          color="purple"
          subtitle="In progress"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MonthlyRevenueChart data={stats.monthlyData} />
        <ExpensePieChart data={stats.expenseCategories} />
      </div>
    </div>
  )
}
