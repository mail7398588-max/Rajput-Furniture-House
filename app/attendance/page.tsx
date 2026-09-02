'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
const db = () => supabase()
import type { Attendance } from '@/lib/types'
import Modal from '@/components/Modal'
import { Plus, Trash2 } from 'lucide-react'

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const shortMonths = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

function getDaysInMonth(month: string, year: number) {
  const m = monthNames.indexOf(month)
  return new Date(year, m + 1, 0).getDate()
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function computeSalary(record: {
  monthly_salary: number
  working_days: number
  present_days: number
  half_days: number
  ot_hours: number
  ot_multiplier: number
  advance: number
  other_deduction: number
  paid_amount: number
}) {
  const dailyRate = record.monthly_salary / (record.working_days || 26)
  const payableDays = record.present_days + record.half_days * 0.5
  const otRate = dailyRate / 8 * record.ot_multiplier
  const otAmount = record.ot_hours * otRate
  const grossSalary = dailyRate * payableDays + otAmount
  const netPayable = grossSalary - record.advance - record.other_deduction
  const remaining = netPayable - record.paid_amount
  return { dailyRate, payableDays, otRate, otAmount, grossSalary, netPayable, remaining }
}

export default function AttendancePage() {
  const [records, setRecords] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(monthNames[new Date().getMonth()])
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [workingDays, setWorkingDays] = useState(26)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({
    worker_name: '',
    designation: '',
    monthly_salary: 0,
  })

  useEffect(() => {
    fetchRecords()
  }, [selectedMonth, selectedYear])

  async function fetchRecords() {
    const { data } = await db()
      .from('attendance')
      .select('*')
      .eq('month', selectedMonth)
      .eq('year', selectedYear)
      .order('created_at', { ascending: true })
    setRecords((data || []) as Attendance[])
    setLoading(false)
  }

  async function handleAddWorker() {
    if (!form.worker_name) {
      alert('Worker name is required')
      return
    }
    const days = getDaysInMonth(selectedMonth, selectedYear)
    const attendanceData: Record<string, string> = {}
    for (let i = 1; i <= days; i++) {
      attendanceData[String(i)] = ''
    }
    await db().from('attendance').insert([
      {
        ...form,
        month: selectedMonth,
        year: selectedYear,
        working_days: workingDays,
        attendance_data: attendanceData,
      },
    ])
    setModalOpen(false)
    setForm({ worker_name: '', designation: '', monthly_salary: 0 })
    fetchRecords()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this attendance record?')) return
    await db().from('attendance').delete().eq('id', id)
    fetchRecords()
  }

  async function toggleDay(record: Attendance, day: number) {
    const current = record.attendance_data?.[String(day)] || ''
    let next: string
    if (current === 'P') next = 'A'
    else if (current === 'A') next = 'H'
    else if (current === 'H') next = ''
    else next = 'P'

    const updated = { ...record.attendance_data, [String(day)]: next }

    const presentDays = Object.values(updated).filter((v) => v === 'P').length
    const absentDays = Object.values(updated).filter((v) => v === 'A').length
    const halfDays = Object.values(updated).filter((v) => v === 'H').length

    const computed = computeSalary({
      monthly_salary: record.monthly_salary,
      working_days: workingDays,
      present_days: presentDays,
      half_days: halfDays,
      ot_hours: record.ot_hours || 0,
      ot_multiplier: record.ot_multiplier || 1.5,
      advance: record.advance || 0,
      other_deduction: record.other_deduction || 0,
      paid_amount: record.paid_amount || 0,
    })

    await db()
      .from('attendance')
      .update({
        attendance_data: updated,
        present_days: presentDays,
        absent_days: absentDays,
        half_days: halfDays,
        working_days: workingDays,
        daily_rate: computed.dailyRate,
        payable_days: computed.payableDays,
        ot_rate: computed.otRate,
        ot_amount: computed.otAmount,
        gross_salary: computed.grossSalary,
        net_payable: computed.netPayable,
        remaining: computed.remaining,
      })
      .eq('id', record.id)

    fetchRecords()
  }

  const daysInMonth = getDaysInMonth(selectedMonth, selectedYear)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const totalSalary = records.reduce((sum, r) => sum + (r.gross_salary || 0), 0)
  const totalOT = records.reduce((sum, r) => sum + (r.ot_amount || 0), 0)
  const totalAdvance = records.reduce((sum, r) => sum + (r.advance || 0), 0)
  const totalNet = records.reduce((sum, r) => sum + (r.net_payable || 0), 0)

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance & Salary</h1>
          <p className="text-sm text-gray-500 mt-1">
            P = Present | A = Absent | H = Half Day - Click to toggle
          </p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Worker
        </button>
      </div>

      <div className="stat-card mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div>
            <label className="label-text">Month</label>
            <select
              className="input-field w-auto"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              {monthNames.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-text">Year</label>
            <select
              className="input-field w-auto"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label-text">Working Days</label>
            <input
              type="number"
              className="input-field w-20"
              value={workingDays}
              onChange={(e) => setWorkingDays(Number(e.target.value))}
              min={1}
              max={31}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="stat-card">
          <p className="text-sm text-gray-500">Total Salary Budget</p>
          <p className="text-lg font-bold text-gray-900">Rs. {totalSalary.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-gray-500">Total OT Amount</p>
          <p className="text-lg font-bold text-blue-600">Rs. {totalOT.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-gray-500">Total Advance</p>
          <p className="text-lg font-bold text-orange-600">Rs. {totalAdvance.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-gray-500">Total Net Payable</p>
          <p className="text-lg font-bold text-green-600">Rs. {totalNet.toLocaleString()}</p>
        </div>
      </div>

      <div className="stat-card overflow-x-auto">
        {loading ? (
          <div className="text-center text-gray-400 py-8">Loading...</div>
        ) : records.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            No workers added for {selectedMonth} {selectedYear}. Click &quot;Add Worker&quot; to begin.
          </div>
        ) : (
          <div className="min-w-max">
            {/* Worker cards */}
            <div className="space-y-4">
              {records.map((r) => (
                <div key={r.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                        {getInitials(r.worker_name)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{r.worker_name}</h3>
                        <p className="text-xs text-gray-500">
                          {r.designation || 'Worker'} | Rs. {r.monthly_salary.toLocaleString()}/month
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="text-gray-400 text-xs">Present</p>
                        <p className="font-bold text-green-600">{r.present_days}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-400 text-xs">Absent</p>
                        <p className="font-bold text-red-600">{r.absent_days}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-400 text-xs">Half Days</p>
                        <p className="font-bold text-yellow-600">{r.half_days}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-400 text-xs">Gross</p>
                        <p className="font-bold">Rs. {(r.gross_salary || 0).toLocaleString()}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-400 text-xs">Net Payable</p>
                        <p className="font-bold text-blue-600">Rs. {(r.net_payable || 0).toLocaleString()}</p>
                      </div>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Day grid */}
                  <div className="flex flex-wrap gap-1">
                    {days.map((day) => {
                      const status = r.attendance_data?.[String(day)] || ''
                      let bgClass = 'bg-gray-100 text-gray-400'
                      if (status === 'P') bgClass = 'bg-green-100 text-green-700 border-green-300'
                      else if (status === 'A') bgClass = 'bg-red-100 text-red-700 border-red-300'
                      else if (status === 'H') bgClass = 'bg-yellow-100 text-yellow-700 border-yellow-300'

                      return (
                        <button
                          key={day}
                          onClick={() => toggleDay(r, day)}
                          className={`w-8 h-8 rounded text-xs font-medium border ${bgClass} hover:opacity-80 transition-colors`}
                          title={`Day ${day}: ${status || 'None'}`}
                        >
                          {day}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Worker">
        <div className="space-y-4">
          <div>
            <label className="label-text">Worker Name *</label>
            <input
              type="text"
              className="input-field"
              value={form.worker_name}
              onChange={(e) => setForm({ ...form, worker_name: e.target.value })}
              placeholder="e.g., Ahmed, Bilal"
            />
          </div>
          <div>
            <label className="label-text">Designation</label>
            <input
              type="text"
              className="input-field"
              value={form.designation}
              onChange={(e) => setForm({ ...form, designation: e.target.value })}
              placeholder="e.g., Carpenter, Helper"
            />
          </div>
          <div>
            <label className="label-text">Monthly Salary (Rs)</label>
            <input
              type="number"
              className="input-field"
              value={form.monthly_salary}
              onChange={(e) => setForm({ ...form, monthly_salary: Number(e.target.value) })}
            />
            <p className="text-xs text-gray-400 mt-1">
              Daily rate will be auto-calculated: Rs. {(form.monthly_salary / workingDays || 0).toFixed(0)}/day
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleAddWorker} className="btn-primary">Add Worker</button>
        </div>
      </Modal>
    </div>
  )
}
