'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Plus, X, Loader2, Building2, Phone, Mail, FileText } from 'lucide-react'

interface Account {
  id: string
  name: string
  type: string
  industry: string | null
  contactName: string | null
  contactPhone: string | null
  contactEmail: string | null
  emailDomain: string | null
  paymentTerms: string | null
  createdAt: string
  _count: { deals: number; contactLogs: number; receivables: number }
}

const TYPE_LABEL: Record<string, string> = {
  prospect: '잠재고객', customer: '고객사', partner: '파트너', vendor: '공급사'
}
const TYPE_COLOR: Record<string, string> = {
  prospect: 'bg-gray-100 text-gray-600',
  customer: 'bg-blue-100 text-blue-700',
  partner: 'bg-purple-100 text-purple-700',
  vendor: 'bg-orange-100 text-orange-700',
}

const DEFAULT_FORM = {
  name: '', type: 'prospect', industry: '', contactName: '',
  contactPhone: '', contactEmail: '', address: '', paymentTerms: '', notes: ''
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('q', search)
    const r = await fetch(`/api/accounts?${params}`)
    const d = await r.json()
    setAccounts(d.accounts ?? [])
    setLoading(false)
  }, [search])

  useEffect(() => { load() }, [load])

  async function handleCreate() {
    if (!form.name.trim()) { setError('거래처명은 필수입니다.'); return }
    setSaving(true); setError('')
    try {
      const r = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          industry: form.industry || null,
          contactName: form.contactName || null,
          contactPhone: form.contactPhone || null,
          contactEmail: form.contactEmail || null,
          address: form.address || null,
          paymentTerms: form.paymentTerms || null,
          notes: form.notes || null,
        }),
      })
      if (!r.ok) { const d = await r.json(); setError(d.error ?? '등록 실패'); return }
      setShowModal(false); setForm(DEFAULT_FORM); load()
    } finally { setSaving(false) }
  }

  const filtered = accounts.filter(a =>
    (!typeFilter || a.type === typeFilter) &&
    (a.name.toLowerCase().includes(search.toLowerCase()) ||
     (a.contactEmail ?? '').toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">거래처</h1>
        <button onClick={() => { setShowModal(true); setError('') }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700">
          <Plus size={14} /> 거래처 등록
        </button>
      </div>

      {/* 검색/필터 */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="거래처명, 이메일 검색"
            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">전체 유형</option>
          {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {/* 카드 그리드 */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-gray-400" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Building2 size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-400">거래처가 없습니다</p>
          <button onClick={() => setShowModal(true)}
            className="mt-3 text-sm text-blue-600 hover:text-blue-700">거래처 등록하기</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(a => (
            <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{a.name}</h3>
                  {a.industry && <p className="text-xs text-gray-400 mt-0.5">{a.industry}</p>}
                </div>
                <span className={`flex-shrink-0 ml-2 px-2 py-0.5 text-xs rounded-full font-medium ${TYPE_COLOR[a.type] ?? 'bg-gray-100 text-gray-600'}`}>
                  {TYPE_LABEL[a.type] ?? a.type}
                </span>
              </div>

              <div className="space-y-1.5">
                {a.contactName && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Building2 size={12} className="flex-shrink-0 text-gray-400" />
                    {a.contactName}
                  </div>
                )}
                {a.contactPhone && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Phone size={12} className="flex-shrink-0 text-gray-400" />
                    {a.contactPhone}
                  </div>
                )}
                {a.contactEmail && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Mail size={12} className="flex-shrink-0 text-gray-400" />
                    <span className="truncate">{a.contactEmail}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                <span>딜 {a._count.deals}건</span>
                <span>상담 {a._count.contactLogs}건</span>
                <span>미수금 {a._count.receivables}건</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 등록 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 className="text-sm font-semibold text-gray-900">거래처 등록</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>}

              <div>
                <label className="block text-xs text-gray-500 mb-1">거래처명 *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="(주)샘플컴퍼니"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">유형</label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white">
                    {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">업종</label>
                  <input value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))}
                    placeholder="제조, 유통, IT 등"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-medium text-gray-500 mb-3">담당자 정보</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">담당자명</label>
                    <input value={form.contactName} onChange={e => setForm(p => ({ ...p, contactName: e.target.value }))}
                      placeholder="홍길동 과장"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">전화번호</label>
                      <input value={form.contactPhone} onChange={e => setForm(p => ({ ...p, contactPhone: e.target.value }))}
                        placeholder="02-0000-0000"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">이메일</label>
                      <input type="email" value={form.contactEmail} onChange={e => setForm(p => ({ ...p, contactEmail: e.target.value }))}
                        placeholder="hong@company.com"
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-medium text-gray-500 mb-3">기타 정보</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">주소</label>
                    <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                      placeholder="서울시 강남구 ..."
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">결제 조건</label>
                    <input value={form.paymentTerms} onChange={e => setForm(p => ({ ...p, paymentTerms: e.target.value }))}
                      placeholder="예: 월말 마감 익월 10일 지급"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">메모</label>
                    <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                      rows={2} placeholder="특이사항, 주의사항 등"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-gray-200 sticky bottom-0 bg-white">
              <button onClick={handleCreate} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
                {saving && <Loader2 size={13} className="animate-spin" />} 등록
              </button>
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
