'use client'

import { useEffect, useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Plus, Search, FileText, Package, ChevronDown } from 'lucide-react'

interface PO {
  id: string
  orderNo: string
  type: 'purchase' | 'sales'
  partnerName: string | null
  status: string
  totalAmount: string | null
  dueDate: string | null
  createdAt: string
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  draft:     { label: '초안', color: 'bg-gray-100 text-gray-600' },
  confirmed: { label: '확정', color: 'bg-blue-100 text-blue-700' },
  shipped:   { label: '출고', color: 'bg-orange-100 text-orange-700' },
  completed: { label: '완료', color: 'bg-green-100 text-green-700' },
  cancelled: { label: '취소', color: 'bg-red-100 text-red-700' },
}

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PO[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'purchase' | 'sales'>('purchase')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/purchase-orders')
      .then(r => r.ok ? r.json() : { orders: [] })
      .then(d => setOrders(d.orders ?? []))
      .finally(() => setLoading(false))
  }, [])

  const filtered = orders.filter(o =>
    o.type === tab &&
    (o.orderNo.toLowerCase().includes(search.toLowerCase()) ||
     (o.partnerName ?? '').toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Topbar title="발주·수주 관리" />
      <main className="pt-14 pl-[220px]">
        <div className="p-6">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setTab('purchase')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === 'purchase' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                발주 (구매)
              </button>
              <button
                onClick={() => setTab('sales')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === 'sales' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                수주 (판매)
              </button>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
              <Plus size={14} />
              {tab === 'purchase' ? '발주서 등록' : '수주서 등록'}
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-4">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="주문번호, 거래처 검색..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">주문번호</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">거래처</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">상태</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">금액</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">납기일</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">생성일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">로딩 중...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <FileText size={32} className="mx-auto mb-2 text-gray-300" />
                      <p className="text-sm text-gray-400">{tab === 'purchase' ? '발주서' : '수주서'}가 없습니다</p>
                    </td>
                  </tr>
                ) : filtered.map(o => {
                  const st = STATUS_LABEL[o.status] ?? { label: o.status, color: 'bg-gray-100 text-gray-600' }
                  return (
                    <tr key={o.id} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-4 py-3 font-mono text-xs text-blue-600">{o.orderNo}</td>
                      <td className="px-4 py-3 text-gray-700">{o.partnerName ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${st.color}`}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {o.totalAmount ? `₩${Number(o.totalAmount).toLocaleString()}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {o.dueDate ? new Date(o.dueDate).toLocaleDateString('ko-KR') : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(o.createdAt).toLocaleDateString('ko-KR')}
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
