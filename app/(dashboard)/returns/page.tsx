'use client'

import { useEffect, useState } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { Plus, Search, RotateCcw } from 'lucide-react'

interface Return {
  id: string
  returnNo: string
  status: string
  reason: string | null
  refundAmount: string | null
  itemCount: number
  createdAt: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; next?: string }> = {
  requested:  { label: '접수', color: 'bg-yellow-100 text-yellow-700', next: '수거중' },
  received:   { label: '수거완료', color: 'bg-blue-100 text-blue-700', next: '검수중' },
  inspecting: { label: '검수중', color: 'bg-orange-100 text-orange-700', next: '완료/거절' },
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

  useEffect(() => {
    fetch('/api/returns')
      .then(r => r.ok ? r.json() : { returns: [] })
      .then(d => setReturns(d.returns ?? []))
      .finally(() => setLoading(false))
  }, [])

  const filtered = returns.filter(r =>
    (!statusFilter || r.status === statusFilter) &&
    r.returnNo.toLowerCase().includes(search.toLowerCase())
  )

  const pending = returns.filter(r => ['requested', 'received', 'inspecting'].includes(r.status)).length

  return (
    <div className="min-h-screen bg-gray-50">
      <Topbar title="반품 관리" />
      <main className="pt-14 pl-[220px]">
        <div className="p-6">

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-xs text-gray-500 mb-1">전체 반품</div>
              <div className="text-2xl font-bold text-gray-900">{returns.length}</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-xs text-gray-500 mb-1">처리 대기</div>
              <div className="text-2xl font-bold text-orange-600">{pending}</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-xs text-gray-500 mb-1">환불 완료</div>
              <div className="text-2xl font-bold text-green-600">
                {returns.filter(r => r.status === 'refunded').length}
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="text-xs text-gray-500 mb-1">총 환불액</div>
              <div className="text-2xl font-bold text-gray-900">
                ₩{returns.reduce((s, r) => s + Number(r.refundAmount ?? 0), 0).toLocaleString()}
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
                placeholder="반품번호 검색..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-white"
            >
              <option value="">전체 상태</option>
              {Object.entries(STATUS_CONFIG).map(([v, c]) => (
                <option key={v} value={v}>{c.label}</option>
              ))}
            </select>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
              <Plus size={14} /> 반품 접수
            </button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">반품번호</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">상태</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">사유</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">품목 수</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">환불액</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">접수일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={6} className="py-12 text-center text-gray-400">로딩 중...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <RotateCcw size={32} className="mx-auto mb-2 text-gray-300" />
                      <p className="text-sm text-gray-400">반품 내역이 없습니다</p>
                    </td>
                  </tr>
                ) : filtered.map(r => {
                  const cfg = STATUS_CONFIG[r.status] ?? { label: r.status, color: 'bg-gray-100 text-gray-600' }
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-4 py-3 font-mono text-xs text-blue-600">{r.returnNo}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{r.reason ?? '—'}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{r.itemCount}</td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {r.refundAmount ? `₩${Number(r.refundAmount).toLocaleString()}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(r.createdAt).toLocaleDateString('ko-KR')}
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
