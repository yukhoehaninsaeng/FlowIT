'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, FileText, Loader2, X, PackageCheck } from 'lucide-react'

interface PO {
  id: string; orderNo: string; type: 'purchase' | 'sales'
  partnerName: string | null; status: string
  totalAmount: string | null; dueDate: string | null; createdAt: string
}
interface POItem { name: string; qty: number; unitPrice: number; total: number }

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  draft:     { label: '초안', color: 'bg-gray-100 text-gray-600' },
  confirmed: { label: '확정', color: 'bg-blue-100 text-blue-700' },
  shipped:   { label: '출고', color: 'bg-orange-100 text-orange-700' },
  completed: { label: '완료·입고', color: 'bg-green-100 text-green-700' },
  cancelled: { label: '취소', color: 'bg-red-100 text-red-700' },
}

const CHANNELS = ['coupang', 'own_mall', 'offline', 'duty_free', 'home_shopping', 'default']

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PO[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'purchase' | 'sales'>('purchase')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ partnerName: '', dueDate: '', notes: '' })
  const [items, setItems] = useState<POItem[]>([{ name: '', qty: 1, unitPrice: 0, total: 0 }])

  // 입고 확정 모달
  const [receiveTarget, setReceiveTarget] = useState<PO | null>(null)
  const [receiveChannel, setReceiveChannel] = useState('default')
  const [receiving, setReceiving] = useState(false)
  const [toast, setToast] = useState('')

  const load = () =>
    fetch('/api/purchase-orders').then(r => r.ok ? r.json() : { orders: [] })
      .then(d => setOrders(d.orders ?? [])).finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  function recalcItem(idx: number, field: keyof POItem, value: string | number) {
    setItems(prev => {
      const next = [...prev]
      const item = { ...next[idx], [field]: value }
      item.total = item.qty * item.unitPrice
      next[idx] = item
      return next
    })
  }

  const totalAmount = items.reduce((s, i) => s + i.total, 0)

  async function handleCreate() {
    if (!form.partnerName.trim()) { setError('거래처명을 입력하세요.'); return }
    setSaving(true); setError('')
    try {
      const r = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: tab, partnerName: form.partnerName, status: 'draft', totalAmount,
          dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
          notes: form.notes || null,
          items: items.filter(i => i.name.trim()),
        }),
      })
      if (!r.ok) { const d = await r.json(); setError(d.error ?? '등록 실패'); return }
      setShowModal(false)
      setForm({ partnerName: '', dueDate: '', notes: '' })
      setItems([{ name: '', qty: 1, unitPrice: 0, total: 0 }])
      load()
    } finally { setSaving(false) }
  }

  async function handleReceive() {
    if (!receiveTarget) return
    setReceiving(true)
    try {
      const r = await fetch(`/api/purchase-orders/${receiveTarget.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed', channel: receiveChannel })
      })
      if (!r.ok) { setToast('입고 처리 실패'); return }
      setOrders(prev => prev.map(o => o.id === receiveTarget.id ? { ...o, status: 'completed' } : o))
      setReceiveTarget(null)
      setToast('✅ 입고 확정 완료 — 재고가 자동으로 반영되었습니다')
      setTimeout(() => setToast(''), 4000)
    } finally { setReceiving(false) }
  }

  const filtered = orders.filter(o =>
    o.type === tab &&
    (o.orderNo.toLowerCase().includes(search.toLowerCase()) ||
     (o.partnerName ?? '').toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['purchase', 'sales'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}>
              {t === 'purchase' ? '발주 (구매)' : '수주 (판매)'}
            </button>
          ))}
        </div>
        <button onClick={() => { setShowModal(true); setError('') }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
          <Plus size={14} /> {tab === 'purchase' ? '발주서 등록' : '수주서 등록'}
        </button>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="주문번호, 거래처 검색..."
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">주문번호</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">거래처</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">상태</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">금액</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">납기일</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">생성일</th>
            {tab === 'purchase' && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">액션</th>}
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? <tr><td colSpan={7} className="py-12 text-center text-gray-400">로딩 중...</td></tr>
            : filtered.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center">
                <FileText size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-400">{tab === 'purchase' ? '발주서' : '수주서'}가 없습니다</p>
              </td></tr>
            ) : filtered.map(o => {
              const st = STATUS_LABEL[o.status] ?? { label: o.status, color: 'bg-gray-100 text-gray-600' }
              const canReceive = tab === 'purchase' && ['confirmed', 'shipped'].includes(o.status)
              return (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-blue-600">{o.orderNo}</td>
                  <td className="px-4 py-3 text-gray-700">{o.partnerName ?? '—'}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${st.color}`}>{st.label}</span></td>
                  <td className="px-4 py-3 text-right text-gray-700">{o.totalAmount ? `₩${Number(o.totalAmount).toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{o.dueDate ? new Date(o.dueDate).toLocaleDateString('ko-KR') : '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(o.createdAt).toLocaleDateString('ko-KR')}</td>
                  {tab === 'purchase' && (
                    <td className="px-4 py-3">
                      {canReceive ? (
                        <button
                          onClick={() => { setReceiveTarget(o); setReceiveChannel('default') }}
                          className="flex items-center gap-1.5 px-3 py-1 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                        >
                          <PackageCheck size={12} /> 입고 확정
                        </button>
                      ) : o.status === 'completed' ? (
                        <span className="text-xs text-green-600 font-medium">입고 완료</span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 입고 확정 모달 */}
      {receiveTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900">입고 확정</h2>
              <button onClick={() => setReceiveTarget(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <p className="font-medium text-gray-900">{receiveTarget.orderNo}</p>
                <p className="text-gray-500 text-xs mt-0.5">{receiveTarget.partnerName}</p>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">입고 채널 (재고 반영 위치)</label>
                <select
                  value={receiveChannel}
                  onChange={e => setReceiveChannel(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CHANNELS.map(ch => <option key={ch} value={ch}>{ch}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1.5">
                  선택한 채널의 SKU 재고가 자동으로 증가합니다
                </p>
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-gray-200">
              <button
                onClick={handleReceive}
                disabled={receiving}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {receiving && <Loader2 size={13} className="animate-spin" />}
                <PackageCheck size={14} /> 입고 확정
              </button>
              <button onClick={() => setReceiveTarget(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 토스트 알림 */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-gray-900 text-white text-sm rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      {/* 발주서 등록 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-sm font-semibold text-gray-900">{tab === 'purchase' ? '발주서' : '수주서'} 등록</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">거래처명 *</label>
                  <input value={form.partnerName} onChange={e => setForm(p => ({ ...p, partnerName: e.target.value }))}
                    placeholder="(주)샘플컴퍼니"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">납기일</label>
                  <input type="date" value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">메모</label>
                  <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder="특이사항" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-500">품목</label>
                  <button onClick={() => setItems(p => [...p, { name: '', qty: 1, unitPrice: 0, total: 0 }])}
                    className="text-xs text-blue-600 hover:text-blue-800">+ 품목 추가</button>
                </div>
                <div className="border border-gray-200 rounded-md overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">품목명</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500 w-16">수량</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500 w-28">단가</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-500 w-28">금액</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-2 py-1.5">
                            <input value={item.name} onChange={e => recalcItem(idx, 'name', e.target.value)}
                              placeholder="품목명" className="w-full px-2 py-1 border border-gray-200 rounded text-xs" />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="number" min={1} value={item.qty} onChange={e => recalcItem(idx, 'qty', Number(e.target.value))}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-right" />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="number" min={0} value={item.unitPrice} onChange={e => recalcItem(idx, 'unitPrice', Number(e.target.value))}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-xs text-right" />
                          </td>
                          <td className="px-3 py-1.5 text-right font-medium text-gray-700">₩{item.total.toLocaleString()}</td>
                          <td className="px-2 py-1.5">
                            <button onClick={() => setItems(p => p.filter((_, i) => i !== idx))} className="text-gray-300 hover:text-red-400">✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t">
                      <tr>
                        <td colSpan={3} className="px-3 py-2 text-right text-xs font-bold text-blue-600">합계</td>
                        <td className="px-3 py-2 text-right text-xs font-bold text-blue-600">₩{totalAmount.toLocaleString()}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-gray-200">
              <button onClick={handleCreate} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
                {saving && <Loader2 size={13} className="animate-spin" />} 등록
              </button>
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
