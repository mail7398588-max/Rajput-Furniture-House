'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
const db = () => supabase()
import type { Customer, CashMemoItem } from '@/lib/types'
import { Printer } from 'lucide-react'
import { useToast } from '@/components/Toast'

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
  const [loadingCustomers, setLoadingCustomers] = useState(true)

  useEffect(() => {
    fetchCustomers()
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
        <button onClick={handlePrint} className="btn-primary flex items-center gap-2">
          <Printer size={16} /> Print Memo
        </button>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
        <div className="lg:col-span-2">
          <div className="stat-card">
            <h3 className="font-semibold text-warm-800 mb-4">Memo Details</h3>
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
            <h3 className="font-semibold text-warm-800 mb-4">Items</h3>
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
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-warm-100 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-warm-500">Total:</span>
                <span className="font-bold text-warm-900">Rs. {total.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-warm-500">Advance Received:</span>
                <input
                  type="number"
                  className="input-field w-32 text-right"
                  value={advanceReceived}
                  onChange={(e) => setAdvanceReceived(Number(e.target.value))}
                />
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span className="text-warm-700">Remaining:</span>
                <span className={remaining >= 0 ? 'text-green-600' : 'text-red-600'}>
                  Rs. {remaining.toLocaleString()}
                </span>
              </div>
            </div>
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
