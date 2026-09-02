'use client'

import { ReactNode } from 'react'

interface StatCardProps {
  title: string
  value: string | number
  icon: ReactNode
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple'
  subtitle?: string
}

const colorMap = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  red: 'bg-red-50 text-red-600',
  yellow: 'bg-yellow-50 text-yellow-600',
  purple: 'bg-purple-50 text-purple-600',
}

export default function StatCard({ title, value, icon, color = 'blue', subtitle }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-lg ${colorMap[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}
