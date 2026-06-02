'use client'

import { useEffect, useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Plus, Search, ArrowDownCircle, ArrowUpCircle, MoveRight, Warehouse } from 'lucide-react'

interface Movement {
  id: string
  type: 'inbound' | 'outbound' | 'transfer' | 'return' | 'adjust'
  skuCode: string | null
  skuName: string | null
  locationCode: string | null
  qty: number
  lotNumber: string | null
  notes: string | null
  createdAt: string
}

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  inbound:  { label: '입고', icon: <ArrowDownCircle size={14} />, color: 'text-green-600' },
  outbound: { label: '출고', icon: <ArrowUpCircle size={14} />, color: 'text-red-600' },
  transfer: { label: '이동', icon: <MoveRight size={14} />, color: 'text-blue-600' },
  return:   { label: '반품입고', icon: <ArrowDownCircle size={14} />, color: 'text-orange-600' },
  adjust:   { label: '재고조정', icon: null, color: 'text-gray-600' },
}

export default function WarehousePage() {
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  useEffect(() => {
    fetch('/api/warehouse/movements')
      .then(r => r.ok ? r.json() : { movements: [] })
      .then(d => setMovements(d.movements ?? []))
      .finally(() => setLoading(false))
  }, [])

  const filtered = movements.filter(m =>
    (!typeFilter || m.type === typeFilter) &&
    ((m.skuCode ?? '').toLowerCase().includes(search.toLowerCase()) ||
     (m.skuName ?? '').toLowerCase().includes(search.toLowerCase()) ||
     (m.lotNumber ?? '').toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Topbar title="창고·입출고 관리" />
      <main className="pt-14 pl-[220px]">
        <div className="p-6">

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
              const cnt = movements.filter(m => m.type === type).length
              return (
                <div key={type} className="bg-white rounded-lg border border-gray-200 p-4">
                  <div className={`flex items-center gap-1.5 text-sm font-medium mb-1 ${cfg.color}`}>
                    {cfg.icon}{cfg.label}
                  </div>
                  <div className="text-2xl font-bold text-gray-900">{cnt}</div>
                  <div className="text-xs text-gray-400">전체 내역 수</div>
                </div>
              )
            })}
          </div>

          {/* Filters */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="SKU 코드, 상품명, LOT 번호 검색..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">전체 유형</option>
              {Object.entries(TYPE_CONFIG).map(([v, c]) => (
                <option key={v} value={v}>{c.label}</option>
              ))}
            </select>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
              <Plus size={14} /> 입출고 등록
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">유형</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">LOT 번호</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">위치</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">수량</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">비고</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">일시</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={7} className="py-12 text-center text-gray-400">로딩 중...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <Warehouse size={32} className="mx-auto mb-2 text-gray-300" />
                      <p className="text-sm text-gray-400">입출고 내역이 없습니다</p>
                    </td>
                  </tr>
                ) : filtered.map(m => {
                  const cfg = TYPE_CONFIG[m.type]
                  return (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className={`flex items-center gap-1 font-medium ${cfg?.color}`}>
                          {cfg?.icon}{cfg?.label ?? m.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs text-gray-500">{m.skuCode}</div>
                        <div className="text-gray-700">{m.skuName}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">{m.lotNumber ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{m.locationCode ?? '—'}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {m.type === 'outbound' ? `-${m.qty}` : `+${m.qty}`}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{m.notes ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(m.createdAt).toLocaleString('ko-KR')}
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
