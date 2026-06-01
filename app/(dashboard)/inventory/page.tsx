'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatKRW } from '@/lib/utils'
import { Search, Plus } from 'lucide-react'
import Link from 'next/link'

interface Sku {
  id: string; skuCode: string; name: string; category: string; sellingPrice: string
  isBundle: boolean; isActive: boolean; lotExpiry: string | null
  inventory: { channel: string; qtyAvailable: number }[]
}

const CATEGORIES = ['', 'skincare', 'makeup', 'suncare', 'bodycare', 'haircare']

export default function InventoryPage() {
  const [skus, setSkus] = useState<Sku[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)

  const fetchSkus = useCallback(async (reset = false, currentCursor: string | null = null) => {
    const params = new URLSearchParams({ limit: '20' })
    if (search) params.set('search', search)
    if (category) params.set('category', category)
    if (!reset && currentCursor) params.set('cursor', currentCursor)

    const res = await fetch(`/api/sku?${params}`)
    const json = await res.json()
    if (reset) setSkus(json.data ?? [])
    else setSkus(prev => [...prev, ...(json.data ?? [])])
    setHasMore(json.meta?.hasMore ?? false)
    setCursor(json.meta?.nextCursor ?? null)
  }, [search, category])

  useEffect(() => { setCursor(null); fetchSkus(true) }, [search, category, fetchSkus])

  const isExpiringSoon = (date: string | null) => {
    if (!date) return false
    return new Date(date).getTime() - Date.now() < 60 * 24 * 60 * 60 * 1000
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">재고·SKU</h1>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-700">
          <Plus size={14} />
          SKU 추가
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="SKU 코드, 상품명 검색"
            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none"
        >
          <option value="">전체 카테고리</option>
          {CATEGORIES.filter(Boolean).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">SKU 코드</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">상품명</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">카테고리</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">판매가</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">총 재고</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">유통기한</th>
            </tr>
          </thead>
          <tbody>
            {skus.map(sku => {
              const totalQty = sku.inventory.reduce((s, i) => s + i.qtyAvailable, 0)
              const expiring = isExpiringSoon(sku.lotExpiry)
              return (
                <tr key={sku.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/api/sku/${sku.id}`} className="font-mono text-xs text-blue-600 hover:underline">{sku.skuCode}</Link>
                  </td>
                  <td className="px-4 py-3 text-gray-900">
                    {sku.name}
                    {sku.isBundle && <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">세트</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{sku.category}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{formatKRW(Number(sku.sellingPrice))}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={totalQty <= 0 ? 'text-red-600 font-medium' : 'text-gray-900'}>{totalQty.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3">
                    {sku.lotExpiry ? (
                      <span className={expiring ? 'text-red-600 font-medium' : 'text-gray-500'}>
                        {new Date(sku.lotExpiry).toLocaleDateString('ko-KR')}
                      </span>
                    ) : '-'}
                  </td>
                </tr>
              )
            })}
            {skus.length === 0 && (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400 text-sm">SKU가 없습니다</td></tr>
            )}
          </tbody>
        </table>
        {hasMore && (
          <div className="p-4 text-center border-t">
            <button onClick={() => fetchSkus(false, cursor)} className="text-sm text-blue-600 hover:text-blue-700">더 보기</button>
          </div>
        )}
      </div>
    </div>
  )
}
