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
        <div style={{ maxWidth: '540px', margin: '0 auto', fontFamily: "'Segoe UI', Arial, sans-serif", color: '#1a1a1a', background: '#fff', position: 'relative', overflow: 'hidden' }}>

          {/* Background decorative pattern */}
          <div style={{ position: 'absolute', top: 0, right: 0, width: '220px', height: '220px', background: 'radial-gradient(circle at top right, rgba(201,165,92,0.08) 0%, transparent 70%)', pointerEvents: 'none' }}></div>
          <div style={{ position: 'absolute', bottom: 0, left: 0, width: '180px', height: '180px', background: 'radial-gradient(circle at bottom left, rgba(26,26,46,0.04) 0%, transparent 70%)', pointerEvents: 'none' }}></div>

          {/* Top Section - Header with Sofa */}
          <div style={{ display: 'flex', alignItems: 'stretch', minHeight: '180px' }}>
            {/* Left - Branding */}
            <div style={{ flex: 1, padding: '28px 20px 20px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '10px', letterSpacing: '5px', textTransform: 'uppercase', color: '#C9A55C', fontWeight: '600', marginBottom: '4px' }}>Welcome to</div>
              <h1 style={{ fontSize: '28px', fontWeight: '800', margin: 0, color: '#1a1a2e', lineHeight: '1.1', letterSpacing: '-0.5px' }}>RAJPOOT</h1>
              <h1 style={{ fontSize: '28px', fontWeight: '800', margin: 0, color: '#1a1a2e', lineHeight: '1.1', letterSpacing: '-0.5px' }}>FURNITURE</h1>
              <div style={{ width: '50px', height: '3px', background: 'linear-gradient(90deg, #C9A55C, #FFC726)', margin: '10px 0', borderRadius: '2px' }}></div>
              <div style={{ fontSize: '10px', color: '#888', lineHeight: '1.6' }}>
                Muhammad Abbas: 0300-8583823<br/>
                Junaid Abbas: 0318-6497054
              </div>
            </div>

            {/* Right - 3D Sofa SVG */}
            <div style={{ width: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <svg width="190" height="150" viewBox="0 0 190 150" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Shadow */}
                <ellipse cx="95" cy="140" rx="80" ry="8" fill="rgba(0,0,0,0.08)"/>
                {/* Sofa back - tufted */}
                <path d="M30 55 C30 30, 50 18, 95 18 C140 18, 160 30, 160 55 L160 85 C160 88, 158 90, 155 90 L35 90 C32 90, 30 88, 30 85 Z" fill="url(#sofaBack)"/>
                {/* Tufting lines */}
                <path d="M55 28 L55 82" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
                <path d="M75 22 L75 82" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
                <path d="M95 20 L95 82" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
                <path d="M115 22 L115 82" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
                <path d="M135 28 L135 82" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
                {/* Tufting buttons */}
                <circle cx="55" cy="45" r="2.5" fill="rgba(201,165,92,0.4)"/>
                <circle cx="75" cy="42" r="2.5" fill="rgba(201,165,92,0.4)"/>
                <circle cx="95" cy="40" r="2.5" fill="rgba(201,165,92,0.4)"/>
                <circle cx="115" cy="42" r="2.5" fill="rgba(201,165,92,0.4)"/>
                <circle cx="135" cy="45" r="2.5" fill="rgba(201,165,92,0.4)"/>
                {/* Sofa seat */}
                <path d="M22 85 L22 105 C22 110, 26 113, 30 113 L160 113 C164 113, 168 110, 168 105 L168 85 Z" fill="url(#sofaSeat)"/>
                {/* Seat cushion line */}
                <path d="M95 88 L95 110" stroke="rgba(0,0,0,0.08)" strokeWidth="1"/>
                {/* Left armrest */}
                <path d="M12 55 C8 55, 5 60, 5 70 L5 105 C5 112, 10 115, 16 115 L22 115 L22 55 Z" fill="url(#armrest)"/>
                {/* Right armrest */}
                <path d="M178 55 C182 55, 185 60, 185 70 L185 105 C185 112, 180 115, 174 115 L168 115 L168 55 Z" fill="url(#armrest)"/>
                {/* Legs */}
                <rect x="30" y="113" width="6" height="16" rx="1.5" fill="#8B7355"/>
                <rect x="154" y="113" width="6" height="16" rx="1.5" fill="#8B7355"/>
                <rect x="75" y="113" width="5" height="14" rx="1.5" fill="#8B7355"/>
                <rect x="110" y="113" width="5" height="14" rx="1.5" fill="#8B7355"/>
                {/* Cushion highlight */}
                <path d="M35 90 Q95 80, 155 90" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" fill="none"/>
                {/* Pillows */}
                <ellipse cx="50" cy="65" rx="18" ry="14" fill="url(#pillow1)" opacity="0.9"/>
                <ellipse cx="140" cy="65" rx="18" ry="14" fill="url(#pillow2)" opacity="0.9"/>
                <defs>
                  <linearGradient id="sofaBack" x1="95" y1="18" x2="95" y2="90">
                    <stop offset="0%" stopColor="#F5F0E8"/>
                    <stop offset="100%" stopColor="#E8DFD0"/>
                  </linearGradient>
                  <linearGradient id="sofaSeat" x1="95" y1="85" x2="95" y2="113">
                    <stop offset="0%" stopColor="#EDE5D8"/>
                    <stop offset="100%" stopColor="#DDD4C4"/>
                  </linearGradient>
                  <linearGradient id="armrest" x1="0" y1="55" x2="0" y2="115">
                    <stop offset="0%" stopColor="#F0E8DC"/>
                    <stop offset="100%" stopColor="#DDD4C4"/>
                  </linearGradient>
                  <linearGradient id="pillow1" x1="50" y1="51" x2="50" y2="79">
                    <stop offset="0%" stopColor="#C9A55C"/>
                    <stop offset="100%" stopColor="#B8944A"/>
                  </linearGradient>
                  <linearGradient id="pillow2" x1="140" y1="51" x2="140" y2="79">
                    <stop offset="0%" stopColor="#1a1a2e"/>
                    <stop offset="100%" stopColor="#16213e"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          {/* Gold accent line */}
          <div style={{ height: '4px', background: 'linear-gradient(90deg, #C9A55C 0%, #FFC726 50%, #C9A55C 100%)' }}></div>

          {/* CASH MEMO Title */}
          <div style={{ padding: '18px 28px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#1a1a2e', margin: 0, letterSpacing: '4px' }}>CASH MEMO</h2>
              <div style={{ width: '40px', height: '2px', background: '#C9A55C', marginTop: '4px' }}></div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '12px' }}>
              <div><strong style={{ color: '#1a1a2e' }}>Invoice:</strong> <span style={{ color: '#555' }}>{memoNo}</span></div>
              <div><strong style={{ color: '#1a1a2e' }}>Date:</strong> <span style={{ color: '#555' }}>{memoDate}</span></div>
            </div>
          </div>

          {/* Customer Info */}
          <div style={{ padding: '0 28px 14px', fontSize: '12.5px' }}>
            <div style={{ display: 'flex', gap: '40px', marginBottom: '4px' }}>
              <span><strong style={{ color: '#1a1a2e' }}>Name:</strong> <span style={{ color: '#555' }}>{selectedOrder?.customer_name || '___________________________'}</span></span>
              <span><strong style={{ color: '#1a1a2e' }}>Order No:</strong> <span style={{ color: '#555' }}>{selectedOrder?.order_no || '___________'}</span></span>
            </div>
            <div>
              <span><strong style={{ color: '#1a1a2e' }}>Phone:</strong> <span style={{ color: '#555' }}>{selectedOrder?.phone || '___________________________'}</span></span>
            </div>
          </div>

          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, #e0d8c8, transparent)', margin: '0 28px' }}></div>

          {/* Items Table */}
          <div style={{ padding: '14px 28px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr>
                  <th style={{ background: '#1a1a2e', color: '#fff', padding: '10px 8px', textAlign: 'center', fontWeight: '600', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', borderRadius: '4px 0 0 0' }}>#</th>
                  <th style={{ background: '#1a1a2e', color: '#fff', padding: '10px 8px', textAlign: 'left', fontWeight: '600', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase' }}>Description</th>
                  <th style={{ background: '#1a1a2e', color: '#fff', padding: '10px 8px', textAlign: 'center', fontWeight: '600', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase' }}>Qty</th>
                  <th style={{ background: '#1a1a2e', color: '#fff', padding: '10px 8px', textAlign: 'right', fontWeight: '600', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase' }}>Rate</th>
                  <th style={{ background: '#1a1a2e', color: '#fff', padding: '10px 8px', textAlign: 'right', fontWeight: '600', fontSize: '10px', letterSpacing: '1px', textTransform: 'uppercase', borderRadius: '0 4px 0 0' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f0ebe0' }}>
                    <td style={{ padding: '10px 8px', textAlign: 'center', color: '#C9A55C', fontWeight: '700', fontSize: '13px' }}>{item.sno}</td>
                    <td style={{ padding: '10px 8px', color: '#333', fontSize: '12px' }}>{item.detail}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'center', color: '#555', fontWeight: '600' }}>{item.qty}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', color: '#555' }}>{item.rate.toLocaleString()}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '700', color: '#1a1a2e', fontSize: '12.5px' }}>{item.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, #e0d8c8, transparent)', margin: '0 28px' }}></div>

          {/* Totals */}
          <div style={{ padding: '14px 28px', display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: '220px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12.5px' }}>
                <span style={{ color: '#888' }}>Subtotal</span>
                <span style={{ fontWeight: '600', color: '#333' }}>Rs. {total.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12.5px' }}>
                <span style={{ color: '#888' }}>Advance Received</span>
                <span style={{ color: '#555' }}>Rs. {advanceReceived.toLocaleString()}</span>
              </div>
              <div style={{ borderTop: '2px solid #C9A55C', paddingTop: '8px', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: '700', fontSize: '14px', color: '#1a1a2e' }}>REMAINING</span>
                <span style={{ fontWeight: '800', fontSize: '16px', color: '#C9A55C' }}>Rs. {remaining.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ background: '#faf8f4', padding: '18px 28px', borderTop: '1px solid #f0ebe0' }}>
            <div style={{ fontSize: '11px', color: '#999', textAlign: 'center', marginBottom: '12px', fontStyle: 'italic' }}>
              Thank you for choosing Rajput Furniture House!
            </div>

            {/* Bottom branding bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '10px 0', borderTop: '1px solid #e8e0d0' }}>
              <div style={{ width: '30px', height: '1px', background: '#C9A55C' }}></div>
              <div style={{ fontSize: '10px', fontWeight: '700', letterSpacing: '3px', color: '#1a1a2e', textTransform: 'uppercase' }}>Rajput Furniture House</div>
              <div style={{ width: '30px', height: '1px', background: '#C9A55C' }}></div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
