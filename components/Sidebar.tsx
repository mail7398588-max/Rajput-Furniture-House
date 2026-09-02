'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  FileText,
  ArrowLeftRight,
  CalendarCheck,
  Receipt,
} from 'lucide-react'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/orders', label: 'Orders P&L', icon: FileText },
  { href: '/income-expense', label: 'Income & Expense', icon: ArrowLeftRight },
  { href: '/attendance', label: 'Attendance', icon: CalendarCheck },
  { href: '/cash-memo', label: 'Cash Memo', icon: Receipt },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-slate-900 text-white z-50">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-lg font-bold text-white leading-tight">
          RAJPOOT FURNITURE
        </h1>
        <p className="text-xs text-slate-400 mt-1">Workshop Dashboard</p>
      </div>
      <nav className="mt-4 px-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
        <p className="text-xs text-slate-500 text-center">
          Muhammad Abbas: 0300-8583823
        </p>
        <p className="text-xs text-slate-500 text-center">
          Junaid Abbas: 0318-6497054
        </p>
      </div>
    </aside>
  )
}
