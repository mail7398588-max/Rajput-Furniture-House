'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  FileText,
  ArrowLeftRight,
  CalendarCheck,
  Receipt,
  Menu,
  X,
  Sofa,
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
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-[60] bg-sidebar text-white p-2.5 rounded-xl shadow-lg hover:bg-sidebar-light transition-colors"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-full w-72 bg-gradient-to-b from-sidebar via-sidebar to-[#12122a] text-white z-50 transform transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg">
              <Sofa size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight tracking-tight">
                RAJPOOT FURNITURE
              </h1>
              <p className="text-[11px] text-primary-400 font-medium mt-0.5">Workshop Dashboard</p>
            </div>
          </div>
        </div>
        <nav className="mt-6 px-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-1.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white hover:translate-x-1'
                }`}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-black/20">
          <p className="text-[11px] text-slate-400 text-center">
            Muhammad Abbas: 0300-8583823
          </p>
          <p className="text-[11px] text-slate-400 text-center mt-0.5">
            Junaid Abbas: 0318-6497054
          </p>
        </div>
      </aside>
    </>
  )
}
