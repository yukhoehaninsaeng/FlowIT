'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { formatKRW, maskEmail } from '@/lib/utils'
import { Search } from 'lucide-react'

interface Customer {
  id: string; name: string | null; email: string | null; phone: string | null
  segment: string; ltv: string; skinType: string | null; lastOrderAt: string | null
}

const SEGMENTS = ['', 'vip', 'loyal', 'normal', 'churn_risk', 'new']
const SEGMENT_LABEL: Record<string, string> = {
  vip: 'VIP', loyal: '충성', normal: '일반', churn_risk: '이탈위험', new: '신규'
}
const SEGMENT_COLOR: Record<string, string> = {
  vip: 'bg-yellow-100 text-yellow-800',
  loyal: 'bg-blue-100 text-blue-800',
  normal: 'bg-gray-100 text-gray-700',
  churn_risk: 'bg-red-100 text-red-700',
  new: 'bg-green-100 text-green-700'
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [segment, setSegment] = useState('')
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)

  const fetchCustomers = useCallback(async (reset = false, currentCursor: string | null = null) => {
    setLoading(true)
    const params = new URLSearchParams({ limit: '20' })
    if (search) params.set('search', search)
    if (segment) params.set('segment', segment)
    if (!reset && currentCursor) params.set('cursor', currentCursor)

    const res = await fetch(`/api/customers?${params}`)
    const json = await res.json()
    setLoading(false)
    if (reset) {
      setCustomers(json.data ?? [])
    } else {
      setCustomers(prev => [...prev, ...(json.data ?? [])])
    }
    setHasMore(json.meta?.hasMore ?? false)
    setCursor(json.meta?.nextCursor ?? null)
  }, [search, segment])

  useEffect(() => {
    setCursor(null)
    fetchCustomers(true)
  }, [search, segment, fetchCustomers])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">고객</h1>
      </div>

      {/* 검색/필터 */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="이름, 이메일, 전화번호 검색"
            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={segment}
          onChange={e => setSegment(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">전체 세그먼트</option>
          {SEGMENTS.filter(Boolean).map(s => (
            <option key={s} value={s}>{SEGMENT_LABEL[s] ?? s}</option>
          ))}
        </select>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">이름</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">이메일</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">세그먼트</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">LTV</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">최근 구매일</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(c => (
              <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/customers/${c.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                    {c.name ?? '(이름 없음)'}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-500">{c.email ? maskEmail(c.email) : '-'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${SEGMENT_COLOR[c.segment] ?? 'bg-gray-100 text-gray-600'}`}>
                    {SEGMENT_LABEL[c.segment] ?? c.segment}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-gray-900 font-medium">{formatKRW(Number(c.ltv))}</td>
                <td className="px-4 py-3 text-gray-500">
                  {c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString('ko-KR') : '-'}
                </td>
              </tr>
            ))}
            {customers.length === 0 && !loading && (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400 text-sm">고객이 없습니다</td></tr>
            )}
          </tbody>
        </table>

        {hasMore && (
          <div className="p-4 text-center border-t border-gray-100">
            <button
              onClick={() => fetchCustomers(false, cursor)}
              disabled={loading}
              className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              {loading ? '로딩 중...' : '더 보기'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
