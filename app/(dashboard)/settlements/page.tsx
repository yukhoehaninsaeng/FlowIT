'use client'

import { useEffect, useState } from 'react'
import { Plus, Search, Receipt, Download, X, Loader2 } from 'lucide-react'

interface Settlement {
  id: string; partnerName: string | null; period: string; totalAmount: string
  status: string; dueDate: string | null; paidAt: string | null; createdAt: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft:     { label: '초안', color: 'bg-gray-100 text-gray-700' },
  confirmed: { label: '확정', color: 'bg-blue-100 text-blue-700' },
  paid:      { label: '지급완료', color: 'bg-green-100 text-green-700' },
}

const DEFAULT_FORM = { partnerName: '', period: '', totalAmount: '', dueDate: '', notes: '' }

function currentPeriod() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function SettlementsPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ ...DEFAULT_FORM, period: currentPeriod() })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    fetch('/api/settlements').then(r => r.ok ? r.json() : { settlements: [] })
      .then(d => setSettlements(d.settlements ?? [])).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function handleCreate() {
    if (!form.partnerName.trim()) { setError('거래처명을 입력하세요.'); return }
    if (!form.period.trim()) { setError('정산 기간을 입력하세요.'); return }
    if (!form.totalAmount || isNaN(Number(form.totalAmount))) { setError('정산액을 입력하세요.'); return }
    setSaving(true); setError('')
    try {
      const r = await fetch('/api/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerName: form.partnerName,
          period: form.period,
          totalAmount: Number(form.totalAmount),
          dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
          notes: form.notes || null,
          status: 'draft',
        }),
      })
      if (!r.ok) { const d = await r.json(); setError(d.error ?? '등록 실패'); return }
      setShowModal(false); setForm({ ...DEFAULT_FORM, period: currentPeriod() }); load()
    } finally { setSaving(false) }
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/settlements`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    }).catch(() => null)
    load()
  }

  const periods = Array.from(new Set(settlements.map(s => s.period))).sort().reverse()
  const filtered = settlements.filter(s =>
    (!period || s.period === period) &&
    (s.partnerName ?? '').toLowerCase().includes(search.toLowerCase())
  )
  const totalPaid = filtered.filter(s => s.status === 'paid').reduce((sum, s) => sum + Number(s.totalAmount), 0)
  const totalPending = filtered.filter(s => s.status !== 'paid').reduce((sum, s) => sum + Number(s.totalAmount), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">거래처 정산</h1>
        <button onClick={() => { setShowModal(true); setError('') }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
          <Plus size={14} /> 정산 생성
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">지급 완료</div>
          <div className="text-2xl font-bold text-green-600">₩{totalPaid.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">미지급 잔액</div>
          <div className="text-2xl font-bold text-orange-600">₩{totalPending.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">정산 건수</div>
          <div className="text-2xl font-bold text-gray-900">{filtered.length}</div>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="거래처명 검색..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        </div>
        <select value={period} onChange={e => setPeriod(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-white">
          <option value="">전체 기간</option>
          {periods.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <button className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-md bg-white hover:bg-gray-50">
          <Download size={14} /> CSV
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">거래처</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">정산 기간</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">상태</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">정산액</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">납기일</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">지급일</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? <tr><td colSpan={6} className="py-12 text-center text-gray-400">로딩 중...</td></tr>
            : filtered.length === 0 ? <tr><td colSpan={6} className="py-12 text-center">
              <Receipt size={32} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-400">정산 내역이 없습니다</p>
              <button onClick={() => setShowModal(true)} className="mt-2 text-sm text-blue-600">정산 생성하기</button>
            </td></tr>
            : filtered.map(s => {
              const cfg = STATUS_CONFIG[s.status] ?? { label: s.status, color: 'bg-gray-100 text-gray-600' }
              return (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{s.partnerName ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700 font-mono">{s.period}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${cfg.color}`}>{cfg.label}</span></td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">₩{Number(s.totalAmount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{s.dueDate ? new Date(s.dueDate).toLocaleDateString('ko-KR') : '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{s.paidAt ? new Date(s.paidAt).toLocaleDateString('ko-KR') : '—'}</td>
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
              <h2 className="text-sm font-semibold text-gray-900">정산 생성</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-3">
              {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>}
              <div>
                <label className="block text-xs text-gray-500 mb-1">거래처명 *</label>
                <input value={form.partnerName} onChange={e => setForm(p => ({ ...p, partnerName: e.target.value }))}
                  placeholder="(주)샘플컴퍼니"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">정산 기간 *</label>
                  <input value={form.period} onChange={e => setForm(p => ({ ...p, period: e.target.value }))}
                    placeholder="2024-01"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">정산액 (원) *</label>
                  <input type="number" min={0} value={form.totalAmount} onChange={e => setForm(p => ({ ...p, totalAmount: e.target.value }))}
                    placeholder="0"
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
                    placeholder="비고"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-gray-200">
              <button onClick={handleCreate} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
                {saving && <Loader2 size={13} className="animate-spin" />} 생성
              </button>
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
