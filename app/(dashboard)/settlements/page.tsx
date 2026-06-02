'use client'

import { useEffect, useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Plus, Search, Receipt, Download } from 'lucide-react'

interface Settlement {
  id: string
  partnerName: string | null
  period: string
  totalAmount: string
  status: string
  dueDate: string | null
  paidAt: string | null
  createdAt: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft:     { label: '초안', color: 'bg-gray-100 text-gray-700' },
  confirmed: { label: '확정', color: 'bg-blue-100 text-blue-700' },
  paid:      { label: '지급완료', color: 'bg-green-100 text-green-700' },
}

export default function SettlementsPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [period, setPeriod] = useState('')

  useEffect(() => {
    fetch('/api/settlements')
      .then(r => r.ok ? r.json() : { settlements: [] })
      .then(d => setSettlements(d.settlements ?? []))
      .finally(() => setLoading(false))
  }, [])

  const periods = Array.from(new Set(settlements.map(s => s.period))).sort().reverse()

  const filtered = settlements.filter(s =>
    (!period || s.period === period) &&
    (s.partnerName ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const totalPaid = filtered
    .filter(s => s.status === 'paid')
    .reduce((sum, s) => sum + Number(s.totalAmount), 0)

  const totalPending = filtered
    .filter(s => s.status !== 'paid')
    .reduce((sum, s) => sum + Number(s.totalAmount), 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <Topbar title="거래처 정산" />
      <main className="pt-14 pl-[220px]">
        <div className="p-6">

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
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

          {/* Filters */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="거래처명 검색..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <select
              value={period}
              onChange={e => setPeriod(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-white"
            >
              <option value="">전체 기간</option>
              {periods.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <button className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-md bg-white hover:bg-gray-50">
              <Download size={14} /> CSV 내보내기
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
              <Plus size={14} /> 정산 생성
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">거래처</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">정산 기간</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">상태</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">정산액</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">납기일</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">지급일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={6} className="py-12 text-center text-gray-400">로딩 중...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <Receipt size={32} className="mx-auto mb-2 text-gray-300" />
                      <p className="text-sm text-gray-400">정산 내역이 없습니다</p>
                    </td>
                  </tr>
                ) : filtered.map(s => {
                  const cfg = STATUS_CONFIG[s.status] ?? { label: s.status, color: 'bg-gray-100 text-gray-600' }
                  return (
                    <tr key={s.id} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-4 py-3 font-medium text-gray-900">{s.partnerName ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-700 font-mono">{s.period}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        ₩{Number(s.totalAmount).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {s.dueDate ? new Date(s.dueDate).toLocaleDateString('ko-KR') : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {s.paidAt ? new Date(s.paidAt).toLocaleDateString('ko-KR') : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
