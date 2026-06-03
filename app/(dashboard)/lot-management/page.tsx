'use client'

import { useEffect, useState } from 'react'
import { Search, AlertTriangle, CheckCircle, Clock, Package } from 'lucide-react'

interface LotItem {
  id: string
  skuCode: string
  skuName: string
  lotNumber: string
  qty: number
  lotExpiry: string | null
  daysLeft: number | null
  status: 'ok' | 'warning' | 'expired' | 'no_expiry'
}

export default function LotManagementPage() {
  const [lots, setLots] = useState<LotItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'warning' | 'expired'>('all')

  useEffect(() => {
    fetch('/api/inventory/lots')
      .then(r => r.ok ? r.json() : { lots: [] })
      .then(d => setLots(d.lots ?? []))
      .finally(() => setLoading(false))
  }, [])

  const filtered = lots.filter(l =>
    (filter === 'all' || l.status === filter || (filter === 'warning' && l.status === 'warning')) &&
    ((l.skuCode ?? '').toLowerCase().includes(search.toLowerCase()) ||
     (l.skuName ?? '').toLowerCase().includes(search.toLowerCase()) ||
     (l.lotNumber ?? '').toLowerCase().includes(search.toLowerCase()))
  )

  const expired = lots.filter(l => l.status === 'expired').length
  const warning = lots.filter(l => l.status === 'warning').length
  const ok = lots.filter(l => l.status === 'ok').length

  return (
    <>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3">
              <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
              <div>
                <div className="text-xs text-gray-500">정상</div>
                <div className="text-xl font-bold text-gray-900">{ok}</div>
              </div>
            </div>
            <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4 flex items-center gap-3">
              <Clock size={20} className="text-yellow-600 flex-shrink-0" />
              <div>
                <div className="text-xs text-yellow-700">60일 이내 만료</div>
                <div className="text-xl font-bold text-yellow-700">{warning}</div>
              </div>
            </div>
            <div className="bg-red-50 rounded-lg border border-red-200 p-4 flex items-center gap-3">
              <AlertTriangle size={20} className="text-red-600 flex-shrink-0" />
              <div>
                <div className="text-xs text-red-700">유통기한 초과</div>
                <div className="text-xl font-bold text-red-700">{expired}</div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3">
              <Package size={20} className="text-gray-400 flex-shrink-0" />
              <div>
                <div className="text-xs text-gray-500">전체 LOT</div>
                <div className="text-xl font-bold text-gray-900">{lots.length}</div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="SKU 코드, LOT 번호 검색..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {([['all', '전체'], ['warning', '임박'], ['expired', '만료']] as const).map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setFilter(v)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    filter === v ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">상태</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">LOT 번호</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">수량</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">유통기한</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">잔여일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={6} className="py-12 text-center text-gray-400">로딩 중...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <Package size={32} className="mx-auto mb-2 text-gray-300" />
                      <p className="text-sm text-gray-400">LOT 정보가 없습니다</p>
                    </td>
                  </tr>
                ) : filtered.map(l => (
                  <tr key={l.id} className={`hover:bg-gray-50 ${l.status === 'expired' ? 'bg-red-50' : l.status === 'warning' ? 'bg-yellow-50' : ''}`}>
                    <td className="px-4 py-3">
                      {l.status === 'expired' && <AlertTriangle size={14} className="text-red-500" />}
                      {l.status === 'warning' && <Clock size={14} className="text-yellow-500" />}
                      {l.status === 'ok' && <CheckCircle size={14} className="text-green-500" />}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs text-gray-500">{l.skuCode}</div>
                      <div className="text-gray-700">{l.skuName}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{l.lotNumber}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{l.qty.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {l.lotExpiry ? new Date(l.lotExpiry).toLocaleDateString('ko-KR') : '—'}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium text-sm ${
                      l.status === 'expired' ? 'text-red-600' :
                      l.status === 'warning' ? 'text-yellow-600' : 'text-gray-700'
                    }`}>
                      {l.daysLeft !== null ? (l.daysLeft < 0 ? `${Math.abs(l.daysLeft)}일 초과` : `D-${l.daysLeft}`) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
    </>
  )
}
