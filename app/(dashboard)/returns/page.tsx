'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, RotateCcw, X, Loader2 } from 'lucide-react'

interface Return {
  id: string; returnNo: string; status: string; reason: string | null
  refundAmount: string | null; itemCount: number; createdAt: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  requested:  { label: '접수', color: 'bg-yellow-100 text-yellow-700' },
  received:   { label: '수거완료', color: 'bg-blue-100 text-blue-700' },
  inspecting: { label: '검수중', color: 'bg-orange-100 text-orange-700' },
  restocked:  { label: '재입고', color: 'bg-green-100 text-green-700' },
  refunded:   { label: '환불완료', color: 'bg-green-100 text-green-700' },
  rejected:   { label: '거절', color: 'bg-red-100 text-red-700' },
}

const REASONS = ['단순 변심', '불량·파손', '오배송', '유통기한', '기타']

export default function ReturnsPage() {
  const [returns, setReturns] = useState<Return[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ reason: '', notes: '', refundAmount: '' })
  const [items, setItems] = useState([{ name: '', qty: 1 }])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () =>
    fetch('/api/returns').then(r => r.ok ? r.json() : { returns: [] })
      .then(d => setReturns(d.returns ?? [])).finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  async function handleCreate() {
    if (!form.reason) { setError('반품 사유를 선택하세요.'); return }
    setSaving(true); setError('')
    try {
      const r = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'requested',
          reason: form.reason,
          notes: form.notes || null,
          refundAmount: form.refundAmount ? Number(form.refundAmount) : null,
          items: items.filter(i => i.name.trim()).map(i => ({ name: i.name, qty: i.qty })),
        }),
      })
      if (!r.ok) { const d = await r.json(); setError(d.error ?? '등록 실패'); return }
      setShowModal(false)
      setForm({ reason: '', notes: '', refundAmount: '' })
      setItems([{ name: '', qty: 1 }])
      load()
    } finally { setSaving(false) }
  }

  const filtered = returns.filter(r =>
    (!statusFilter || r.status === statusFilter) &&
    r.returnNo.toLowerCase().includes(search.toLowerCase())
  )
  const pending = returns.filter(r => ['requested', 'received', 'inspecting'].includes(r.status)).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">반품 관리</h1>
        <button onClick={() => { setShowModal(true); setError('') }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
          <Plus size={14} /> 반품 접수
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '전체 반품', value: returns.length, color: 'text-gray-900' },
          { label: '처리 대기', value: pending, color: 'text-orange-600' },
          { label: '환불 완료', value: returns.filter(r => r.status === 'refunded').length, color: 'text-green-600' },
          { label: '총 환불액', value: `₩${returns.reduce((s, r) => s + Number(r.refundAmount ?? 0), 0).toLocaleString()}`, color: 'text-gray-900' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-xs text-gray-500 mb-1">{card.label}</div>
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="반품번호 검색..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-white">
          <option value="">전체 상태</option>
          {Object.entries(STATUS_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">반품번호</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">상태</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">사유</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">품목 수</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">환불액</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">접수일</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? <tr><td colSpan={6} className="py-12 text-center text-gray-400">로딩 중...</td></tr>
            : filtered.length === 0 ? (
              <tr><td colSpan={6} className="py-12 text-center">
                <RotateCcw size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-400">반품 내역이 없습니다</p>
                <button onClick={() => setShowModal(true)} className="mt-2 text-sm text-blue-600">반품 접수하기</button>
              </td></tr>
            ) : filtered.map(r => {
              const cfg = STATUS_CONFIG[r.status] ?? { label: r.status, color: 'bg-gray-100 text-gray-600' }
              return (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-blue-600">{r.returnNo}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${cfg.color}`}>{cfg.label}</span></td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{r.reason ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{r.itemCount}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{r.refundAmount ? `₩${Number(r.refundAmount).toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(r.createdAt).toLocaleDateString('ko-KR')}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-sm font-semibold text-gray-900">반품 접수</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">반품 사유 *</label>
                  <select value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white">
                    <option value="">선택</option>
                    {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">환불 예정액</label>
                  <input type="number" min={0} value={form.refundAmount} onChange={e => setForm(p => ({ ...p, refundAmount: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">메모</label>
                  <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                    rows={2} placeholder="특이사항"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-500">반품 품목</label>
                  <button onClick={() => setItems(p => [...p, { name: '', qty: 1 }])} className="text-xs text-blue-600">+ 추가</button>
                </div>
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input value={item.name} onChange={e => setItems(p => p.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))}
                        placeholder="품목명" className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      <input type="number" min={1} value={item.qty} onChange={e => setItems(p => p.map((x, i) => i === idx ? { ...x, qty: Number(e.target.value) } : x))}
                        className="w-20 px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-right" />
                      <button onClick={() => setItems(p => p.filter((_, i) => i !== idx))} className="text-gray-300 hover:text-red-400 px-1">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-gray-200">
              <button onClick={handleCreate} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
                {saving && <Loader2 size={13} className="animate-spin" />} 접수
              </button>
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
