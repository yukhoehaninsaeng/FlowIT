'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { formatKRW } from '@/lib/utils'
import { Search, Plus, X, Loader2, Package, Link2, Trash2, ChevronDown, ChevronUp, Tag } from 'lucide-react'

interface Product {
  id: string
  skuCode: string
  name: string
  category: string
  subCategory: string | null
  unit: string | null
  unitCost: string | null
  sellingPrice: string | null
  isActive: boolean
  createdAt: string
}

interface AccountProduct {
  id: string
  type: string
  customPrice: string | null
  notes: string | null
  skuMaster: Product
}

interface Account { id: string; name: string }

const DEFAULT_FORM = {
  skuCode: '', name: '', category: '', subCategory: '', unit: '', unitCost: '', sellingPrice: '', notes: ''
}

const UNITS = ['개', '박스', 'kg', 'g', 'L', 'ml', '세트', '장', '롤', '팩', '병']
const CAT_STORAGE_KEY = 'flowit_product_categories'

function loadStoredCategories(): string[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(CAT_STORAGE_KEY) ?? '[]') } catch { return [] }
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [storedCats, setStoredCats] = useState<string[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [newCatInput, setNewCatInput] = useState('')
  const [showCatInput, setShowCatInput] = useState(false)

  // 거래처 매핑 관련
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [mappings, setMappings] = useState<Record<string, AccountProduct[]>>({})
  const [loadingMappings, setLoadingMappings] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [mapForm, setMapForm] = useState({ accountId: '', type: 'sell', customPrice: '' })
  const [mapSaving, setMapSaving] = useState(false)

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setStoredCats(loadStoredCategories())
  }, [])

  const fetchProducts = useCallback(async (reset = false) => {
    setLoading(true)
    const params = new URLSearchParams({ limit: '30' })
    if (search) params.set('search', search)
    if (categoryFilter) params.set('category', categoryFilter)
    if (!reset && cursor) params.set('cursor', cursor)
    const res = await fetch(`/api/sku?${params}`)
    const json = await res.json()
    setLoading(false)
    const data: Product[] = json.data ?? []
    if (reset) {
      setProducts(data)
    } else {
      setProducts(prev => [...prev, ...data])
    }
    setHasMore(json.meta?.hasMore ?? false)
    setCursor(json.meta?.nextCursor ?? null)
  }, [search, categoryFilter, cursor])

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => { setCursor(null); fetchProducts(true) }, 300)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, categoryFilter])

  useEffect(() => {
    fetch('/api/accounts').then(r => r.json()).then(d => setAccounts(d.accounts ?? []))
  }, [])

  const productCats = Array.from(new Set(products.map(p => p.category))).sort()
  const allCategories = Array.from(new Set([...storedCats, ...productCats])).sort()

  function addCategory(cat: string) {
    const trimmed = cat.trim()
    if (!trimmed || storedCats.includes(trimmed)) return
    const next = [...storedCats, trimmed].sort()
    setStoredCats(next)
    localStorage.setItem(CAT_STORAGE_KEY, JSON.stringify(next))
  }

  function removeCategory(cat: string) {
    const next = storedCats.filter(c => c !== cat)
    setStoredCats(next)
    localStorage.setItem(CAT_STORAGE_KEY, JSON.stringify(next))
  }

  function handleAddCat() {
    if (newCatInput.trim()) {
      addCategory(newCatInput.trim())
      setNewCatInput('')
    }
    setShowCatInput(false)
  }

  async function handleCreate() {
    if (!form.skuCode.trim()) { setError('SKU 코드를 입력하세요.'); return }
    if (!form.name.trim()) { setError('상품명을 입력하세요.'); return }
    if (!form.category.trim()) { setError('카테고리를 입력하세요.'); return }
    setSaving(true); setError('')
    try {
      const r = await fetch('/api/sku', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skuCode: form.skuCode,
          name: form.name,
          category: form.category,
          subCategory: form.subCategory || undefined,
          unit: form.unit || undefined,
          unitCost: form.unitCost ? Number(form.unitCost) : undefined,
          sellingPrice: form.sellingPrice ? Number(form.sellingPrice) : undefined,
        }),
      })
      if (!r.ok) { const d = await r.json(); setError(d.error ?? '등록 실패'); return }
      addCategory(form.category)
      setShowForm(false); setForm(DEFAULT_FORM)
      setCursor(null); fetchProducts(true)
    } finally { setSaving(false) }
  }

  async function toggleExpand(productId: string) {
    if (expandedId === productId) { setExpandedId(null); return }
    setExpandedId(productId)
    if (mappings[productId]) return
    setLoadingMappings(productId)
    const r = await fetch(`/api/sku/${productId}/accounts`).catch(() => null)
    if (r && r.ok) {
      const d = await r.json()
      setMappings(prev => ({ ...prev, [productId]: d.data ?? [] }))
    } else {
      setMappings(prev => ({ ...prev, [productId]: [] }))
    }
    setLoadingMappings(null)
  }

  async function addMapping(productId: string) {
    if (!mapForm.accountId) return
    setMapSaving(true)
    try {
      const r = await fetch(`/api/accounts/${mapForm.accountId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skuMasterId: productId,
          type: mapForm.type,
          customPrice: mapForm.customPrice ? Number(mapForm.customPrice) : undefined,
        }),
      })
      if (r.ok) {
        const d = await r.json()
        setMappings(prev => ({
          ...prev,
          [productId]: [...(prev[productId] ?? []).filter(m => m.id !== d.data.id), d.data],
        }))
        setMapForm({ accountId: '', type: 'sell', customPrice: '' })
      }
    } finally { setMapSaving(false) }
  }

  async function removeMapping(productId: string, mappingId: string, accountId: string) {
    await fetch(`/api/accounts/${accountId}/products?mappingId=${mappingId}`, { method: 'DELETE' })
    setMappings(prev => ({ ...prev, [productId]: prev[productId].filter(m => m.id !== mappingId) }))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">상품 관리</h1>
          <p className="text-sm text-gray-500 mt-0.5">총 {products.length}개 상품</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setError('') }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
        >
          <Plus size={14} /> 상품 등록
        </button>
      </div>

      {/* 카테고리 관리 칩 */}
      <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1 text-xs font-medium text-gray-500 mr-1">
            <Tag size={12} /> 카테고리
          </span>
          {allCategories.map(cat => (
            <span key={cat} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-full group">
              {cat}
              {storedCats.includes(cat) && !productCats.includes(cat) && (
                <button onClick={() => removeCategory(cat)} className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <X size={10} />
                </button>
              )}
            </span>
          ))}
          {showCatInput ? (
            <div className="flex items-center gap-1">
              <input
                autoFocus
                value={newCatInput}
                onChange={e => setNewCatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddCat(); if (e.key === 'Escape') setShowCatInput(false) }}
                placeholder="카테고리명"
                className="w-28 px-2 py-1 text-xs border border-blue-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button onClick={handleAddCat} className="px-2 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700">추가</button>
              <button onClick={() => setShowCatInput(false)} className="text-gray-400 hover:text-gray-600"><X size={12} /></button>
            </div>
          ) : (
            <button onClick={() => setShowCatInput(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 border border-dashed border-gray-300 text-gray-400 text-xs rounded-full hover:border-blue-400 hover:text-blue-500 transition-colors">
              <Plus size={10} /> 추가
            </button>
          )}
        </div>
      </div>

      {/* 검색/필터 */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="상품명, SKU 코드 검색"
            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">전체 카테고리</option>
          {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* 상품 등록 폼 */}
      {showForm && (
        <div className="bg-white rounded-xl border border-blue-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">새 상품 등록</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-md mb-3">{error}</p>}
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">SKU 코드 *</label>
              <input value={form.skuCode} onChange={e => setForm(p => ({ ...p, skuCode: e.target.value }))}
                placeholder="PRD-001"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">상품명 *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="상품명을 입력하세요"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-3">
              <label className="block text-xs text-gray-500 mb-1">카테고리 * — 클릭해서 선택하거나 직접 입력</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {allCategories.map(cat => (
                  <button key={cat} type="button"
                    onClick={() => setForm(p => ({ ...p, category: cat }))}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${form.category === cat ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-100 text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600'}`}>
                    {cat}
                  </button>
                ))}
              </div>
              <input value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                placeholder="또는 새 카테고리 직접 입력"
                list="category-list"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <datalist id="category-list">
                {allCategories.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">서브 카테고리</label>
              <input value={form.subCategory} onChange={e => setForm(p => ({ ...p, subCategory: e.target.value }))}
                placeholder="선택사항"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">단위</label>
              <input value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
                placeholder="개, 박스, kg..."
                list="unit-list"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <datalist id="unit-list">
                {UNITS.map(u => <option key={u} value={u} />)}
              </datalist>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">매입 단가 (원)</label>
              <input type="number" min={0} value={form.unitCost} onChange={e => setForm(p => ({ ...p, unitCost: e.target.value }))}
                placeholder="0"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {form.unitCost && <p className="text-xs text-gray-400 mt-0.5">{formatKRW(Number(form.unitCost))}</p>}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">판매 단가 (원)</label>
              <input type="number" min={0} value={form.sellingPrice} onChange={e => setForm(p => ({ ...p, sellingPrice: e.target.value }))}
                placeholder="0"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {form.sellingPrice && <p className="text-xs text-gray-400 mt-0.5">{formatKRW(Number(form.sellingPrice))}</p>}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
              {saving && <Loader2 size={13} className="animate-spin" />} 등록
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">취소</button>
          </div>
        </div>
      )}

      {/* 상품 테이블 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">SKU 코드</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">상품명</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">카테고리</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">단위</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">매입 단가</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">판매 단가</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">거래처 연결</th>
            </tr>
          </thead>
          <tbody>
            {loading && products.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center text-gray-400">
                <Loader2 size={20} className="animate-spin mx-auto" />
              </td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center">
                <Package size={32} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-400">등록된 상품이 없습니다</p>
                <button onClick={() => setShowForm(true)} className="mt-2 text-sm text-blue-600 hover:text-blue-700">상품 등록하기</button>
              </td></tr>
            ) : products.map(product => (
              <>
                <tr key={product.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-blue-600">{product.skuCode}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{product.name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">{product.category}</span>
                    {product.subCategory && <span className="ml-1 text-xs text-gray-400">{product.subCategory}</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{product.unit ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {product.unitCost ? formatKRW(Number(product.unitCost)) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-blue-700 font-medium">
                    {product.sellingPrice ? formatKRW(Number(product.sellingPrice)) : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleExpand(product.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Link2 size={12} />
                      거래처
                      {expandedId === product.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  </td>
                </tr>
                {expandedId === product.id && (
                  <tr key={`${product.id}-expand`} className="bg-blue-50/30">
                    <td colSpan={7} className="px-6 py-4">
                      <div className="max-w-2xl">
                        <p className="text-xs font-semibold text-gray-600 mb-3">거래처별 가격 설정</p>
                        {loadingMappings === product.id ? (
                          <Loader2 size={16} className="animate-spin text-gray-400" />
                        ) : (
                          <>
                            {(mappings[product.id] ?? []).length > 0 && (
                              <div className="space-y-1 mb-3">
                                {mappings[product.id].map(m => (
                                  <div key={m.id} className="flex items-center gap-3 px-3 py-2 bg-white rounded border border-gray-100 text-xs">
                                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${m.type === 'sell' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                      {m.type === 'sell' ? '판매' : '매입'}
                                    </span>
                                    <span className="font-medium text-gray-800">{accounts.find(a => a.id === m.skuMaster?.id)?.name ?? '거래처'}</span>
                                    {m.customPrice && (
                                      <span className="text-blue-600 font-medium">{formatKRW(Number(m.customPrice))}</span>
                                    )}
                                    <button
                                      onClick={() => removeMapping(product.id, m.id, m.id)}
                                      className="ml-auto text-gray-300 hover:text-red-400"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="flex items-end gap-2">
                              <div>
                                <label className="block text-xs text-gray-400 mb-1">거래처</label>
                                <select
                                  value={mapForm.accountId}
                                  onChange={e => setMapForm(p => ({ ...p, accountId: e.target.value }))}
                                  className="px-2 py-1.5 text-xs border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                  <option value="">선택</option>
                                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-400 mb-1">유형</label>
                                <select
                                  value={mapForm.type}
                                  onChange={e => setMapForm(p => ({ ...p, type: e.target.value }))}
                                  className="px-2 py-1.5 text-xs border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                  <option value="sell">판매</option>
                                  <option value="buy">매입</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-400 mb-1">별도 단가 (선택)</label>
                                <input
                                  type="number" min={0}
                                  value={mapForm.customPrice}
                                  onChange={e => setMapForm(p => ({ ...p, customPrice: e.target.value }))}
                                  placeholder="기본 단가 사용"
                                  className="w-32 px-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                              <button
                                onClick={() => addMapping(product.id)}
                                disabled={!mapForm.accountId || mapSaving}
                                className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-40 flex items-center gap-1"
                              >
                                {mapSaving && <Loader2 size={11} className="animate-spin" />}
                                연결 추가
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
        {hasMore && (
          <div className="p-4 text-center border-t border-gray-100">
            <button onClick={() => fetchProducts(false)} disabled={loading}
              className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50">
              {loading ? '로딩 중...' : '더 보기'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
