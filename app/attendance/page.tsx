'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
const db = () => supabase()
import type { Attendance } from '@/lib/types'
import Modal from '@/components/Modal'
import { Plus, Trash2, Edit } from 'lucide-react'
import { useToast } from '@/components/Toast'

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
  const { toast } = useToast()
  const [records, setRecords] = useState<Attendance[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(monthNames[new Date().getMonth()])
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [workingDays, setWorkingDays] = useState(26)
  const [modalOpen, setModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [addingWorker, setAddingWorker] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [editingWorker, setEditingWorker] = useState<Attendance | null>(null)
  const [editForm, setEditForm] = useState({ worker_name: '', designation: '', monthly_salary: 0 })
  const [savingEdit, setSavingEdit] = useState(false)
  const [pendingForm, setPendingForm] = useState<Record<string, { ot_hours: number; ot_multiplier: number; advance: number; other_deduction: number; paid_amount: number }>>({})
  const [form, setForm] = useState({
    worker_name: '',
    designation: '',
    monthly_salary: 0,
  })

  useEffect(() => {
    fetchRecords()
  }, [selectedMonth, selectedYear])

  async function fetchRecords() {
    try {
      const { data, error } = await db()
        .from('attendance')
        .select('*')
        .eq('month', selectedMonth)
        .eq('year', selectedYear)
        .order('created_at', { ascending: true })
      if (error) throw error
      setRecords((data || []) as Attendance[])
    } catch (err: any) {
      toast(err.message || 'Failed to load records', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddWorker() {
    if (!form.worker_name) {
      toast('Worker name is required', 'error')
      return
    }
    try {
      setAddingWorker(true)
      const days = getDaysInMonth(selectedMonth, selectedYear)
      const attendanceData: Record<string, string> = {}
      for (let i = 1; i <= days; i++) {
        attendanceData[String(i)] = ''
      }
      const { error } = await db().from('attendance').insert([
        {
          ...form,
          month: selectedMonth,
          year: selectedYear,
          working_days: workingDays,
          attendance_data: attendanceData,
        },
      ])
      if (error) throw error
      setModalOpen(false)
      setForm({ worker_name: '', designation: '', monthly_salary: 0 })
      toast('Worker added successfully', 'success')
      fetchRecords()
    } catch (err: any) {
      toast(err.message || 'Failed to add worker', 'error')
    } finally {
      setAddingWorker(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this attendance record?')) return
    try {
      setDeletingId(id)
      const { error } = await db().from('attendance').delete().eq('id', id)
      if (error) throw error
      toast('Worker deleted', 'success')
      fetchRecords()
    } catch (err: any) {
      toast(err.message || 'Failed to delete worker', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  function openEditModal(record: Attendance) {
    setEditingWorker(record)
    setEditForm({
      worker_name: record.worker_name,
      designation: record.designation || '',
      monthly_salary: record.monthly_salary,
    })
    setEditModalOpen(true)
  }

  async function handleEditSave() {
    if (!editingWorker) return
    if (!editForm.worker_name) {
      toast('Worker name is required', 'error')
      return
    }
    try {
      setSavingEdit(true)
      const { error } = await db()
        .from('attendance')
        .update({
          worker_name: editForm.worker_name,
          designation: editForm.designation,
          monthly_salary: editForm.monthly_salary,
        })
        .eq('id', editingWorker.id)
      if (error) throw error
      toast('Worker updated successfully', 'success')
      setEditModalOpen(false)
      setEditingWorker(null)
      fetchRecords()
    } catch (err: any) {
      toast(err.message || 'Failed to update worker', 'error')
    } finally {
      setSavingEdit(false)
    }
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

    try {
      const { error } = await db()
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
      if (error) throw error
      fetchRecords()
    } catch (err: any) {
      toast(err.message || 'Failed to update attendance', 'error')
    }
  }

  function getPend(record: Attendance) {
    return pendingForm[record.id] || {
      ot_hours: record.ot_hours || 0,
      ot_multiplier: record.ot_multiplier || 1.5,
      advance: record.advance || 0,
      other_deduction: record.other_deduction || 0,
      paid_amount: record.paid_amount || 0,
    }
  }

  function updatePend(id: string, field: string, value: number) {
    setPendingForm((prev) => ({
      ...prev,
      [id]: {
        ...getPend(records.find((r) => r.id === id)!),
        [field]: value,
      },
    }))
  }

  async function handlePendSave(record: Attendance) {
    const pend = getPend(record)
    const presentDays = Object.values(record.attendance_data || {}).filter((v) => v === 'P').length
    const halfDays = Object.values(record.attendance_data || {}).filter((v) => v === 'H').length

    const computed = computeSalary({
      monthly_salary: record.monthly_salary,
      working_days: workingDays,
      present_days: presentDays,
      half_days: halfDays,
      ot_hours: pend.ot_hours,
      ot_multiplier: pend.ot_multiplier,
      advance: pend.advance,
      other_deduction: pend.other_deduction,
      paid_amount: pend.paid_amount,
    })

    try {
      setSavingId(record.id)
      const { error } = await db()
        .from('attendance')
        .update({
          ot_hours: pend.ot_hours,
          ot_multiplier: pend.ot_multiplier,
          advance: pend.advance,
          other_deduction: pend.other_deduction,
          paid_amount: pend.paid_amount,
          daily_rate: computed.dailyRate,
          payable_days: computed.payableDays,
          ot_rate: computed.otRate,
          ot_amount: computed.otAmount,
          gross_salary: computed.grossSalary,
          net_payable: computed.netPayable,
          remaining: computed.remaining,
        })
        .eq('id', record.id)
      if (error) throw error
      toast('Saved', 'success')
      fetchRecords()
    } catch (err: any) {
      toast(err.message || 'Failed to save', 'error')
    } finally {
      setSavingId(null)
    }
  }

  const daysInMonth = getDaysInMonth(selectedMonth, selectedYear)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  const totalSalary = records.reduce((sum, r) => sum + (r.gross_salary || 0), 0)
  const totalOT = records.reduce((sum, r) => sum + (r.ot_amount || 0), 0)
  const totalAdvance = records.reduce((sum, r) => sum + (r.advance || 0), 0)
  const totalNet = records.reduce((sum, r) => sum + (r.net_payable || 0), 0)

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i)

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
            <div className="space-y-4">
              {records.map((r) => {
                const pend = getPend(r)
                return (
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
                          onClick={() => openEditModal(r)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="text-red-500 hover:text-red-700"
                          disabled={deletingId === r.id}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-3">
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

                    <div className="flex flex-wrap items-end gap-3 pt-2 border-t border-gray-100">
                      <div>
                        <label className="text-xs text-gray-500">OT Hours</label>
                        <input
                          type="number"
                          className="input-field w-20 text-sm py-1"
                          value={pend.ot_hours}
                          onChange={(e) => updatePend(r.id, 'ot_hours', Number(e.target.value))}
                          min={0}
                          step={0.5}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">OT Multiplier</label>
                        <input
                          type="number"
                          className="input-field w-20 text-sm py-1"
                          value={pend.ot_multiplier}
                          onChange={(e) => updatePend(r.id, 'ot_multiplier', Number(e.target.value))}
                          min={0}
                          step={0.1}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Advance</label>
                        <input
                          type="number"
                          className="input-field w-24 text-sm py-1"
                          value={pend.advance}
                          onChange={(e) => updatePend(r.id, 'advance', Number(e.target.value))}
                          min={0}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Other Deduction</label>
                        <input
                          type="number"
                          className="input-field w-24 text-sm py-1"
                          value={pend.other_deduction}
                          onChange={(e) => updatePend(r.id, 'other_deduction', Number(e.target.value))}
                          min={0}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-500">Paid Amount</label>
                        <input
                          type="number"
                          className="input-field w-24 text-sm py-1"
                          value={pend.paid_amount}
                          onChange={(e) => updatePend(r.id, 'paid_amount', Number(e.target.value))}
                          min={0}
                        />
                      </div>
                      <button
                        onClick={() => handlePendSave(r)}
                        className="btn-primary text-sm py-1 px-3"
                        disabled={savingId === r.id}
                      >
                        {savingId === r.id ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                )
              })}
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
          <button onClick={handleAddWorker} className="btn-primary" disabled={addingWorker}>
            {addingWorker ? 'Adding...' : 'Add Worker'}
          </button>
        </div>
      </Modal>

      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Worker">
        <div className="space-y-4">
          <div>
            <label className="label-text">Worker Name *</label>
            <input
              type="text"
              className="input-field"
              value={editForm.worker_name}
              onChange={(e) => setEditForm({ ...editForm, worker_name: e.target.value })}
            />
          </div>
          <div>
            <label className="label-text">Designation</label>
            <input
              type="text"
              className="input-field"
              value={editForm.designation}
              onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
            />
          </div>
          <div>
            <label className="label-text">Monthly Salary (Rs)</label>
            <input
              type="number"
              className="input-field"
              value={editForm.monthly_salary}
              onChange={(e) => setEditForm({ ...editForm, monthly_salary: Number(e.target.value) })}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setEditModalOpen(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleEditSave} className="btn-primary" disabled={savingEdit}>
            {savingEdit ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
