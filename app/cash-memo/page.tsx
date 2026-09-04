'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
const db = () => supabase()
import type { Customer, CashMemoItem } from '@/lib/types'
import { Printer, Download } from 'lucide-react'
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
  const printRef = useRef<HTMLDivElement>(null)

  function handlePrint() {
    window.print()
  }

  async function handleDownloadPDF() {
    if (!printRef.current) return
    try {
      const html2canvas = (await import('html2canvas')).default
      const jsPDF = (await import('jspdf')).default

      const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)

      const customerName = selectedOrder?.customer_name || 'Customer'
      const fileName = `${customerName.replace(/\s+/g, '_')}_${memoNo}.pdf`
      pdf.save(fileName)
      toast('PDF downloaded', 'success')
    } catch {
      toast('Failed to generate PDF', 'error')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 no-print">
        <div>
          <h1 className="page-title">Cash Memo Generator</h1>
          <p className="page-subtitle">Generate printable receipts for customers</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleDownloadPDF} className="btn-secondary flex items-center gap-2">
            <Download size={16} /> Download PDF
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
      <div className="print-only" ref={printRef}>
        <div style={{ maxWidth: '520px', margin: '0 auto', padding: '0', fontFamily: "'Segoe UI', Arial, sans-serif", color: '#1a1a1a', background: '#fff' }}>

          {/* Header with decorative border */}
          <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', color: '#fff', padding: '20px 24px', textAlign: 'center', borderRadius: '0 0 8px 8px' }}>
            <div style={{ fontSize: '10px', letterSpacing: '4px', textTransform: 'uppercase', opacity: 0.7, marginBottom: '4px' }}>Welcome to</div>
            <h1 style={{ fontSize: '24px', fontWeight: '800', margin: 0, letterSpacing: '1px' }}>RAJPOOT FURNITURE HOUSE</h1>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '8px', fontSize: '11px', opacity: 0.85 }}>
              <span>Muhammad Abbas: 0300-8583823</span>
              <span style={{ opacity: 0.4 }}>|</span>
              <span>Junaid Abbas: 0318-6497054</span>
            </div>
          </div>

          {/* Decorative line */}
          <div style={{ height: '3px', background: 'linear-gradient(90deg, #C9A55C, #FFC726, #C9A55C)' }}></div>

          {/* Title */}
          <div style={{ textAlign: 'center', padding: '16px 24px 8px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a2e', margin: 0, letterSpacing: '3px' }}>CASH MEMO</h2>
            <div style={{ width: '60px', height: '2px', background: '#C9A55C', margin: '6px auto 0' }}></div>
          </div>

          {/* Memo Info */}
          <div style={{ padding: '0 24px 14px', fontSize: '12.5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span><strong style={{ color: '#1a1a2e' }}>Memo No:</strong> <span style={{ color: '#555' }}>{memoNo}</span></span>
              <span><strong style={{ color: '#1a1a2e' }}>Date:</strong> <span style={{ color: '#555' }}>{memoDate}</span></span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span><strong style={{ color: '#1a1a2e' }}>Name:</strong> <span style={{ color: '#555' }}>{selectedOrder?.customer_name || '___________________________'}</span></span>
              <span><strong style={{ color: '#1a1a2e' }}>Order No:</strong> <span style={{ color: '#555' }}>{selectedOrder?.order_no || '___________'}</span></span>
            </div>
            <div>
              <span><strong style={{ color: '#1a1a2e' }}>Phone:</strong> <span style={{ color: '#555' }}>{selectedOrder?.phone || '___________________________'}</span></span>
            </div>
          </div>

          <div style={{ height: '1px', background: '#e8e0d0', margin: '0 24px' }}></div>

          {/* Items Table */}
          <div style={{ padding: '14px 24px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr>
                  <th style={{ background: '#1a1a2e', color: '#fff', padding: '8px 6px', textAlign: 'center', fontWeight: '600', fontSize: '11px', letterSpacing: '0.5px' }}>S.No</th>
                  <th style={{ background: '#1a1a2e', color: '#fff', padding: '8px 6px', textAlign: 'left', fontWeight: '600', fontSize: '11px', letterSpacing: '0.5px' }}>Detail</th>
                  <th style={{ background: '#1a1a2e', color: '#fff', padding: '8px 6px', textAlign: 'right', fontWeight: '600', fontSize: '11px', letterSpacing: '0.5px' }}>Rate</th>
                  <th style={{ background: '#1a1a2e', color: '#fff', padding: '8px 6px', textAlign: 'center', fontWeight: '600', fontSize: '11px', letterSpacing: '0.5px' }}>Qty</th>
                  <th style={{ background: '#1a1a2e', color: '#fff', padding: '8px 6px', textAlign: 'right', fontWeight: '600', fontSize: '11px', letterSpacing: '0.5px' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e8e0d0' }}>
                    <td style={{ padding: '9px 6px', textAlign: 'center', color: '#888' }}>{item.sno}</td>
                    <td style={{ padding: '9px 6px', color: '#333' }}>{item.detail}</td>
                    <td style={{ padding: '9px 6px', textAlign: 'right', color: '#333' }}>{item.rate.toLocaleString()}</td>
                    <td style={{ padding: '9px 6px', textAlign: 'center', color: '#333' }}>{item.qty}</td>
                    <td style={{ padding: '9px 6px', textAlign: 'right', fontWeight: '600', color: '#1a1a2e' }}>{item.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ height: '1px', background: '#e8e0d0', margin: '0 24px' }}></div>

          {/* Totals */}
          <div style={{ padding: '14px 24px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#666' }}>TOTAL:</span>
              <span style={{ fontWeight: '700', fontSize: '14px', color: '#1a1a2e' }}>Rs. {total.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ color: '#666' }}>Advance Received:</span>
              <span style={{ color: '#333' }}>Rs. {advanceReceived.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #C9A55C', paddingTop: '8px' }}>
              <span style={{ fontWeight: '700', fontSize: '14px', color: '#1a1a2e' }}>REMAINING:</span>
              <span style={{ fontWeight: '700', fontSize: '15px', color: '#C9A55C' }}>Rs. {remaining.toLocaleString()}</span>
            </div>
          </div>

          {/* Thank You + Branding */}
          <div style={{ background: '#faf8f4', padding: '16px 24px', borderTop: '1px solid #e8e0d0' }}>
            <div style={{ fontSize: '12px', color: '#888', textAlign: 'center', marginBottom: '10px' }}>
              Thank you for choosing Rajput Furniture House!
            </div>

            {/* Furniture icons row */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '28px', marginBottom: '10px', opacity: 0.18 }}>
              {/* Sofa */}
              <svg width="32" height="28" viewBox="0 0 32 28" fill="none" stroke="#1a1a2e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 18v4M28 18v4"/>
                <path d="M6 18V12a2 2 0 012-2h16a2 2 0 012 2v6"/>
                <path d="M2 16a3 3 0 013-3h22a3 3 0 013 3v2H2v-2z"/>
                <path d="M6 12V9a1 1 0 011-1h3a1 1 0 011 1v3"/>
                <path d="M21 12V9a1 1 0 011-1h3a1 1 0 011 1v3"/>
              </svg>
              {/* Bed */}
              <svg width="32" height="28" viewBox="0 0 32 28" fill="none" stroke="#1a1a2e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="14" width="28" height="8" rx="1"/>
                <path d="M4 14v-3a2 2 0 012-2h4a2 2 0 012 2v3"/>
                <path d="M20 14v-3a2 2 0 012-2h4a2 2 0 012 2v3"/>
                <line x1="2" y1="22" x2="2" y2="25"/>
                <line x1="30" y1="22" x2="30" y2="25"/>
                <line x1="2" y1="18" x2="30" y2="18"/>
              </svg>
              {/* Chair */}
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#1a1a2e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2V10"/>
                <path d="M20 2V10"/>
                <path d="M6 10h16a1 1 0 011 1v4a1 1 0 01-1 1H6a1 1 0 01-1-1v-4a1 1 0 011-1z"/>
                <path d="M7 16v9M21 16v9"/>
                <path d="M10 16v4h8v-4"/>
              </svg>
              {/* Dining Table */}
              <svg width="30" height="28" viewBox="0 0 30 28" fill="none" stroke="#1a1a2e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="10" width="22" height="3" rx="1"/>
                <line x1="7" y1="13" x2="6" y2="25"/>
                <line x1="23" y1="13" x2="24" y2="25"/>
                <line x1="15" y1="13" x2="15" y2="25"/>
              </svg>
            </div>

            {/* Bottom watermark */}
            <div style={{ textAlign: 'center', opacity: 0.08 }}>
              <div style={{ fontSize: '14px', fontWeight: '800', letterSpacing: '2px', color: '#1a1a2e' }}>RAJPUT FURNITURE HOUSE</div>
              <div style={{ fontSize: '9px', marginTop: '2px', color: '#1a1a2e' }}>Crafting Quality Furniture Since Years</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
