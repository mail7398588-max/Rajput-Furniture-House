'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
const db = () => supabase()
import type { Order, Customer } from '@/lib/types'
import Modal from '@/components/Modal'
import Pagination from '@/components/Pagination'
import { useToast } from '@/components/Toast'
import { exportToCSV } from '@/lib/export'
import { Plus, Search, Edit, Trash2, Download } from 'lucide-react'

type OrderWithCustomer = Order & { customers?: Customer }

export default function OrdersPage() {
  const { toast } = useToast()
  const [orders, setOrders] = useState<OrderWithCustomer[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<OrderWithCustomer | null>(null)
  const [form, setForm] = useState({
    order_no: '',
    material_cost: 0,
    labour_cost: 0,
    transport_cost: 0,
    other_cost: 0,
  })

  const ROWS_PER_PAGE = 15

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const [ordersRes, customersRes] = await Promise.all([
        db().from('orders').select('*, customers(*)').order('created_at', { ascending: false }),
        db().from('customers').select('*'),
      ])
      if (ordersRes.error) throw ordersRes.error
      if (customersRes.error) throw customersRes.error
      setOrders((ordersRes.data || []) as OrderWithCustomer[])
      setCustomers((customersRes.data || []) as Customer[])
    } catch (err: any) {
      toast(err.message || 'Failed to fetch data', 'error')
    } finally {
      setLoading(false)
    }
  }

  function openAdd() {
    setEditingOrder(null)
    setForm({ order_no: '', material_cost: 0, labour_cost: 0, transport_cost: 0, other_cost: 0 })
    setModalOpen(true)
  }

  function openEdit(o: OrderWithCustomer) {
    setEditingOrder(o)
    setForm({
      order_no: o.order_no,
      material_cost: o.material_cost,
      labour_cost: o.labour_cost,
      transport_cost: o.transport_cost,
      other_cost: o.other_cost,
    })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.order_no) {
      toast('Please select an order', 'error')
      return
    }
    setSaving(true)
    try {
      let error
      if (editingOrder) {
        ;({ error } = await db().from('orders').update(form).eq('id', editingOrder.id))
      } else {
        ;({ error } = await db().from('orders').insert([form]))
      }
      if (error) throw error
      toast(editingOrder ? 'Order P&L updated' : 'Order P&L added', 'success')
      setModalOpen(false)
      fetchData()
    } catch (err: any) {
      toast(err.message || 'Failed to save order P&L', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this order P&L record?')) return
    setSaving(true)
    try {
      const { error } = await db().from('orders').delete().eq('id', id)
      if (error) throw error
      toast('Order P&L deleted', 'success')
      fetchData()
    } catch (err: any) {
      toast(err.message || 'Failed to delete order P&L', 'error')
    } finally {
      setSaving(false)
    }
  }

  const filtered = orders.filter(
    (o) =>
      !search ||
      o.order_no?.toLowerCase().includes(search.toLowerCase()) ||
      o.customers?.customer_name?.toLowerCase().includes(search.toLowerCase())
  )

  const totalPages = Math.ceil(filtered.length / ROWS_PER_PAGE)
  const paginated = filtered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE)

  const totalRevenue = filtered.reduce((sum, o) => sum + (o.customers?.order_amount || 0), 0)
  const totalExpenses = filtered.reduce((sum, o) => sum + (o.total_expense || 0), 0)
  const totalProfit = totalRevenue - totalExpenses

  function handleExport() {
    const rows = filtered.map((o) => ({
      'Order No': o.order_no,
      'Customer': o.customers?.customer_name || '-',
      'Order Amount': o.customers?.order_amount || 0,
      'Material': o.material_cost || 0,
      'Labour': o.labour_cost || 0,
      'Transport': o.transport_cost || 0,
      'Other': o.other_cost || 0,
      'Total Expense': o.total_expense || 0,
      'Profit/Loss': (o.customers?.order_amount || 0) - (o.total_expense || 0),
    }))
    exportToCSV(rows, 'orders_pnl')
    toast('CSV exported successfully', 'success')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Orders P&L</h1>
          <p className="page-subtitle">{orders.length} orders tracked</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
            <Download size={16} /> Export CSV
          </button>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Order P&L
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="stat-card">
          <p className="text-sm text-gray-500">Total Revenue</p>
          <p className="text-xl font-bold text-green-600">Rs. {totalRevenue.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-gray-500">Total Expenses</p>
          <p className="text-xl font-bold text-red-600">Rs. {totalExpenses.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-gray-500">Net Profit/Loss</p>
          <p className={`text-xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            Rs. {totalProfit.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="stat-card mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by order no or customer name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="input-field pl-10"
          />
        </div>
      </div>

      <div className="stat-card p-0">
        <div className="table-scroll-container">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="table-header">
                <th className="table-cell">Order No</th>
                <th className="table-cell">Customer</th>
                <th className="table-cell">Order Amount</th>
                <th className="table-cell">Material</th>
                <th className="table-cell">Labour</th>
                <th className="table-cell">Transport</th>
                <th className="table-cell">Other</th>
                <th className="table-cell">Total Expense</th>
                <th className="table-cell">Profit/Loss</th>
                <th className="table-cell">Actions</th>
              </tr>
            </thead>
            <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="table-cell text-center text-gray-400 py-8">
                  Loading...
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={10} className="table-cell text-center text-gray-400 py-8">
                  No orders found
                </td>
              </tr>
            ) : (
              paginated.map((o) => {
                const revenue = o.customers?.order_amount || 0
                const pl = revenue - (o.total_expense || 0)
                return (
                  <tr key={o.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="table-cell font-medium">{o.order_no}</td>
                    <td className="table-cell">{o.customers?.customer_name || '-'}</td>
                    <td className="table-cell">Rs. {revenue.toLocaleString()}</td>
                    <td className="table-cell">Rs. {(o.material_cost || 0).toLocaleString()}</td>
                    <td className="table-cell">Rs. {(o.labour_cost || 0).toLocaleString()}</td>
                    <td className="table-cell">Rs. {(o.transport_cost || 0).toLocaleString()}</td>
                    <td className="table-cell">Rs. {(o.other_cost || 0).toLocaleString()}</td>
                    <td className="table-cell font-medium">Rs. {(o.total_expense || 0).toLocaleString()}</td>
                    <td className="table-cell">
                      <span
                        className={`font-semibold ${
                          pl >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        Rs. {pl.toLocaleString()}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(o)} className="text-blue-600 hover:text-blue-800" disabled={saving}>
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDelete(o.id)} className="text-red-600 hover:text-red-800" disabled={saving}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
          </table>
        </div>
        {!loading && filtered.length > ROWS_PER_PAGE && (
          <div className="px-4 py-3 border-t border-warm-100">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingOrder ? 'Edit Order P&L' : 'Add Order P&L'}
      >
        <div className="space-y-4">
          <div>
            <label className="label-text">Order No *</label>
            <select
              className="input-field"
              value={form.order_no}
              onChange={(e) => setForm({ ...form, order_no: e.target.value })}
              disabled={!!editingOrder}
            >
              <option value="">Select Order</option>
              {customers.map((c) => (
                <option key={c.order_no} value={c.order_no}>
                  {c.order_no} - {c.customer_name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-text">Material Cost (Rs)</label>
              <input
                type="number"
                className="input-field"
                value={form.material_cost}
                onChange={(e) => setForm({ ...form, material_cost: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="label-text">Labour Cost (Rs)</label>
              <input
                type="number"
                className="input-field"
                value={form.labour_cost}
                onChange={(e) => setForm({ ...form, labour_cost: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="label-text">Transport Cost (Rs)</label>
              <input
                type="number"
                className="input-field"
                value={form.transport_cost}
                onChange={(e) => setForm({ ...form, transport_cost: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="label-text">Other Cost (Rs)</label>
              <input
                type="number"
                className="input-field"
                value={form.other_cost}
                onChange={(e) => setForm({ ...form, other_cost: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Expense:</span>
              <span className="font-semibold">
                Rs. {(form.material_cost + form.labour_cost + form.transport_cost + form.other_cost).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setModalOpen(false)} className="btn-secondary" disabled={saving}>
            Cancel
          </button>
          <button onClick={handleSave} className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : editingOrder ? 'Update' : 'Save'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
