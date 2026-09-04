'use client'

import { useEffect, useState } from 'react'
import { DollarSign, ShoppingCart, TrendingUp, Wallet } from 'lucide-react'
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
  return `Rs. ${value.toLocaleString()}`
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

        const [customersRes, ordersRes, transactionsRes] = await Promise.all([
          db().from('customers').select('order_amount, status, order_date'),
          db().from('orders').select('total_expense, order_no'),
          db().from('transactions').select('income, expense, category, date'),
        ])

        if (customersRes.error) throw customersRes.error
        if (ordersRes.error) throw ordersRes.error
        if (transactionsRes.error) throw transactionsRes.error

        const customers = (customersRes.data as any[]) || []
        const orders = (ordersRes.data as any[]) || []
        const transactions = (transactionsRes.data as any[]) || []

        const ordersMap: Record<string, number> = {}
        for (const o of orders) {
          ordersMap[o.order_no] = Number(o.total_expense) || 0
        }

        let totalRevenue = 0
        let totalExpenses = 0
        let activeOrders = 0

        for (const c of customers) {
          totalRevenue += Number(c.order_amount) || 0
          const expense = ordersMap[c.order_no] || 0
          totalExpenses += expense

          const status = c.status
          if (status === 'In Progress' || status === 'Pending') {
            activeOrders++
          }
        }

        const monthlyMap: Record<string, { revenue: number; expenses: number }> = {}
        for (const m of last6) {
          monthlyMap[m] = { revenue: 0, expenses: 0 }
        }

        for (const c of customers) {
          const orderDate = c.order_date
          if (!orderDate) continue
          const d = new Date(orderDate)
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          if (monthlyMap[key]) {
            monthlyMap[key].revenue += Number(c.order_amount) || 0
            monthlyMap[key].expenses += ordersMap[c.order_no] || 0
          }
        }

        const monthlyData = last6.map((m) => {
          const [, month] = m.split('-')
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
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-warm-500 font-medium">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center bg-red-50 rounded-2xl p-8 border border-red-100">
          <p className="text-red-600 font-semibold text-lg">Error loading dashboard</p>
          <p className="text-red-400 text-sm mt-2">{error}</p>
        </div>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
            <Wallet size={20} className="text-white" />
          </div>
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">Overview of your furniture workshop</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
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
          icon={<Wallet size={20} />}
          color="amber"
          subtitle="All time"
        />
        <StatCard
          title="Active Orders"
          value={String(stats.activeOrders)}
          icon={<ShoppingCart size={20} />}
          color="blue"
          subtitle="In progress"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <MonthlyRevenueChart data={stats.monthlyData} />
        <ExpensePieChart data={stats.expenseCategories} />
      </div>
    </div>
  )
}
