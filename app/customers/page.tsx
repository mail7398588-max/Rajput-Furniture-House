'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
const db = () => supabase()
import type { Customer } from '@/lib/types'
import Modal from '@/components/Modal'
import Pagination from '@/components/Pagination'
import { useToast } from '@/components/Toast'
import { exportToCSV } from '@/lib/export'
import { Plus, Search, Edit, Trash2, Download } from 'lucide-react'

const ROWS_PER_PAGE = 15

const statusColors: Record<string, string> = {
  Pending: 'bg-yellow-100 text-yellow-800',
  'In Progress': 'bg-blue-100 text-blue-800',
  Completed: 'bg-green-100 text-green-800',
  Delivered: 'bg-purple-100 text-purple-800',
  Cancelled: 'bg-red-100 text-red-800',
}

const emptyCustomer: Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'remaining'> = {
  serial_no: null,
  order_no: '',
  order_date: null,
  customer_name: '',
  phone: '',
  item: '',
  details: '',
  order_amount: 0,
  advance: 0,
  delivery_date: null,
  status: 'Pending',
  notes: '',
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [form, setForm] = useState(emptyCustomer)
  const [page, setPage] = useState(1)
  const toast = useToast()

  useEffect(() => {
    fetchCustomers()
  }, [])

  async function fetchCustomers() {
    try {
      const { data, error } = await db()
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setCustomers((data || []) as Customer[])
    } catch (err) {
      toast('Failed to load customers', 'error')
    } finally {
      setLoading(false)
    }
  }

  function openAdd() {
    setEditingCustomer(null)
    setForm({ ...emptyCustomer, serial_no: null })
    setModalOpen(true)
  }

  function openEdit(c: Customer) {
    setEditingCustomer(c)
    setForm({
      serial_no: c.serial_no,
      order_no: c.order_no,
      order_date: c.order_date,
      customer_name: c.customer_name,
      phone: c.phone,
      item: c.item,
      details: c.details,
      order_amount: c.order_amount,
      advance: c.advance,
      delivery_date: c.delivery_date,
      status: c.status,
      notes: c.notes,
    })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.order_no || !form.customer_name) {
      toast('Order No and Customer Name are required', 'error')
      return
    }

    setSaving(true)
    try {
      if (editingCustomer) {
        const { error } = await db().from('customers').update(form).eq('id', editingCustomer.id)
        if (error) throw error
        toast('Customer updated', 'success')
      } else {
        const { error } = await db().from('customers').insert([{ ...form, serial_no: null }])
        if (error) throw error
        toast('Customer added', 'success')
      }
      setModalOpen(false)
      await fetchCustomers()
    } catch (err) {
      toast('Operation failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this customer?')) return
    setSaving(true)
    try {
      const { error } = await db().from('customers').delete().eq('id', id)
      if (error) throw error
      toast('Customer deleted', 'success')
      await fetchCustomers()
    } catch (err) {
      toast('Delete failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const filtered = customers.filter((c) => {
    const matchSearch =
      !search ||
      c.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.order_no?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.toLowerCase().includes(search.toLowerCase()) ||
      c.item?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'All' || c.status === filterStatus
    return matchSearch && matchStatus
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE))
  const paged = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE)

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  function handleStatusChange(value: string) {
    setFilterStatus(value)
    setPage(1)
  }

  function handleExport() {
    if (filtered.length === 0) {
      toast('No data to export', 'error')
      return
    }
    exportToCSV(filtered, 'customers')
    toast('CSV exported', 'success')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Register</h1>
          <p className="text-sm text-gray-500 mt-1">{customers.length} total customers</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
            <Download size={16} /> Download CSV
          </button>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Customer
          </button>
        </div>
      </div>

      <div className="stat-card mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, order no, phone, item..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="input-field w-auto"
          >
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      <div className="stat-card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="table-header">
              <th className="table-cell">S.No</th>
              <th className="table-cell">Order No</th>
              <th className="table-cell">Date</th>
              <th className="table-cell">Customer</th>
              <th className="table-cell">Phone</th>
              <th className="table-cell">Item</th>
              <th className="table-cell">Amount</th>
              <th className="table-cell">Advance</th>
              <th className="table-cell">Remaining</th>
              <th className="table-cell">Delivery</th>
              <th className="table-cell">Status</th>
              <th className="table-cell">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={12} className="table-cell text-center text-gray-400 py-8">
                  Loading...
                </td>
              </tr>
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={12} className="table-cell text-center text-gray-400 py-8">
                  No customers found
                </td>
              </tr>
            ) : (
              paged.map((c, i) => (
                <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="table-cell">{(page - 1) * ROWS_PER_PAGE + i + 1}</td>
                  <td className="table-cell font-medium">{c.order_no}</td>
                  <td className="table-cell">
                    {c.order_date ? new Date(c.order_date).toLocaleDateString('en-PK') : '-'}
                  </td>
                  <td className="table-cell">{c.customer_name}</td>
                  <td className="table-cell">{c.phone}</td>
                  <td className="table-cell">{c.item}</td>
                  <td className="table-cell">Rs. {(c.order_amount || 0).toLocaleString()}</td>
                  <td className="table-cell">Rs. {(c.advance || 0).toLocaleString()}</td>
                  <td className="table-cell">Rs. {(c.remaining || 0).toLocaleString()}</td>
                  <td className="table-cell">
                    {c.delivery_date ? new Date(c.delivery_date).toLocaleDateString('en-PK') : '-'}
                  </td>
                  <td className="table-cell">
                    <span className={`status-badge ${statusColors[c.status] || 'bg-gray-100 text-gray-800'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(c)}
                        disabled={saving}
                        className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        disabled={saving}
                        className="text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {filtered.length > ROWS_PER_PAGE && (
          <div className="mt-4">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCustomer ? 'Edit Customer' : 'Add Customer'}
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-text">Order No *</label>
            <input
              type="text"
              className="input-field"
              value={form.order_no}
              onChange={(e) => setForm({ ...form, order_no: e.target.value })}
            />
          </div>
          <div>
            <label className="label-text">Order Date</label>
            <input
              type="date"
              className="input-field"
              value={form.order_date || ''}
              onChange={(e) => setForm({ ...form, order_date: e.target.value })}
            />
          </div>
          <div>
            <label className="label-text">Customer Name *</label>
            <input
              type="text"
              className="input-field"
              value={form.customer_name || ''}
              onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
            />
          </div>
          <div>
            <label className="label-text">Phone</label>
            <input
              type="text"
              className="input-field"
              value={form.phone || ''}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="label-text">Item / Furniture</label>
            <input
              type="text"
              className="input-field"
              value={form.item || ''}
              onChange={(e) => setForm({ ...form, item: e.target.value })}
            />
          </div>
          <div>
            <label className="label-text">Status</label>
            <select
              className="input-field"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as Customer['status'] })}
            >
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="label-text">Details / Specs</label>
            <textarea
              className="input-field"
              rows={2}
              value={form.details || ''}
              onChange={(e) => setForm({ ...form, details: e.target.value })}
            />
          </div>
          <div>
            <label className="label-text">Order Amount (Rs)</label>
            <input
              type="number"
              className="input-field"
              value={form.order_amount}
              onChange={(e) => setForm({ ...form, order_amount: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="label-text">Advance (Rs)</label>
            <input
              type="number"
              className="input-field"
              value={form.advance}
              onChange={(e) => setForm({ ...form, advance: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="label-text">Delivery Date</label>
            <input
              type="date"
              className="input-field"
              value={form.delivery_date || ''}
              onChange={(e) => setForm({ ...form, delivery_date: e.target.value })}
            />
          </div>
          <div>
            <label className="label-text">Notes</label>
            <input
              type="text"
              className="input-field"
              value={form.notes || ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setModalOpen(false)} className="btn-secondary" disabled={saving}>
            Cancel
          </button>
          <button onClick={handleSave} className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : editingCustomer ? 'Update' : 'Save'}
          </button>
        </div>
      </Modal>
    </div>
  )
}