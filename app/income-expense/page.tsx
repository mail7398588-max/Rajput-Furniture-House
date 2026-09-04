'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
const db = () => supabase()
import type { Transaction } from '@/lib/types'
import Modal from '@/components/Modal'
import { Plus, Search, Trash2, Edit } from 'lucide-react'
import { useToast } from '@/components/Toast'
import Pagination from '@/components/Pagination'
import { exportToCSV } from '@/lib/export'

const categories = [
  'Material Purchase',
  'Transport',
  'Salary',
  'Utilities',
  'Rent',
  'Office',
  'Marketing',
  'Other',
]

const paymentModes = ['Cash', 'Bank Transfer', 'JazzCash', 'EasyPaisa', 'Cheque', 'Other']

const ROWS_PER_PAGE = 15

const defaultForm = {
  date: new Date().toISOString().split('T')[0],
  particulars: '',
  category: '',
  income: 0,
  expense: 0,
  payment_mode: 'Cash',
  related_order_no: '',
  notes: '',
}

export default function IncomeExpensePage() {
  const { toast } = useToast()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'All' | 'Income' | 'Expense'>('All')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState(1)
  const [form, setForm] = useState(defaultForm)

  useEffect(() => {
    fetchTransactions()
  }, [])

  async function fetchTransactions() {
    try {
      const { data, error } = await db()
        .from('transactions')
        .select('*')
        .order('date', { ascending: false })
      if (error) throw error
      setTransactions((data || []) as Transaction[])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load transactions'
      toast(message, 'error')
    } finally {
      setLoading(false)
    }
  }

  function openAddModal() {
    setEditingTransaction(null)
    setForm(defaultForm)
    setModalOpen(true)
  }

  function openEditModal(t: Transaction) {
    setEditingTransaction(t)
    setForm({
      date: t.date || new Date().toISOString().split('T')[0],
      particulars: t.particulars || '',
      category: t.category || '',
      income: t.income || 0,
      expense: t.expense || 0,
      payment_mode: t.payment_mode || 'Cash',
      related_order_no: t.related_order_no || '',
      notes: t.notes || '',
    })
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingTransaction(null)
    setForm(defaultForm)
  }

  async function handleSave() {
    if (!form.particulars) {
      toast('Please enter particulars/details', 'error')
      return
    }
    setSaving(true)
    try {
      const month = form.date
        ? new Date(form.date).toLocaleString('en-US', { month: 'short', year: 'numeric' })
        : ''
      const payload = { ...form, month }

      if (editingTransaction) {
        const { error } = await db()
          .from('transactions')
          .update(payload)
          .eq('id', editingTransaction.id)
        if (error) throw error
        toast('Transaction updated', 'success')
      } else {
        const { error } = await db().from('transactions').insert([payload])
        if (error) throw error
        toast('Transaction added', 'success')
      }

      closeModal()
      fetchTransactions()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save transaction'
      toast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this transaction?')) return
    try {
      const { error } = await db().from('transactions').delete().eq('id', id)
      if (error) throw error
      toast('Transaction deleted', 'success')
      fetchTransactions()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete transaction'
      toast(message, 'error')
    }
  }

  function handleExport() {
    if (!withBalance.length) {
      toast('No data to export', 'error')
      return
    }
    exportToCSV(
      withBalance.map((t) => ({
        Date: t.date || '',
        Particulars: t.particulars || '',
        Category: t.category || '',
        Income: t.income || 0,
        Expense: t.expense || 0,
        'Payment Mode': t.payment_mode || '',
        'Order No': t.related_order_no || '',
        Balance: t.computedBalance,
        Notes: t.notes || '',
      })),
      'income-expense'
    )
    toast('CSV exported', 'success')
  }

  const filtered = transactions.filter((t) => {
    const matchSearch =
      !search ||
      t.particulars?.toLowerCase().includes(search.toLowerCase()) ||
      t.category?.toLowerCase().includes(search.toLowerCase()) ||
      t.related_order_no?.toLowerCase().includes(search.toLowerCase())
    const matchType =
      filterType === 'All' ||
      (filterType === 'Income' && (t.income || 0) > 0) ||
      (filterType === 'Expense' && (t.expense || 0) > 0)
    const matchDateFrom = !dateFrom || t.date >= dateFrom
    const matchDateTo = !dateTo || t.date <= dateTo
    return matchSearch && matchType && matchDateFrom && matchDateTo
  })

  let runningBalance = 0
  const withBalance = [...filtered].reverse().map((t) => {
    runningBalance += (t.income || 0) - (t.expense || 0)
    return { ...t, computedBalance: runningBalance }
  }).reverse()

  const totalPages = Math.ceil(withBalance.length / ROWS_PER_PAGE)
  const paged = withBalance.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE)

  const totalIncome = filtered.reduce((sum, t) => sum + (t.income || 0), 0)
  const totalExpense = filtered.reduce((sum, t) => sum + (t.expense || 0), 0)

  function resetFilters() {
    setSearch('')
    setFilterType('All')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Daily Income & Expense</h1>
          <p className="page-subtitle">
            Track daily income and expenditure - automatic balance calculation
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
            Download CSV
          </button>
          <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Entry
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="stat-card">
          <p className="text-sm text-gray-500">Total Income</p>
          <p className="text-xl font-bold text-green-600">Rs. {totalIncome.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-gray-500">Total Expense</p>
          <p className="text-xl font-bold text-red-600">Rs. {totalExpense.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-gray-500">Net Balance</p>
          <p className={`text-xl font-bold ${(totalIncome - totalExpense) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            Rs. {(totalIncome - totalExpense).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="stat-card mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="input-field pl-10"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value as typeof filterType); setPage(1) }}
            className="input-field w-auto"
          >
            <option value="All">All</option>
            <option value="Income">Income Only</option>
            <option value="Expense">Expense Only</option>
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
            className="input-field w-auto"
            placeholder="From"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
            className="input-field w-auto"
            placeholder="To"
          />
        </div>
      </div>

      <div className="stat-card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="table-cell">Date</th>
              <th className="table-cell">Particulars</th>
              <th className="table-cell">Category</th>
              <th className="table-cell">Income (Rs)</th>
              <th className="table-cell">Expense (Rs)</th>
              <th className="table-cell">Payment Mode</th>
              <th className="table-cell">Order No</th>
              <th className="table-cell">Balance (Rs)</th>
              <th className="table-cell">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="table-cell text-center text-gray-400 py-8">
                  Loading...
                </td>
              </tr>
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={9} className="table-cell text-center text-gray-400 py-8">
                  No transactions found
                </td>
              </tr>
            ) : (
              paged.map((t) => (
                <tr key={t.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="table-cell">
                    {t.date ? new Date(t.date).toLocaleDateString('en-PK') : '-'}
                  </td>
                  <td className="table-cell">{t.particulars}</td>
                  <td className="table-cell">
                    {t.category && (
                      <span className="status-badge bg-gray-100 text-gray-700">{t.category}</span>
                    )}
                  </td>
                  <td className="table-cell text-green-600 font-medium">
                    {(t.income || 0) > 0 ? `Rs. ${(t.income || 0).toLocaleString()}` : '-'}
                  </td>
                  <td className="table-cell text-red-600 font-medium">
                    {(t.expense || 0) > 0 ? `Rs. ${(t.expense || 0).toLocaleString()}` : '-'}
                  </td>
                  <td className="table-cell">{t.payment_mode}</td>
                  <td className="table-cell">{t.related_order_no || '-'}</td>
                  <td className="table-cell font-semibold">
                    Rs. {t.computedBalance.toLocaleString()}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEditModal(t)} className="text-blue-600 hover:text-blue-800">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDelete(t.id)} className="text-red-600 hover:text-red-800">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      <Modal isOpen={modalOpen} onClose={closeModal} title={editingTransaction ? 'Edit Transaction' : 'Add Transaction'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Date *</label>
              <input
                type="date"
                className="input-field"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <label className="label-text">Category</label>
              <select
                className="input-field"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label-text">Particulars / Detail *</label>
            <input
              type="text"
              className="input-field"
              value={form.particulars}
              onChange={(e) => setForm({ ...form, particulars: e.target.value })}
              placeholder="e.g., Wood purchase, Chair delivery, etc."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Income (Rs)</label>
              <input
                type="number"
                className="input-field"
                value={form.income}
                onChange={(e) => setForm({ ...form, income: Number(e.target.value), expense: 0 })}
              />
            </div>
            <div>
              <label className="label-text">Expense (Rs)</label>
              <input
                type="number"
                className="input-field"
                value={form.expense}
                onChange={(e) => setForm({ ...form, expense: Number(e.target.value), income: 0 })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Payment Mode</label>
              <select
                className="input-field"
                value={form.payment_mode}
                onChange={(e) => setForm({ ...form, payment_mode: e.target.value })}
              >
                {paymentModes.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label-text">Related Order No</label>
              <input
                type="text"
                className="input-field"
                value={form.related_order_no}
                onChange={(e) => setForm({ ...form, related_order_no: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label-text">Notes</label>
            <input
              type="text"
              className="input-field"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={closeModal} className="btn-secondary" disabled={saving}>Cancel</button>
          <button onClick={handleSave} className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
