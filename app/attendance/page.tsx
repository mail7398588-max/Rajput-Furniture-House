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

function getDaysInMonth(month: string, year: number) {
  const m = monthNames.indexOf(month)
  return new Date(year, m + 1, 0).getDate()
}

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

function computeSalary(record: {
  monthly_salary: number
  working_days: number
  present_days: number
  half_days: number
  total_ot_hours: number
  advance: number
  paid_amount: number
}) {
  const dailyRate = record.monthly_salary / (record.working_days || 26)
  const payableDays = record.present_days + record.half_days * 0.5
  const otRate = dailyRate / 8 * 1.5
  const otAmount = record.total_ot_hours * otRate
  const grossSalary = dailyRate * payableDays + otAmount
  const netPayable = grossSalary - record.advance
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
  const [form, setForm] = useState({ worker_name: '', designation: '', monthly_salary: 0 })
  const [pendingEdits, setPendingEdits] = useState<Record<string, {
    ot_data: Record<string, number>
    advance: number
    paid_amount: number
  }>>({})

  useEffect(() => { fetchRecords() }, [selectedMonth, selectedYear])

  async function fetchRecords() {
    try {
      const { data, error } = await db()
        .from('attendance').select('*')
        .eq('month', selectedMonth).eq('year', selectedYear)
        .order('created_at', { ascending: true })
      if (error) throw error
      setRecords((data || []) as Attendance[])
    } catch {
      toast('Failed to load records', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddWorker() {
    if (!form.worker_name) { toast('Worker name is required', 'error'); return }
    try {
      setAddingWorker(true)
      const days = getDaysInMonth(selectedMonth, selectedYear)
      const attendanceData: Record<string, string> = {}
      const otData: Record<string, number> = {}
      for (let i = 1; i <= days; i++) {
        attendanceData[String(i)] = ''
        otData[String(i)] = 0
      }
      const { error } = await db().from('attendance').insert([{
        ...form,
        month: selectedMonth, year: selectedYear,
        working_days: workingDays,
        attendance_data: attendanceData,
        ot_data: otData,
      }])
      if (error) throw error
      setModalOpen(false)
      setForm({ worker_name: '', designation: '', monthly_salary: 0 })
      toast('Worker added', 'success')
      fetchRecords()
    } catch {
      toast('Failed to add worker', 'error')
    } finally { setAddingWorker(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this attendance record?')) return
    try {
      setDeletingId(id)
      const { error } = await db().from('attendance').delete().eq('id', id)
      if (error) throw error
      toast('Worker deleted', 'success')
      fetchRecords()
    } catch {
      toast('Failed to delete', 'error')
    } finally { setDeletingId(null) }
  }

  function openEditModal(record: Attendance) {
    setEditingWorker(record)
    setEditForm({ worker_name: record.worker_name, designation: record.designation || '', monthly_salary: record.monthly_salary })
    setEditModalOpen(true)
  }

  async function handleEditSave() {
    if (!editingWorker || !editForm.worker_name) { toast('Name required', 'error'); return }
    try {
      setSavingEdit(true)
      const { error } = await db().from('attendance')
        .update({ worker_name: editForm.worker_name, designation: editForm.designation, monthly_salary: editForm.monthly_salary })
        .eq('id', editingWorker.id)
      if (error) throw error
      toast('Worker updated', 'success')
      setEditModalOpen(false)
      fetchRecords()
    } catch {
      toast('Failed to update', 'error')
    } finally { setSavingEdit(false) }
  }

  async function toggleDay(record: Attendance, day: number) {
    const current = record.attendance_data?.[String(day)] || ''
    let next = current === 'P' ? 'A' : current === 'A' ? 'H' : current === 'H' ? '' : 'P'
    const updated = { ...record.attendance_data, [String(day)]: next }

    const presentDays = Object.values(updated).filter((v) => v === 'P').length
    const absentDays = Object.values(updated).filter((v) => v === 'A').length
    const halfDays = Object.values(updated).filter((v) => v === 'H').length

    const pend = getPend(record)
    const totalOT = Object.values(pend.ot_data).reduce((s, v) => s + (v || 0), 0)

    const computed = computeSalary({
      monthly_salary: record.monthly_salary, working_days: workingDays,
      present_days: presentDays, half_days: halfDays,
      total_ot_hours: totalOT, advance: pend.advance, paid_amount: pend.paid_amount,
    })

    try {
      const { error } = await db().from('attendance').update({
        attendance_data: updated, present_days: presentDays, absent_days: absentDays, half_days: halfDays,
        working_days: workingDays, daily_rate: computed.dailyRate, payable_days: computed.payableDays,
        ot_rate: computed.otRate, ot_amount: computed.otAmount, gross_salary: computed.grossSalary,
        net_payable: computed.netPayable, remaining: computed.remaining,
      }).eq('id', record.id)
      if (error) throw error
      fetchRecords()
    } catch {
      toast('Failed to update', 'error')
    }
  }

  function updateOTDay(recordId: string, day: number, hours: number) {
    setPendingEdits((prev) => {
      const record = records.find((r) => r.id === recordId)
      const otData = { ...(prev[recordId]?.ot_data || (record?.ot_data as Record<string, number>) || {}), [String(day)]: hours }
      return {
        ...prev,
        [recordId]: {
          ot_data: otData,
          advance: prev[recordId]?.advance ?? record?.advance ?? 0,
          paid_amount: prev[recordId]?.paid_amount ?? record?.paid_amount ?? 0,
        }
      }
    })
  }

  function updatePendField(recordId: string, field: string, value: number) {
    setPendingEdits((prev) => {
      const record = records.find((r) => r.id === recordId)
      return {
        ...prev,
        [recordId]: {
          ot_data: prev[recordId]?.ot_data || (record?.ot_data as Record<string, number>) || {},
          advance: prev[recordId]?.advance ?? record?.advance ?? 0,
          paid_amount: prev[recordId]?.paid_amount ?? record?.paid_amount ?? 0,
          [field]: value,
        }
      }
    })
  }

  function getPend(record: Attendance) {
    return pendingEdits[record.id] || {
      ot_data: (record.ot_data as Record<string, number>) || {},
      advance: record.advance || 0,
      paid_amount: record.paid_amount || 0,
    }
  }

  async function handleSaveRow(record: Attendance) {
    const pend = getPend(record)
    const presentDays = Object.values(record.attendance_data || {}).filter((v) => v === 'P').length
    const halfDays = Object.values(record.attendance_data || {}).filter((v) => v === 'H').length
    const totalOT = Object.values(pend.ot_data).reduce((s, v) => s + (v || 0), 0)

    const computed = computeSalary({
      monthly_salary: record.monthly_salary, working_days: workingDays,
      present_days: presentDays, half_days: halfDays,
      total_ot_hours: totalOT, advance: pend.advance, paid_amount: pend.paid_amount,
    })

    try {
      setSavingId(record.id)
      const { error } = await db().from('attendance').update({
        ot_data: pend.ot_data, advance: pend.advance, paid_amount: pend.paid_amount,
        daily_rate: computed.dailyRate, payable_days: computed.payableDays,
        ot_rate: computed.otRate, ot_amount: computed.otAmount, gross_salary: computed.grossSalary,
        net_payable: computed.netPayable, remaining: computed.remaining,
      }).eq('id', record.id)
      if (error) throw error
      toast('Saved', 'success')
      fetchRecords()
    } catch {
      toast('Failed to save', 'error')
    } finally { setSavingId(null) }
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
    <div className="p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Attendance & Salary</h1>
          <p className="page-subtitle">P = Present | A = Absent | H = Half Day — Click to toggle. Enter OT hours per day below.</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Add Worker
        </button>
      </div>

      <div className="stat-card mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div>
            <label className="label-text">Month</label>
            <select className="input-field w-auto" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
              {monthNames.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label-text">Year</label>
            <select className="input-field w-auto" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="label-text">Working Days</label>
            <input type="number" className="input-field w-20" value={workingDays} onChange={(e) => setWorkingDays(Number(e.target.value))} min={1} max={31} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="stat-card"><p className="text-xs text-warm-500 uppercase font-semibold">Total Salary</p><p className="text-lg font-bold text-warm-900">Rs. {totalSalary.toLocaleString()}</p></div>
        <div className="stat-card"><p className="text-xs text-warm-500 uppercase font-semibold">Total OT</p><p className="text-lg font-bold text-blue-600">Rs. {totalOT.toLocaleString()}</p></div>
        <div className="stat-card"><p className="text-xs text-warm-500 uppercase font-semibold">Total Advance</p><p className="text-lg font-bold text-orange-600">Rs. {totalAdvance.toLocaleString()}</p></div>
        <div className="stat-card"><p className="text-xs text-warm-500 uppercase font-semibold">Total Net Payable</p><p className="text-lg font-bold text-green-600">Rs. {totalNet.toLocaleString()}</p></div>
      </div>

      <div className="stat-card overflow-x-auto">
        {loading ? (
          <div className="text-center py-8"><div className="w-8 h-8 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin mx-auto mb-2" /><p className="text-warm-400 text-sm">Loading...</p></div>
        ) : records.length === 0 ? (
          <div className="text-center text-warm-400 py-8">No workers for {selectedMonth} {selectedYear}. Click &quot;Add Worker&quot;.</div>
        ) : (
          <div className="min-w-max space-y-4">
            {records.map((r) => {
              const pend = getPend(r)
              const totalOT = Object.values(pend.ot_data).reduce((s, v) => s + (v || 0), 0)
              return (
                <div key={r.id} className="border border-warm-200 rounded-xl p-4 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 text-white flex items-center justify-center font-bold text-sm">{getInitials(r.worker_name)}</div>
                      <div>
                        <h3 className="font-semibold text-warm-900">{r.worker_name}</h3>
                        <p className="text-xs text-warm-500">{r.designation || 'Worker'} | Rs. {r.monthly_salary.toLocaleString()}/month</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-center"><p className="text-warm-400 text-[10px] uppercase">Present</p><p className="font-bold text-green-600">{r.present_days}</p></div>
                      <div className="text-center"><p className="text-warm-400 text-[10px] uppercase">Absent</p><p className="font-bold text-red-600">{r.absent_days}</p></div>
                      <div className="text-center"><p className="text-warm-400 text-[10px] uppercase">Half</p><p className="font-bold text-yellow-600">{r.half_days}</p></div>
                      <div className="text-center"><p className="text-warm-400 text-[10px] uppercase">OT Hrs</p><p className="font-bold text-blue-600">{totalOT}</p></div>
                      <div className="text-center"><p className="text-warm-400 text-[10px] uppercase">Gross</p><p className="font-bold">Rs. {(r.gross_salary || 0).toLocaleString()}</p></div>
                      <div className="text-center"><p className="text-warm-400 text-[10px] uppercase">Net</p><p className="font-bold text-primary-600">Rs. {(r.net_payable || 0).toLocaleString()}</p></div>
                      <button onClick={() => openEditModal(r)} className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50"><Edit size={15} /></button>
                      <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50" disabled={deletingId === r.id}><Trash2 size={15} /></button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-2">
                    {days.map((day) => {
                      const status = r.attendance_data?.[String(day)] || ''
                      let bg = 'bg-warm-100 text-warm-400'
                      if (status === 'P') bg = 'bg-green-100 text-green-700 border-green-300'
                      else if (status === 'A') bg = 'bg-red-100 text-red-700 border-red-300'
                      else if (status === 'H') bg = 'bg-yellow-100 text-yellow-700 border-yellow-300'
                      return (
                        <button key={day} onClick={() => toggleDay(r, day)} className={`w-8 h-8 rounded-lg text-xs font-medium border ${bg} hover:scale-105 transition-transform`} title={`Day ${day}: ${status || 'None'}`}>{day}</button>
                      )
                    })}
                  </div>

                  <div className="mb-2">
                    <p className="text-[10px] text-warm-500 uppercase font-semibold mb-1">OT Hours per Day</p>
                    <div className="flex flex-wrap gap-1">
                      {days.map((day) => (
                        <input key={day} type="number" min={0} max={24} step={0.5}
                          className="w-8 h-7 text-[10px] text-center border border-warm-200 rounded bg-warm-50 focus:ring-1 focus:ring-primary-400 focus:outline-none"
                          value={pend.ot_data?.[String(day)] || ''}
                          onChange={(e) => updateOTDay(r.id, day, Number(e.target.value))}
                          placeholder="0" title={`Day ${day} OT`} />
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-end gap-3 pt-3 border-t border-warm-100">
                    <div>
                      <label className="text-[10px] text-warm-500 uppercase font-semibold">Total OT Hrs</label>
                      <div className="input-field w-16 text-sm py-1 bg-warm-100 font-bold text-blue-600">{totalOT}</div>
                    </div>
                    <div>
                      <label className="text-[10px] text-warm-500 uppercase font-semibold">Advance (Rs)</label>
                      <input type="number" className="input-field w-24 text-sm py-1" value={pend.advance} onChange={(e) => updatePendField(r.id, 'advance', Number(e.target.value))} min={0} />
                    </div>
                    <div>
                      <label className="text-[10px] text-warm-500 uppercase font-semibold">Paid (Rs)</label>
                      <input type="number" className="input-field w-24 text-sm py-1" value={pend.paid_amount} onChange={(e) => updatePendField(r.id, 'paid_amount', Number(e.target.value))} min={0} />
                    </div>
                    <button onClick={() => handleSaveRow(r)} className="btn-primary text-sm py-1.5 px-4" disabled={savingId === r.id}>
                      {savingId === r.id ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Worker">
        <div className="space-y-4">
          <div><label className="label-text">Worker Name *</label><input type="text" className="input-field" value={form.worker_name} onChange={(e) => setForm({ ...form, worker_name: e.target.value })} placeholder="e.g., Ahmed, Bilal" /></div>
          <div><label className="label-text">Designation</label><input type="text" className="input-field" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="e.g., Carpenter, Helper" /></div>
          <div><label className="label-text">Monthly Salary (Rs)</label><input type="number" className="input-field" value={form.monthly_salary} onChange={(e) => setForm({ ...form, monthly_salary: Number(e.target.value) })} /><p className="text-xs text-warm-400 mt-1">Daily: Rs. {(form.monthly_salary / workingDays || 0).toFixed(0)}/day | OT rate (1.5x): Rs. {((form.monthly_salary / workingDays || 0) / 8 * 1.5).toFixed(0)}/hr</p></div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleAddWorker} className="btn-primary" disabled={addingWorker}>{addingWorker ? 'Adding...' : 'Add Worker'}</button>
        </div>
      </Modal>

      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Worker">
        <div className="space-y-4">
          <div><label className="label-text">Worker Name *</label><input type="text" className="input-field" value={editForm.worker_name} onChange={(e) => setEditForm({ ...editForm, worker_name: e.target.value })} /></div>
          <div><label className="label-text">Designation</label><input type="text" className="input-field" value={editForm.designation} onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })} /></div>
          <div><label className="label-text">Monthly Salary (Rs)</label><input type="number" className="input-field" value={editForm.monthly_salary} onChange={(e) => setEditForm({ ...editForm, monthly_salary: Number(e.target.value) })} /></div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setEditModalOpen(false)} className="btn-secondary">Cancel</button>
          <button onClick={handleEditSave} className="btn-primary" disabled={savingEdit}>{savingEdit ? 'Saving...' : 'Save'}</button>
        </div>
      </Modal>
    </div>
  )
}
