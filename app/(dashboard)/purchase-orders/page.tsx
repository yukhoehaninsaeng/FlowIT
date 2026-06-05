'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, FileText, Loader2, X } from 'lucide-react'
import { SearchInput } from '@/components/ui/SearchInput'

interface PO {
  id: string; orderNo: string; type: 'purchase' | 'sales'
  partnerName: string | null; status: string
  totalAmount: string | null; dueDate: string | null; createdAt: string
}
interface POItem { skuCode: string; skuName: string; qty: number; unitPrice: number; total: number }
interface Account { id: string; name: string; contactName: string | null; contactPhone: string | null; address: string | null }
interface Sku { id: string; skuCode: string; name: string; unitCost: number | null; sellingPrice: number | null; unit: string | null }

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  draft:     { label: '초안', color: 'bg-gray-100 text-gray-600' },
  confirmed: { label: '확정', color: 'bg-blue-100 text-blue-700' },
  shipped:   { label: '출고', color: 'bg-orange-100 text-orange-700' },
  completed: { label: '완료', color: 'bg-green-100 text-green-700' },
  cancelled: { label: '취소', color: 'bg-red-100 text-red-700' },
}

async function fetchAccounts(q: string): Promise<Account[]> {
  const r = await fetch(`/api/accounts?q=${encodeURIComponent(q)}`)
  const d = await r.json()
  return (d.accounts ?? []).slice(0, 8)
}

async function fetchSkus(q: string): Promise<Sku[]> {
  const r = await fetch(`/api/sku?search=${encodeURIComponent(q)}&limit=8`)
  const d = await r.json()
  return d.data ?? []
}

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PO[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'purchase' | 'sales'>('purchase')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ partnerName: '', partnerId: '', dueDate: '', notes: '' })
  const [items, setItems] = useState<POItem[]>([{ skuCode: '', skuName: '', qty: 1, unitPrice: 0, total: 0 }])

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
          type: tab,
          partnerName: form.partnerName,
          partnerId: form.partnerId || null,
          status: 'draft',
          totalAmount,
          dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
          notes: form.notes || null,
          items: items
            .filter(i => i.skuName.trim() || i.skuCode.trim())
            .map(({ skuCode, skuName, qty, unitPrice }) => ({ skuCode, skuName, qty, unitPrice })),
        }),
      })
      if (!r.ok) { const d = await r.json(); setError(d.error ?? '등록 실패'); return }
      setShowModal(false)
      setForm({ partnerName: '', partnerId: '', dueDate: '', notes: '' })
      setItems([{ skuCode: '', skuName: '', qty: 1, unitPrice: 0, total: 0 }])
      load()
    } finally { setSaving(false) }
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
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? <tr><td colSpan={6} className="py-12 text-center text-gray-400">로딩 중...</td></tr>
            : filtered.length === 0 ? (
              <tr><td colSpan={6} className="py-12 text-center">
                <FileText size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-400">{tab === 'purchase' ? '발주서' : '수주서'}가 없습니다</p>
                <button onClick={() => setShowModal(true)} className="mt-2 text-sm text-blue-600">등록하기</button>
              </td></tr>
            ) : filtered.map(o => {
              const st = STATUS_LABEL[o.status] ?? { label: o.status, color: 'bg-gray-100 text-gray-600' }
              return (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-blue-600">{o.orderNo}</td>
                  <td className="px-4 py-3 text-gray-700">{o.partnerName ?? '—'}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${st.color}`}>{st.label}</span></td>
                  <td className="px-4 py-3 text-right text-gray-700">{o.totalAmount ? `₩${Number(o.totalAmount).toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{o.dueDate ? new Date(o.dueDate).toLocaleDateString('ko-KR') : '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(o.createdAt).toLocaleDateString('ko-KR')}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

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
                  <label className="block text-xs text-gray-500 mb-1">거래처 *</label>
                  <SearchInput<Account>
                    value={form.partnerName}
                    onInputChange={v => setForm(p => ({ ...p, partnerName: v, partnerId: '' }))}
                    onSelect={acc => setForm(p => ({ ...p, partnerName: acc.name, partnerId: acc.id }))}
                    fetchOptions={fetchAccounts}
                    placeholder="거래처명 검색..."
                    renderOption={acc => (
                      <div>
                        <span className="font-medium text-gray-900">{acc.name}</span>
                        {acc.contactName && (
                          <span className="text-xs text-gray-400 ml-2">{acc.contactName}</span>
                        )}
                        {acc.contactPhone && (
                          <span className="text-xs text-gray-400 ml-2">{acc.contactPhone}</span>
                        )}
                      </div>
                    )}
                  />
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
                  <button
                    onClick={() => setItems(p => [...p, { skuCode: '', skuName: '', qty: 1, unitPrice: 0, total: 0 }])}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    + 품목 추가
                  </button>
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
                            <SearchInput<Sku>
                              value={item.skuName}
                              onInputChange={v => recalcItem(idx, 'skuName', v)}
                              onSelect={sku => {
                                const price = tab === 'purchase'
                                  ? (Number(sku.unitCost) || 0)
                                  : (Number(sku.sellingPrice) || 0)
                                setItems(prev => {
                                  const next = [...prev]
                                  next[idx] = { ...next[idx], skuCode: sku.skuCode, skuName: sku.name, unitPrice: price, total: next[idx].qty * price }
                                  return next
                                })
                              }}
                              fetchOptions={fetchSkus}
                              placeholder="품목명 또는 SKU 검색"
                              renderOption={sku => (
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs text-gray-400">{sku.skuCode}</span>
                                  <span className="text-gray-900">{sku.name}</span>
                                  {sku.unit && <span className="text-xs text-gray-400">/{sku.unit}</span>}
                                </div>
                              )}
                            />
                            {item.skuCode && (
                              <div className="mt-0.5 text-xs text-gray-400 font-mono pl-1">{item.skuCode}</div>
                            )}
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
