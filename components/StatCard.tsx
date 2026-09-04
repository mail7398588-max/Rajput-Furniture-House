'use client'

import { ReactNode } from 'react'

interface StatCardProps {
  title: string
  value: string | number
  icon: ReactNode
  color?: 'amber' | 'green' | 'red' | 'blue' | 'purple'
  subtitle?: string
}

const colorMap = {
  amber: {
    bg: 'bg-gradient-to-br from-primary-50 to-primary-100',
    icon: 'bg-primary-500 text-white shadow-lg shadow-primary-500/25',
  },
  green: {
    bg: 'bg-gradient-to-br from-green-50 to-emerald-100',
    icon: 'bg-green-500 text-white shadow-lg shadow-green-500/25',
  },
  red: {
    bg: 'bg-gradient-to-br from-red-50 to-rose-100',
    icon: 'bg-red-500 text-white shadow-lg shadow-red-500/25',
  },
  blue: {
    bg: 'bg-gradient-to-br from-blue-50 to-sky-100',
    icon: 'bg-blue-500 text-white shadow-lg shadow-blue-500/25',
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-50 to-violet-100',
    icon: 'bg-purple-500 text-white shadow-lg shadow-purple-500/25',
  },
}

export default function StatCard({ title, value, icon, color = 'amber', subtitle }: StatCardProps) {
  const colors = colorMap[color]
  return (
    <div className="stat-card group cursor-default">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold text-warm-500 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-warm-900 mt-2 tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-warm-400 mt-1.5 font-medium">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-2xl ${colors.icon} group-hover:scale-110 transition-transform duration-200`}>
          {icon}
        </div>
      </div>
    </div>
  )
}
