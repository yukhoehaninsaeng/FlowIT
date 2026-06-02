'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Plus, Download, Copy, Send, CheckCircle, XCircle, Clock, FileText, Loader2, Search } from 'lucide-react'

interface QuoteItem {
  name: string
  qty: number
  unitPrice: number
  discount?: number
  total: number
}

interface ProductSuggestion {
  id: string
  skuCode: string
  name: string
  unit: string | null
  sellingPrice: string | null
  category: string
}

interface Quote {
  id: string
  quoteNo: string
  title: string
  version: number
  status: string
  totalAmount: string
  validUntil: string | null
  sentAt: string | null
  createdAt: string
  account: { id: string; name: string } | null
  deal: { id: string; title: string } | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft:    { label: '초안', color: 'bg-gray-100 text-gray-700', icon: <FileText size={12} /> },
  sent:     { label: '발송됨', color: 'bg-blue-100 text-blue-700', icon: <Send size={12} /> },
  accepted: { label: '수락', color: 'bg-green-100 text-green-700', icon: <CheckCircle size={12} /> },
  rejected: { label: '거절', color: 'bg-red-100 text-red-700', icon: <XCircle size={12} /> },
  expired:  { label: '만료', color: 'bg-gray-100 text-gray-500', icon: <Clock size={12} /> },
}

interface NewQuoteForm {
  title: string
  accountId: string
  dealId: string
  taxRate: number
  validUntil: string
  notes: string
  terms: string
  items: QuoteItem[]
}

