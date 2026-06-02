'use client'

import { useEffect, useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Plus, Search, Truck, Package } from 'lucide-react'

interface Shipment {
  id: string
  trackingNo: string | null
  carrier: string | null
  status: string
  recipientName: string | null
  recipientAddress: string | null
  boxCount: number | null
  shippedAt: string | null
  deliveredAt: string | null
  createdAt: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  preparing:   { label: '준비중', color: 'bg-gray-100 text-gray-700' },
  shipped:     { label: '발송됨', color: 'bg-blue-100 text-blue-700' },
  in_transit:  { label: '운송중', color: 'bg-orange-100 text-orange-700' },
  delivered:   { label: '배송완료', color: 'bg-green-100 text-green-700' },
  failed:      { label: '배송실패', color: 'bg-red-100 text-red-700' },
}

const CARRIERS = ['CJ대한통운', '롯데택배', '한진택배', '우체국택배', '로젠택배']

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    fetch('/api/shipments')
      .then(r => r.ok ? r.json() : { shipments: [] })
      .then(d => setShipments(d.shipments ?? []))
      .finally(() => setLoading(false))
  }, [])

  const filtered = shipments.filter(s =>
    (!statusFilter || s.status === statusFilter) &&
    ((s.trackingNo ?? '').toLowerCase().includes(search.toLowerCase()) ||
     (s.recipientName ?? '').toLowerCase().includes(search.toLowerCase()))
  )

  const stats = Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({
    ...cfg,
    key,
    count: shipments.filter(s => s.status === key).length
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <Topbar title="배송 추적" />
      <main className="pt-14 pl-[220px]">
        <div className="p-6">

          {/* Stats */}
          <div className="flex gap-3 mb-6 flex-wrap">
            {stats.map(s => (
              <button
                key={s.key}
                onClick={() => setStatusFilter(statusFilter === s.key ? '' : s.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm transition-all ${
                  statusFilter === s.key
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.color}`}>{s.label}</span>
                <span className="font-bold text-gray-900">{s.count}</span>
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="운송장번호, 수령인 검색..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
              <Plus size={14} /> 배송 등록
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">운송장번호</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">택배사</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">상태</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">수령인</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">주소</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">박스</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">발송일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={7} className="py-12 text-center text-gray-400">로딩 중...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <Truck size={32} className="mx-auto mb-2 text-gray-300" />
                      <p className="text-sm text-gray-400">배송 내역이 없습니다</p>
                    </td>
                  </tr>
                ) : filtered.map(s => {
                  const cfg = STATUS_CONFIG[s.status] ?? { label: s.status, color: 'bg-gray-100 text-gray-600' }
                  return (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs text-blue-600">{s.trackingNo ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-700">{s.carrier ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{s.recipientName ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-[200px] truncate">{s.recipientAddress ?? '—'}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{s.boxCount ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {s.shippedAt ? new Date(s.shippedAt).toLocaleDateString('ko-KR') : '—'}
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
