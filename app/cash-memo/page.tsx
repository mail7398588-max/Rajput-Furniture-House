'use client'

import { useEffect, useState, useRef } from 'react'
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
  const printRef = useRef<HTMLDivElement>(null)

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6 no-print">
        <div>
          <h1 className="page-title">Cash Memo Generator</h1>
          <p className="page-subtitle">Generate printable receipts for customers</p>
        </div>
        <button onClick={() => window.print()} className="btn-primary flex items-center gap-2">
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
                <input type="text" className="input-field" value={memoNo} onChange={(e) => setMemoNo(e.target.value)} />
              </div>
              <div>
                <label className="label-text">Date</label>
                <input type="date" className="input-field" value={memoDate} onChange={(e) => setMemoDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="label-text">Select Order No</label>
                <select className="input-field" onChange={(e) => handleOrderSelect(e.target.value)} value={selectedOrder?.order_no || ''} disabled={loadingCustomers}>
                  <option value="">{loadingCustomers ? 'Loading...' : 'Select Order'}</option>
                  {customers.map((c) => (
                    <option key={c.order_no} value={c.order_no}>{c.order_no} - {c.customer_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label-text">Phone</label>
                <input type="text" className="input-field" value={selectedOrder?.phone || ''} readOnly />
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
                    <input type="number" className="input-field" value={item.sno} readOnly />
                  </div>
                  <div className="flex-1">
                    <label className="label-text text-xs">Detail</label>
                    <input type="text" className="input-field" value={item.detail} onChange={(e) => updateItem(index, 'detail', e.target.value)} placeholder="Item description" />
                  </div>
                  <div className="w-24">
                    <label className="label-text text-xs">Rate</label>
                    <input type="number" className="input-field" value={item.rate} onChange={(e) => updateItem(index, 'rate', Number(e.target.value))} />
                  </div>
                  <div className="w-16">
                    <label className="label-text text-xs">Qty</label>
                    <input type="number" className="input-field" value={item.qty} onChange={(e) => updateItem(index, 'qty', Number(e.target.value))} min={1} />
                  </div>
                  <div className="w-28">
                    <label className="label-text text-xs">Amount</label>
                    <input type="number" className="input-field" value={item.amount} readOnly />
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
                <input type="number" className="input-field w-32 text-right" value={advanceReceived} onChange={(e) => setAdvanceReceived(Number(e.target.value))} />
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span className="text-warm-700">Remaining:</span>
                <span className={remaining >= 0 ? 'text-green-600' : 'text-red-600'}>Rs. {remaining.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Layout */}
      <div className="print-only" ref={printRef}>
        <div style={{ maxWidth: '560px', margin: '0 auto', fontFamily: "'Segoe UI', Arial, sans-serif", color: '#1a1a1a', background: '#fff', position: 'relative', overflow: 'hidden' }}>

          {/* Top Section */}
          <div style={{ display: 'flex', alignItems: 'stretch', minHeight: '200px' }}>

            {/* Left - Branding */}
            <div style={{ flex: 1, padding: '30px 20px 24px 30px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: '9px', letterSpacing: '5px', textTransform: 'uppercase', color: '#C9A55C', fontWeight: '700', marginBottom: '6px' }}>Welcome to</div>
              <h1 style={{ fontSize: '32px', fontWeight: '900', margin: 0, color: '#1a1a2e', lineHeight: '1.05', letterSpacing: '-0.5px' }}>RAJPOOT</h1>
              <h1 style={{ fontSize: '32px', fontWeight: '900', margin: 0, color: '#1a1a2e', lineHeight: '1.05', letterSpacing: '-0.5px' }}>FURNITURE</h1>
              <div style={{ width: '45px', height: '3px', background: 'linear-gradient(90deg, #C9A55C, #FFC726)', margin: '12px 0', borderRadius: '2px' }}></div>
              <div style={{ fontSize: '10px', color: '#777', lineHeight: '1.7' }}>
                Muhammad Abbas: 0300-8583823<br/>
                Junaid Abbas: 0318-6497054
              </div>
            </div>

            {/* Right - Realistic Sofa */}
            <div style={{ width: '220px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '10px', position: 'relative' }}>
              <svg width="210" height="170" viewBox="0 0 210 170" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Shadow under sofa */}
                <ellipse cx="105" cy="158" rx="85" ry="6" fill="rgba(0,0,0,0.06)"/>

                {/* Sofa back - large rounded with tufted look */}
                <path d="M28 60 C28 28, 55 12, 105 12 C155 12, 182 28, 182 60 L182 92 C182 96, 179 98, 175 98 L35 98 C31 98, 28 96, 28 92 Z" fill="url(#sofaBackGrad)"/>

                {/* Back cushion highlights - curved lines for tufting */}
                <path d="M50 25 Q50 55, 50 90" stroke="rgba(180,160,130,0.25)" strokeWidth="1.2" fill="none"/>
                <path d="M75 18 Q75 55, 75 90" stroke="rgba(180,160,130,0.25)" strokeWidth="1.2" fill="none"/>
                <path d="M105 16 Q105 55, 105 90" stroke="rgba(180,160,130,0.25)" strokeWidth="1.2" fill="none"/>
                <path d="M135 18 Q135 55, 135 90" stroke="rgba(180,160,130,0.25)" strokeWidth="1.2" fill="none"/>
                <path d="M160 25 Q160 55, 160 90" stroke="rgba(180,160,130,0.25)" strokeWidth="1.2" fill="none"/>

                {/* Tufting diamond pattern */}
                <path d="M62 40 L75 55 L62 70" stroke="rgba(160,140,110,0.15)" strokeWidth="0.8" fill="none"/>
                <path d="M88 35 L100 50 L88 65" stroke="rgba(160,140,110,0.15)" strokeWidth="0.8" fill="none"/>
                <path d="M118 35 L130 50 L118 65" stroke="rgba(160,140,110,0.15)" strokeWidth="0.8" fill="none"/>
                <path d="M148 40 L160 55 L148 70" stroke="rgba(160,140,110,0.15)" strokeWidth="0.8" fill="none"/>

                {/* Tufting buttons */}
                <circle cx="62" cy="55" r="2" fill="rgba(180,155,110,0.35)"/>
                <circle cx="88" cy="50" r="2" fill="rgba(180,155,110,0.35)"/>
                <circle cx="105" cy="48" r="2" fill="rgba(180,155,110,0.35)"/>
                <circle cx="118" cy="50" r="2" fill="rgba(180,155,110,0.35)"/>
                <circle cx="148" cy="55" r="2" fill="rgba(180,155,110,0.35)"/>

                {/* Sofa seat */}
                <path d="M20 95 L20 120 C20 126, 25 130, 32 130 L178 130 C185 130, 190 126, 190 120 L190 95 Z" fill="url(#sofaSeatGrad)"/>

                {/* Seat cushion dividers */}
                <path d="M70 98 L70 127" stroke="rgba(160,140,110,0.15)" strokeWidth="1"/>
                <path d="M105 97 L105 128" stroke="rgba(160,140,110,0.18)" strokeWidth="1"/>
                <path d="M140 98 L140 127" stroke="rgba(160,140,110,0.15)" strokeWidth="1"/>

                {/* Seat cushion top highlight */}
                <path d="M30 98 Q105 88, 180 98" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" fill="none"/>

                {/* Left armrest - rounded front */}
                <path d="M10 52 C4 52, 0 58, 0 68 L0 118 C0 128, 6 132, 14 132 L22 132 L22 52 Z" fill="url(#armGrad)"/>
                <path d="M10 52 C6 52, 3 56, 3 62 L3 115 C3 122, 7 125, 12 125" stroke="rgba(255,255,255,0.15)" strokeWidth="1" fill="none"/>

                {/* Right armrest - rounded front */}
                <path d="M200 52 C206 52, 210 58, 210 68 L210 118 C210 128, 204 132, 196 132 L188 132 L188 52 Z" fill="url(#armGrad)"/>
                <path d="M200 52 C204 52, 207 56, 207 62 L207 115 C207 122, 203 125, 198 125" stroke="rgba(255,255,255,0.15)" strokeWidth="1" fill="none"/>

                {/* Wooden legs */}
                <rect x="32" y="130" width="7" height="18" rx="2" fill="url(#legGrad)"/>
                <rect x="85" y="130" width="6" height="16" rx="2" fill="url(#legGrad)"/>
                <rect x="119" y="130" width="6" height="16" rx="2" fill="url(#legGrad)"/>
                <rect x="171" y="130" width="7" height="18" rx="2" fill="url(#legGrad)"/>

                {/* Decorative pillows */}
                <ellipse cx="52" cy="68" rx="20" ry="16" fill="url(#pillowGold)" transform="rotate(-8 52 68)"/>
                <ellipse cx="158" cy="68" rx="20" ry="16" fill="url(#pillowDark)" transform="rotate(8 158 68)"/>
                {/* Pillow highlights */}
                <ellipse cx="50" cy="62" rx="10" ry="6" fill="rgba(255,255,255,0.12)" transform="rotate(-8 50 62)"/>
                <ellipse cx="160" cy="62" rx="10" ry="6" fill="rgba(255,255,255,0.08)" transform="rotate(8 160 62)"/>

                <defs>
                  <linearGradient id="sofaBackGrad" x1="105" y1="12" x2="105" y2="98">
                    <stop offset="0%" stopColor="#F8F3EB"/>
                    <stop offset="50%" stopColor="#F0E8DA"/>
                    <stop offset="100%" stopColor="#E6DCCB"/>
                  </linearGradient>
                  <linearGradient id="sofaSeatGrad" x1="105" y1="95" x2="105" y2="130">
                    <stop offset="0%" stopColor="#EDE5D8"/>
                    <stop offset="100%" stopColor="#DDD4C2"/>
                  </linearGradient>
                  <linearGradient id="armGrad" x1="0" y1="52" x2="22" y2="132">
                    <stop offset="0%" stopColor="#F2EAE0"/>
                    <stop offset="100%" stopColor="#DDD4C2"/>
                  </linearGradient>
                  <linearGradient id="legGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#A08060"/>
                    <stop offset="100%" stopColor="#7A6045"/>
                  </linearGradient>
                  <linearGradient id="pillowGold" x1="52" y1="52" x2="52" y2="84">
                    <stop offset="0%" stopColor="#D4B06A"/>
                    <stop offset="100%" stopColor="#B8944A"/>
                  </linearGradient>
                  <linearGradient id="pillowDark" x1="158" y1="52" x2="158" y2="84">
                    <stop offset="0%" stopColor="#2A2A42"/>
                    <stop offset="100%" stopColor="#1A1A2E"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>

          {/* Gold accent line */}
          <div style={{ height: '3px', background: 'linear-gradient(90deg, #C9A55C 0%, #FFC726 50%, #C9A55C 100%)' }}></div>

          {/* CASH MEMO Title + Invoice Info */}
          <div style={{ padding: '16px 30px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#1a1a2e', margin: 0, letterSpacing: '4px' }}>CASH MEMO</h2>
              <div style={{ width: '35px', height: '2.5px', background: '#C9A55C', marginTop: '5px', borderRadius: '2px' }}></div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '12px', lineHeight: '1.8' }}>
              <div><strong style={{ color: '#1a1a2e' }}>Invoice:</strong> <span style={{ color: '#555' }}>{memoNo}</span></div>
              <div><strong style={{ color: '#1a1a2e' }}>Date:</strong> <span style={{ color: '#555' }}>{memoDate}</span></div>
            </div>
          </div>

          {/* Customer Info */}
          <div style={{ padding: '0 30px 14px', fontSize: '12.5px', display: 'flex', gap: '36px' }}>
            <div>
              <strong style={{ color: '#1a1a2e' }}>Name: </strong>
              <span style={{ color: '#555', borderBottom: '1px solid #ddd', paddingBottom: '1px' }}>{selectedOrder?.customer_name || '___________________________'}</span>
            </div>
            <div>
              <strong style={{ color: '#1a1a2e' }}>Order No: </strong>
              <span style={{ color: '#555', borderBottom: '1px solid #ddd', paddingBottom: '1px' }}>{selectedOrder?.order_no || '___________'}</span>
            </div>
            <div>
              <strong style={{ color: '#1a1a2e' }}>Phone: </strong>
              <span style={{ color: '#555', borderBottom: '1px solid #ddd', paddingBottom: '1px' }}>{selectedOrder?.phone || '___________________________'}</span>
            </div>
          </div>

          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent 0%, #d4c9b8 50%, transparent 100%)', margin: '0 30px' }}></div>

          {/* Items Table */}
          <div style={{ padding: '14px 30px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr>
                  <th style={{ background: '#1a1a2e', color: '#fff', padding: '9px 8px', textAlign: 'center', fontWeight: '700', fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', borderRadius: '4px 0 0 0' }}>#</th>
                  <th style={{ background: '#1a1a2e', color: '#fff', padding: '9px 8px', textAlign: 'left', fontWeight: '700', fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Description</th>
                  <th style={{ background: '#1a1a2e', color: '#fff', padding: '9px 8px', textAlign: 'center', fontWeight: '700', fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Qty</th>
                  <th style={{ background: '#1a1a2e', color: '#fff', padding: '9px 8px', textAlign: 'right', fontWeight: '700', fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase' }}>Rate</th>
                  <th style={{ background: '#1a1a2e', color: '#fff', padding: '9px 8px', textAlign: 'right', fontWeight: '700', fontSize: '9px', letterSpacing: '1.5px', textTransform: 'uppercase', borderRadius: '0 4px 0 0' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f0ebe0' }}>
                    <td style={{ padding: '10px 8px', textAlign: 'center', color: '#C9A55C', fontWeight: '800', fontSize: '13px' }}>{item.sno}</td>
                    <td style={{ padding: '10px 8px', color: '#333', fontSize: '12px', lineHeight: '1.4' }}>{item.detail}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'center', color: '#555', fontWeight: '600' }}>{item.qty}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', color: '#555' }}>{item.rate.toLocaleString()}</td>
                    <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '700', color: '#1a1a2e', fontSize: '12.5px' }}>{item.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent 0%, #d4c9b8 50%, transparent 100%)', margin: '0 30px' }}></div>

          {/* Totals */}
          <div style={{ padding: '14px 30px', display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: '230px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px' }}>
                <span style={{ color: '#999' }}>Subtotal</span>
                <span style={{ fontWeight: '600', color: '#444' }}>Rs. {total.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
                <span style={{ color: '#999' }}>Advance Received</span>
                <span style={{ color: '#555' }}>Rs. {advanceReceived.toLocaleString()}</span>
              </div>
              <div style={{ borderTop: '2px solid #C9A55C', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '700', fontSize: '13px', color: '#1a1a2e', letterSpacing: '1px' }}>REMAINING</span>
                <span style={{ fontWeight: '800', fontSize: '17px', color: '#C9A55C' }}>Rs. {remaining.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ background: '#faf8f4', padding: '20px 30px', borderTop: '1px solid #f0ebe0' }}>
            <div style={{ fontSize: '11px', color: '#aaa', textAlign: 'center', marginBottom: '14px', fontStyle: 'italic' }}>
              Thank you for choosing Rajput Furniture House!
            </div>

            {/* Branding bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', paddingTop: '10px', borderTop: '1px solid #e8e0d0' }}>
              <div style={{ width: '25px', height: '1px', background: '#C9A55C' }}></div>
              <div style={{ fontSize: '9px', fontWeight: '700', letterSpacing: '4px', color: '#1a1a2e', textTransform: 'uppercase' }}>Rajput Furniture House</div>
              <div style={{ width: '25px', height: '1px', background: '#C9A55C' }}></div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