const DEFAULT_FORM: NewQuoteForm = {
  title: '', accountId: '', dealId: '', taxRate: 10,
  validUntil: '', notes: '', terms: '',
  items: [{ name: '', qty: 1, unitPrice: 0, discount: 0, total: 0 }],
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<NewQuoteForm>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null)

  // 상품 검색
  const [productSearch, setProductSearch] = useState<Record<number, string>>({})
  const [productSuggestions, setProductSuggestions] = useState<Record<number, ProductSuggestion[]>>({})
  const [showSuggestions, setShowSuggestions] = useState<Record<number, boolean>>({})
  const searchTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  async function searchProducts(idx: number, query: string) {
    setProductSearch(prev => ({ ...prev, [idx]: query }))
    if (searchTimers.current[idx]) clearTimeout(searchTimers.current[idx])
    if (!query.trim()) { setProductSuggestions(prev => ({ ...prev, [idx]: [] })); return }
    searchTimers.current[idx] = setTimeout(async () => {
      const r = await fetch(`/api/sku?search=${encodeURIComponent(query)}&limit=8`)
      const d = await r.json()
      setProductSuggestions(prev => ({ ...prev, [idx]: d.data ?? [] }))
      setShowSuggestions(prev => ({ ...prev, [idx]: true }))
    }, 250)
  }

  function selectProduct(idx: number, product: ProductSuggestion) {
    const unitPrice = product.sellingPrice ? Number(product.sellingPrice) : 0
    setForm(prev => {
      const items = [...prev.items]
      const item = { ...items[idx], name: product.name, unitPrice }
      const base = item.qty * item.unitPrice
      item.total = item.discount ? base * (1 - item.discount / 100) : base
      items[idx] = item
      return { ...prev, items }
    })
    setProductSearch(prev => ({ ...prev, [idx]: '' }))
    setShowSuggestions(prev => ({ ...prev, [idx]: false }))
  }

  const load = useCallback(async () => {
    const [qr, ar] = await Promise.all([
      fetch('/api/quotes').then(r => r.json()),
      fetch('/api/accounts').then(r => r.json()),
    ])
    setQuotes(qr.quotes ?? [])
    setAccounts(ar.accounts ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function recalcItem(idx: number, field: keyof QuoteItem, value: string | number) {
    setForm(prev => {
      const items = [...prev.items]
      const item = { ...items[idx], [field]: value }
      const base = item.qty * item.unitPrice
      item.total = item.discount ? base * (1 - item.discount / 100) : base
      items[idx] = item
      return { ...prev, items }
    })
  }

  function addItem() {
    setForm(prev => ({ ...prev, items: [...prev.items, { name: '', qty: 1, unitPrice: 0, discount: 0, total: 0 }] }))
  }

  function removeItem(idx: number) {
    setForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }))
  }

  const subtotal = form.items.reduce((s, i) => s + i.total, 0)
  const taxAmount = subtotal * (form.taxRate / 100)
  const totalAmount = subtotal + taxAmount

  async function saveQuote() {
    setSaving(true)
    try {
      await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          accountId: form.accountId || null,
          dealId: form.dealId || null,
          validUntil: form.validUntil || null,
        }),
      })
      setShowForm(false)
      setForm(DEFAULT_FORM)
      await load()
    } finally { setSaving(false) }
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/quotes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await load()
  }

  async function copyVersion(id: string) {
    await fetch(`/api/quotes/${id}`, { method: 'POST' })
    await load()
  }

  async function downloadPdf(id: string, quoteNo: string) {
    setGeneratingPdf(id)
    try {
      const res = await fetch(`/api/quotes/${id}/pdf`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${quoteNo}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } finally { setGeneratingPdf(null) }
  }

  const filtered = quotes.filter(q => !statusFilter || q.status === statusFilter)

  return (
    <>

          {/* Stats */}
          <div className="grid grid-cols-5 gap-3 mb-6">
            {(['draft', 'sent', 'accepted', 'rejected', 'expired'] as const).map(st => {
              const cfg = STATUS_CONFIG[st]
              const cnt = quotes.filter(q => q.status === st).length
              const total = quotes.filter(q => q.status === st).reduce((s, q) => s + Number(q.totalAmount), 0)
              return (
                <button key={st} onClick={() => setStatusFilter(statusFilter === st ? '' : st)}
                  className={`bg-white rounded-lg border p-3 text-left transition-all ${statusFilter === st ? 'border-blue-500 shadow-sm' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium mb-1 ${cfg.color}`}>
                    {cfg.icon}{cfg.label}
                  </div>
                  <div className="text-lg font-bold text-gray-900">{cnt}</div>
                  <div className="text-xs text-gray-400">₩{Math.round(total / 10000).toLocaleString()}만</div>
                </button>
              )
            })}
          </div>

          {/* Actions */}
          <div className="flex justify-between mb-4">
            <div />
            <button onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
              <Plus size={14} /> 견적서 작성
            </button>
          </div>

          {/* Quote Form */}
          {showForm && (
            <div className="bg-white rounded-lg border border-blue-200 p-6 mb-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">새 견적서 작성</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 block mb-1">견적명 *</label>
                  <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="예: 2024년 상반기 납품 견적"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">거래처</label>
                  <select value={form.accountId} onChange={e => setForm(p => ({ ...p, accountId: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white">
                    <option value="">선택</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">유효기간</label>
                  <input type="date" value={form.validUntil} onChange={e => setForm(p => ({ ...p, validUntil: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
              </div>

              {/* Items */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-500">품목</label>
                  <button onClick={addItem} className="text-xs text-blue-600 hover:text-blue-800">+ 품목 추가</button>
                </div>
                <div className="border border-gray-200 rounded-md overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-500 font-medium">품목명</th>
                        <th className="px-3 py-2 text-right text-gray-500 font-medium w-16">수량</th>
                        <th className="px-3 py-2 text-right text-gray-500 font-medium w-28">단가</th>
                        <th className="px-3 py-2 text-right text-gray-500 font-medium w-16">할인%</th>
                        <th className="px-3 py-2 text-right text-gray-500 font-medium w-28">금액</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {form.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-2 py-1.5">
                            <div className="relative">
                              <div className="flex gap-1">
                                <input value={item.name} onChange={e => recalcItem(idx, 'name', e.target.value)}
                                  placeholder="품목명"
                                  className="flex-1 px-2 py-1 border border-gray-200 rounded-l focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs" />
                                <div className="relative">
                                  <input
                                    value={productSearch[idx] ?? ''}
                                    onChange={e => searchProducts(idx, e.target.value)}
                                    onFocus={() => setShowSuggestions(prev => ({ ...prev, [idx]: !!(productSuggestions[idx]?.length) }))}
                                    onBlur={() => setTimeout(() => setShowSuggestions(prev => ({ ...prev, [idx]: false })), 200)}
                                    placeholder="상품 검색"
                                    className="w-24 px-2 py-1 border border-l-0 border-gray-200 rounded-r focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs text-gray-500"
                                  />
                                  <Search size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none" />
                                </div>
                              </div>
                              {showSuggestions[idx] && (productSuggestions[idx] ?? []).length > 0 && (
                                <div className="absolute top-full left-0 right-0 z-50 bg-white border border-gray-200 rounded-md shadow-lg mt-0.5 overflow-hidden">
                                  {productSuggestions[idx].map(p => (
                                    <button
                                      key={p.id}
                                      onMouseDown={() => selectProduct(idx, p)}
                                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-blue-50 text-left"
                                    >
                                      <div>
                                        <span className="text-xs font-medium text-gray-900">{p.name}</span>
                                        <span className="text-xs text-gray-400 ml-1.5">{p.skuCode}</span>
                                      </div>
                                      <div className="text-right">
                                        <span className="text-xs text-blue-600 font-medium">
                                          {p.sellingPrice ? `₩${Number(p.sellingPrice).toLocaleString()}` : '단가 없음'}
                                        </span>
                                        {p.unit && <span className="text-xs text-gray-400 ml-1">/{p.unit}</span>}
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="number" value={item.qty} min={1}
                              onChange={e => recalcItem(idx, 'qty', Number(e.target.value))}
                              className="w-full px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs text-right" />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="number" value={item.unitPrice} min={0}
                              onChange={e => recalcItem(idx, 'unitPrice', Number(e.target.value))}
                              className="w-full px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs text-right" />
                          </td>
                          <td className="px-2 py-1.5">
                            <input type="number" value={item.discount ?? 0} min={0} max={100}
                              onChange={e => recalcItem(idx, 'discount', Number(e.target.value))}
                              className="w-full px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs text-right" />
                          </td>
                          <td className="px-3 py-1.5 text-right text-gray-700 font-medium">
                            {Math.round(item.total).toLocaleString()}
                          </td>
                          <td className="px-2 py-1.5">
                            <button onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-400 text-xs">✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t border-gray-200">
                      <tr>
                        <td colSpan={4} className="px-3 py-2 text-right text-xs text-gray-500">소계</td>
                        <td className="px-3 py-2 text-right text-xs font-medium">₩{Math.round(subtotal).toLocaleString()}</td>
                        <td />
                      </tr>
                      <tr>
                        <td colSpan={4} className="px-3 py-2 text-right text-xs text-gray-500">부가세 ({form.taxRate}%)</td>
                        <td className="px-3 py-2 text-right text-xs font-medium">₩{Math.round(taxAmount).toLocaleString()}</td>
                        <td />
                      </tr>
                      <tr>
                        <td colSpan={4} className="px-3 py-2 text-right text-sm font-bold text-blue-600">합계</td>
                        <td className="px-3 py-2 text-right text-sm font-bold text-blue-600">₩{Math.round(totalAmount).toLocaleString()}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">비고</label>
                  <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                    rows={2} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">계약 조건</label>
                  <textarea value={form.terms} onChange={e => setForm(p => ({ ...p, terms: e.target.value }))}
                    rows={2} placeholder="납기, 결제 조건 등"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none" />
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={saveQuote} disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50">
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  저장
                </button>
                <button onClick={() => { setShowForm(false); setForm(DEFAULT_FORM) }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">취소</button>
              </div>
            </div>
          )}

          {/* Quote List */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">견적번호</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">견적명</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">거래처</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">상태</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">금액</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">유효기간</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">액션</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={7} className="py-12 text-center text-gray-400">로딩 중...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <FileText size={32} className="mx-auto mb-2 text-gray-300" />
                      <p className="text-sm text-gray-400">견적서가 없습니다</p>
                    </td>
                  </tr>
                ) : filtered.map(q => {
                  const cfg = STATUS_CONFIG[q.status]
                  return (
                    <tr key={q.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs text-blue-600">{q.quoteNo}</div>
                        <div className="text-xs text-gray-400">v{q.version}</div>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{q.title}</td>
                      <td className="px-4 py-3 text-gray-600">{q.account?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${cfg.color}`}>
                          {cfg.icon}{cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        ₩{Number(q.totalAmount).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {q.validUntil ? new Date(q.validUntil).toLocaleDateString('ko-KR') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => downloadPdf(q.id, q.quoteNo)}
                            disabled={generatingPdf === q.id}
                            title="PDF 다운로드"
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          >
                            {generatingPdf === q.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                          </button>
                          {q.status === 'draft' && (
                            <button onClick={() => updateStatus(q.id, 'sent')} title="발송 처리"
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                              <Send size={14} />
                            </button>
                          )}
                          {q.status === 'sent' && (
                            <>
                              <button onClick={() => updateStatus(q.id, 'accepted')} title="수락"
                                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded">
                                <CheckCircle size={14} />
                              </button>
                              <button onClick={() => updateStatus(q.id, 'rejected')} title="거절"
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                                <XCircle size={14} />
                              </button>
                            </>
                          )}
                          <button onClick={() => copyVersion(q.id)} title="새 버전 생성"
                            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded">
                            <Copy size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
    </>
  )
}
