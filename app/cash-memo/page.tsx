'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
const db = () => supabase()
import type { Customer, CashMemoItem } from '@/lib/types'
import { Printer, Plus, Trash2, Save, RotateCcw, FileText } from 'lucide-react'
import { useToast } from '@/components/Toast'

interface SavedMemo {
  id: string
  memo_no: string
  memo_date: string
  order_no: string
  customer_name: string
  phone: string
  items: CashMemoItem[]
  advance_received: number
  total: number
  remaining: number
  created_at: string
}

export default function CashMemoPage() {
  const { toast } = useToast()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Customer | null>(null)
  const [memoNo, setMemoNo] = useState('')
  const [memoDate, setMemoDate] = useState(new Date().toISOString().split('T')[0])
  const [items, setItems] = useState<CashMemoItem[]>([
    { sno: 1, detail: '', rate: 0, qty: 1, amount: 0 },
  ])
  const [advanceReceived, setAdvanceReceived] = useState(0)
  const [saving, setSaving] = useState(false)
  const [loadingCustomers, setLoadingCustomers] = useState(true)
  const [loadingMemos, setLoadingMemos] = useState(true)
  const [pastMemos, setPastMemos] = useState<SavedMemo[]>([])
  const [loadingPastMemos, setLoadingPastMemos] = useState(false)

  useEffect(() => {
    fetchCustomers()
    fetchPastMemos()
    setMemoNo(`CM-${Date.now().toString().slice(-6)}`)
  }, [])

  async function fetchCustomers() {
    setLoadingCustomers(true)
    try {
      const { data, error } = await db()
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setCustomers((data || []) as Customer[])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load customers'
      toast(msg, 'error')
    } finally {
      setLoadingCustomers(false)
    }
  }

  async function fetchPastMemos() {
    setLoadingMemos(true)
    try {
      const { data, error } = await db()
        .from('cash_memos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      setPastMemos((data || []) as SavedMemo[])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load past memos'
      toast(msg, 'error')
    } finally {
      setLoadingMemos(false)
    }
  }

  function handleOrderSelect(orderNo: string) {
    const customer = customers.find((c) => c.order_no === orderNo)
    if (customer) {
      setSelectedOrder(customer)
      setAdvanceReceived(customer.advance || 0)

      const detail = [customer.item, customer.details].filter(Boolean).join(' - ') || ''
      const rate = customer.order_amount || 0
      setItems([{ sno: 1, detail, rate, qty: 1, amount: rate }])
    }
  }

  function addItem() {
    setItems([
      ...items,
      { sno: items.length + 1, detail: '', rate: 0, qty: 1, amount: 0 },
    ])
  }

  function removeItem(index: number) {
    const updated = items.filter((_, i) => i !== index)
    setItems(updated.map((item, i) => ({ ...item, sno: i + 1 })))
  }

  function updateItem(index: number, field: keyof CashMemoItem, value: string | number) {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    if (field === 'rate' || field === 'qty') {
      updated[index].amount = updated[index].rate * updated[index].qty
    }
    setItems(updated)
  }

  const total = items.reduce((sum, item) => sum + item.amount, 0)
  const remaining = total - advanceReceived

  function resetForm() {
    setMemoNo(`CM-${Date.now().toString().slice(-6)}`)
    setMemoDate(new Date().toISOString().split('T')[0])
    setSelectedOrder(null)
    setItems([{ sno: 1, detail: '', rate: 0, qty: 1, amount: 0 }])
    setAdvanceReceived(0)
    toast('New memo started', 'success')
  }

  async function saveMemo() {
    if (!memoNo.trim()) {
      toast('Memo number is required', 'error')
      return
    }
    setSaving(true)
    try {
      const payload = {
        memo_no: memoNo,
        memo_date: memoDate,
        order_no: selectedOrder?.order_no || '',
        customer_name: selectedOrder?.customer_name || '',
        phone: selectedOrder?.phone || '',
        items: items,
        advance_received: advanceReceived,
        total: total,
        remaining: remaining,
      }
      const { error } = await db()
        .from('cash_memos')
        .insert(payload)
      if (error) throw error
      toast('Memo saved successfully', 'success')
      fetchPastMemos()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save memo'
      toast(msg, 'error')
    } finally {
      setSaving(false)
    }
  }

  function loadMemo(memo: SavedMemo) {
    setMemoNo(memo.memo_no)
    setMemoDate(memo.memo_date)
    setItems(memo.items.length > 0 ? memo.items : [{ sno: 1, detail: '', rate: 0, qty: 1, amount: 0 }])
    setAdvanceReceived(memo.advance_received)
    const customer = customers.find((c) => c.order_no === memo.order_no) || null
    setSelectedOrder(customer)
    toast(`Loaded memo ${memo.memo_no}`, 'success')
  }

  function handlePrint() {
    window.print()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 no-print">
        <div>
          <h1 className="page-title">Cash Memo Generator</h1>
          <p className="page-subtitle">Generate printable receipts for customers</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={resetForm}
            className="btn-secondary flex items-center gap-2"
          >
            <RotateCcw size={16} /> New Memo
          </button>
          <button
            onClick={saveMemo}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            <Save size={16} /> {saving ? 'Saving...' : 'Save Memo'}
          </button>
          <button onClick={handlePrint} className="btn-primary flex items-center gap-2">
            <Printer size={16} /> Print Memo
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
        <div className="lg:col-span-2">
          <div className="stat-card">
            <h3 className="font-semibold text-gray-700 mb-4">Memo Details</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="label-text">Memo No</label>
                <input
                  type="text"
                  className="input-field"
                  value={memoNo}
                  onChange={(e) => setMemoNo(e.target.value)}
                />
              </div>
              <div>
                <label className="label-text">Date</label>
                <input
                  type="date"
                  className="input-field"
                  value={memoDate}
                  onChange={(e) => setMemoDate(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="label-text">Select Order No</label>
                <select
                  className="input-field"
                  onChange={(e) => handleOrderSelect(e.target.value)}
                  value={selectedOrder?.order_no || ''}
                  disabled={loadingCustomers}
                >
                  <option value="">{loadingCustomers ? 'Loading...' : 'Select Order'}</option>
                  {customers.map((c) => (
                    <option key={c.order_no} value={c.order_no}>
                      {c.order_no} - {c.customer_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-text">Phone</label>
                <input
                  type="text"
                  className="input-field"
                  value={selectedOrder?.phone || ''}
                  readOnly
                />
              </div>
            </div>
          </div>

          <div className="stat-card mt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-700">Items</h3>
              <button onClick={addItem} className="btn-primary text-xs flex items-center gap-1">
                <Plus size={14} /> Add Item
              </button>
            </div>
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex gap-3 items-end">
                  <div className="w-12">
                    <label className="label-text text-xs">S.No</label>
                    <input
                      type="number"
                      className="input-field"
                      value={item.sno}
                      readOnly
                    />
                  </div>
                  <div className="flex-1">
                    <label className="label-text text-xs">Detail</label>
                    <input
                      type="text"
                      className="input-field"
                      value={item.detail}
                      onChange={(e) => updateItem(index, 'detail', e.target.value)}
                      placeholder="Item description"
                    />
                  </div>
                  <div className="w-24">
                    <label className="label-text text-xs">Rate</label>
                    <input
                      type="number"
                      className="input-field"
                      value={item.rate}
                      onChange={(e) => updateItem(index, 'rate', Number(e.target.value))}
                    />
                  </div>
                  <div className="w-16">
                    <label className="label-text text-xs">Qty</label>
                    <input
                      type="number"
                      className="input-field"
                      value={item.qty}
                      onChange={(e) => updateItem(index, 'qty', Number(e.target.value))}
                      min={1}
                    />
                  </div>
                  <div className="w-28">
                    <label className="label-text text-xs">Amount</label>
                    <input
                      type="number"
                      className="input-field"
                      value={item.amount}
                      readOnly
                    />
                  </div>
                  <button
                    onClick={() => removeItem(index)}
                    className="text-red-500 hover:text-red-700 mb-0.5"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total:</span>
                <span className="font-bold">Rs. {total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Advance Received:</span>
                <input
                  type="number"
                  className="input-field w-32 text-right"
                  value={advanceReceived}
                  onChange={(e) => setAdvanceReceived(Number(e.target.value))}
                />
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span>Remaining:</span>
                <span className={remaining >= 0 ? 'text-green-600' : 'text-red-600'}>
                  Rs. {remaining.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="stat-card">
            <h3 className="font-semibold text-gray-700 mb-2">Preview</h3>
            <p className="text-xs text-gray-400">Click Print to generate the memo</p>
          </div>

          <div className="stat-card mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <FileText size={16} /> Past Memos
              </h3>
              <button
                onClick={fetchPastMemos}
                disabled={loadingPastMemos}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                {loadingPastMemos ? 'Loading...' : 'Refresh'}
              </button>
            </div>
            {loadingMemos ? (
              <p className="text-sm text-gray-400">Loading memos...</p>
            ) : pastMemos.length === 0 ? (
              <p className="text-sm text-gray-400">No saved memos yet</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {pastMemos.map((memo) => (
                  <button
                    key={memo.id}
                    onClick={() => loadMemo(memo)}
                    className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">{memo.memo_no}</span>
                      <span className="text-xs text-gray-400">{memo.memo_date}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {memo.customer_name || 'N/A'} — Rs. {memo.total.toLocaleString()}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Print Layout */}
      <div className="print-only">
        <div style={{ maxWidth: '500px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
          <div style={{ textAlign: 'center', borderBottom: '2px solid black', paddingBottom: '12px', marginBottom: '12px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: 0 }}>RAJPOOT FURNITURE</h1>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>
              Muhammad Abbas: 0300-8583823 | Junaid Abbas: 0318-6497054
            </p>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 'bold' }}>CASH MEMO</h2>
          </div>

          <div style={{ fontSize: '13px', marginBottom: '12px', borderBottom: '1px solid #ccc', paddingBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span><strong>Memo No:</strong> {memoNo}</span>
              <span><strong>Date:</strong> {memoDate}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
              <span><strong>Name:</strong> {selectedOrder?.customer_name || '_______________'}</span>
              <span><strong>Order No:</strong> {selectedOrder?.order_no || '_______________'}</span>
            </div>
            <div style={{ marginTop: '4px' }}>
              <span><strong>Phone:</strong> {selectedOrder?.phone || '_______________'}</span>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f0f0f0' }}>
                <th style={{ border: '1px solid #ccc', padding: '6px' }}>S.No</th>
                <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'left' }}>Detail</th>
                <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'right' }}>Rate</th>
                <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center' }}>Qty</th>
                <th style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i}>
                  <td style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center' }}>{item.sno}</td>
                  <td style={{ border: '1px solid #ccc', padding: '6px' }}>{item.detail}</td>
                  <td style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'right' }}>{item.rate.toLocaleString()}</td>
                  <td style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'center' }}>{item.qty}</td>
                  <td style={{ border: '1px solid #ccc', padding: '6px', textAlign: 'right' }}>{item.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ fontSize: '13px', borderTop: '1px solid #ccc', paddingTop: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <strong>TOTAL:</strong>
              <strong>Rs. {total.toLocaleString()}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span>Advance Received:</span>
              <span>Rs. {advanceReceived.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #ccc', paddingTop: '4px', fontWeight: 'bold', fontSize: '15px' }}>
              <span>REMAINING:</span>
              <span>Rs. {remaining.toLocaleString()}</span>
            </div>
          </div>

          <div style={{ marginTop: '30px', borderTop: '1px solid #ccc', paddingTop: '8px', fontSize: '11px', color: '#888', textAlign: 'center' }}>
            Thank you for your business!
          </div>

          <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', paddingTop: '8px' }}>
            <div style={{ borderTop: '1px solid #333', width: '40%', textAlign: 'center', paddingTop: '4px', fontSize: '11px' }}>
              Customer Signature
            </div>
            <div style={{ borderTop: '1px solid #333', width: '40%', textAlign: 'center', paddingTop: '4px', fontSize: '11px' }}>
              Authorized Signature
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
