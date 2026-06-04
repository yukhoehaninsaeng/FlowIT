'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, Truck, X, Loader2 } from 'lucide-react'
import { SearchInput } from '@/components/ui/SearchInput'

interface Shipment {
  id: string; trackingNo: string | null; carrier: string | null; status: string
  recipientName: string | null; recipientAddress: string | null
  boxCount: number | null; shippedAt: string | null; deliveredAt: string | null; createdAt: string
}

interface Account { id: string; name: string; contactName: string | null; contactPhone: string | null; address: string | null }

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  preparing:  { label: '준비중', color: 'bg-gray-100 text-gray-700' },
  shipped:    { label: '발송됨', color: 'bg-blue-100 text-blue-700' },
  in_transit: { label: '운송중', color: 'bg-orange-100 text-orange-700' },
  delivered:  { label: '배송완료', color: 'bg-green-100 text-green-700' },
  failed:     { label: '배송실패', color: 'bg-red-100 text-red-700' },
}

const CARRIERS = ['CJ대한통운', '롯데택배', '한진택배', '우체국택배', '로젠택배', '쿠팡로켓', '직접배송']

const DEFAULT_FORM = {
  trackingNo: '', carrier: '',
  recipientName: '', recipientAddress: '',
  boxCount: '', shippedAt: '',
}

async function fetchAccounts(q: string): Promise<Account[]> {
  const r = await fetch(`/api/accounts?q=${encodeURIComponent(q)}`)
  const d = await r.json()
  return (d.accounts ?? []).slice(0, 8)
}

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    fetch('/api/shipments').then(r => r.ok ? r.json() : { shipments: [] })
      .then(d => setShipments(d.shipments ?? [])).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleCreate() {
    setSaving(true); setError('')
    try {
      const r = await fetch('/api/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trackingNo: form.trackingNo || null,
          carrier: form.carrier || null,
          recipientName: form.recipientName || null,
          recipientAddress: form.recipientAddress || null,
          boxCount: form.boxCount ? Number(form.boxCount) : null,
          shippedAt: form.shippedAt ? new Date(form.shippedAt).toISOString() : null,
          status: 'preparing',
        }),
      })
      if (!r.ok) { const d = await r.json(); setError(d.error ?? '등록 실패'); return }
      setShowModal(false); setForm(DEFAULT_FORM); load()
    } finally { setSaving(false) }
  }

  const filtered = shipments.filter(s =>
    (!statusFilter || s.status === statusFilter) &&
    ((s.trackingNo ?? '').toLowerCase().includes(search.toLowerCase()) ||
     (s.recipientName ?? '').toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">배송 추적</h1>
        <button onClick={() => { setShowModal(true); setError('') }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
          <Plus size={14} /> 배송 등록
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const count = shipments.filter(s => s.status === key).length
          return (
            <button key={key} onClick={() => setStatusFilter(statusFilter === key ? '' : key)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all ${statusFilter === key ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
              <span className="font-bold text-gray-900">{count}</span>
            </button>
          )
        })}
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="운송장번호, 수령인 검색..."
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">운송장번호</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">택배사</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">상태</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">수령인</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">주소</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">박스</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">발송일</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? <tr><td colSpan={7} className="py-12 text-center text-gray-400">로딩 중...</td></tr>
            : filtered.length === 0 ? <tr><td colSpan={7} className="py-12 text-center">
              <Truck size={32} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-400">배송 내역이 없습니다</p>
              <button onClick={() => setShowModal(true)} className="mt-2 text-sm text-blue-600">배송 등록하기</button>
            </td></tr>
            : filtered.map(s => {
              const cfg = STATUS_CONFIG[s.status] ?? { label: s.status, color: 'bg-gray-100 text-gray-600' }
              return (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-blue-600">{s.trackingNo ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{s.carrier ?? '—'}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${cfg.color}`}>{cfg.label}</span></td>
                  <td className="px-4 py-3 text-gray-700">{s.recipientName ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate">{s.recipientAddress ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{s.boxCount ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{s.shippedAt ? new Date(s.shippedAt).toLocaleDateString('ko-KR') : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900">배송 등록</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-3">
              {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">택배사</label>
                  <select value={form.carrier} onChange={e => setForm(p => ({ ...p, carrier: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white">
                    <option value="">선택</option>
                    {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">운송장번호</label>
                  <input value={form.trackingNo} onChange={e => setForm(p => ({ ...p, trackingNo: e.target.value }))}
                    placeholder="1234567890123"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">수령인 (거래처 검색)</label>
                  <SearchInput<Account>
                    value={form.recipientName}
                    onInputChange={v => setForm(p => ({ ...p, recipientName: v }))}
                    onSelect={acc => setForm(p => ({
                      ...p,
                      recipientName: acc.contactName || acc.name,
                      recipientAddress: acc.address || p.recipientAddress,
                    }))}
                    fetchOptions={fetchAccounts}
                    placeholder="거래처명 또는 담당자 검색"
                    renderOption={acc => (
                      <div>
                        <span className="font-medium text-gray-900">{acc.name}</span>
                        {acc.contactName && (
                          <span className="text-xs text-gray-400 ml-2">{acc.contactName}</span>
                        )}
                        {acc.address && (
                          <div className="text-xs text-gray-400 truncate mt-0.5">{acc.address}</div>
                        )}
                      </div>
                    )}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">박스 수</label>
                  <input type="number" min={1} value={form.boxCount} onChange={e => setForm(p => ({ ...p, boxCount: e.target.value }))}
                    placeholder="1"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">발송일</label>
                  <input type="date" value={form.shippedAt} onChange={e => setForm(p => ({ ...p, shippedAt: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">배송지 주소</label>
                  <input value={form.recipientAddress} onChange={e => setForm(p => ({ ...p, recipientAddress: e.target.value }))}
                    placeholder="서울시 강남구 ..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
