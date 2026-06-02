'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { formatKRW, maskEmail } from '@/lib/utils'
import { Search, Plus, X, Loader2 } from 'lucide-react'

interface Customer {
  id: string; name: string | null; email: string | null; phone: string | null
  segment: string; ltv: string; skinType: string | null
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

const DEFAULT_FORM = { name: '', email: '', phone: '', gender: '', birthYear: '', skinType: '', segment: 'new' }

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [segment, setSegment] = useState('')
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchCustomers = useCallback(async (reset = false, currentCursor: string | null = null) => {
    setLoading(true)
    const params = new URLSearchParams({ limit: '20' })
    if (search) params.set('search', search)
    if (segment) params.set('segment', segment)
    if (!reset && currentCursor) params.set('cursor', currentCursor)
    const res = await fetch(`/api/customers?${params}`)
    const json = await res.json()
    setLoading(false)
    if (reset) setCustomers(json.data ?? [])
    else setCustomers(prev => [...prev, ...(json.data ?? [])])
    setHasMore(json.meta?.hasMore ?? false)
    setCursor(json.meta?.nextCursor ?? null)
  }, [search, segment])

  useEffect(() => { setCursor(null); fetchCustomers(true) }, [search, segment, fetchCustomers])

  async function handleCreate() {
    if (!form.name && !form.email && !form.phone) {
      setError('이름, 이메일, 전화번호 중 하나는 필수입니다.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const body: Record<string, unknown> = {}
      if (form.name) body.name = form.name
      if (form.email) body.email = form.email
      if (form.phone) body.phone = form.phone
      if (form.gender) body.gender = form.gender
      if (form.birthYear) body.birthYear = parseInt(form.birthYear)
      if (form.skinType) body.skinType = form.skinType
      if (form.segment) body.segment = form.segment

      const r = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!r.ok) {
        const d = await r.json()
        setError(d.error ?? '등록에 실패했습니다.')
        return
      }
      setShowModal(false)
      setForm(DEFAULT_FORM)
      fetchCustomers(true)
    } finally {
      setSaving(false)
    }
  }

  function Field({ label, name, type = 'text', placeholder = '' }: { label: string; name: keyof typeof form; type?: string; placeholder?: string }) {
    return (
      <div>
        <label className="block text-xs text-gray-500 mb-1">{label}</label>
        <input
          type={type}
          value={form[name]}
          onChange={e => setForm(p => ({ ...p, [name]: e.target.value }))}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">고객</h1>
        <button
          onClick={() => { setShowModal(true); setError('') }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
        >
          <Plus size={14} /> 고객 등록
        </button>
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
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">전화번호</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">세그먼트</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">LTV</th>
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
                <td className="px-4 py-3 text-gray-500">{c.phone ?? '-'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${SEGMENT_COLOR[c.segment] ?? 'bg-gray-100 text-gray-600'}`}>
                    {SEGMENT_LABEL[c.segment] ?? c.segment}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-gray-900 font-medium">{formatKRW(Number(c.ltv))}</td>
              </tr>
            ))}
            {customers.length === 0 && !loading && (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400 text-sm">고객이 없습니다</td></tr>
            )}
          </tbody>
        </table>
        {hasMore && (
          <div className="p-4 text-center border-t border-gray-100">
            <button onClick={() => fetchCustomers(false, cursor)} disabled={loading}
              className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50">
              {loading ? '로딩 중...' : '더 보기'}
            </button>
          </div>
        )}
      </div>

      {/* 등록 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900">고객 등록</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-3">
              {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>}
              <Field label="이름" name="name" placeholder="홍길동" />
              <Field label="이메일" name="email" type="email" placeholder="hong@company.com" />
              <Field label="전화번호" name="phone" placeholder="010-0000-0000" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">성별</label>
                  <select value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white">
                    <option value="">선택</option>
                    <option value="M">남성</option>
                    <option value="F">여성</option>
                  </select>
                </div>
                <Field label="출생연도" name="birthYear" type="number" placeholder="1990" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">세그먼트</label>
                  <select value={form.segment} onChange={e => setForm(p => ({ ...p, segment: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white">
                    {SEGMENTS.filter(Boolean).map(s => (
                      <option key={s} value={s}>{SEGMENT_LABEL[s] ?? s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">피부 타입</label>
                  <select value={form.skinType} onChange={e => setForm(p => ({ ...p, skinType: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white">
                    <option value="">선택</option>
                    <option value="dry">건성</option>
                    <option value="oily">지성</option>
                    <option value="combination">복합성</option>
                    <option value="sensitive">민감성</option>
                    <option value="normal">중성</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-gray-200">
              <button onClick={handleCreate} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
                {saving && <Loader2 size={13} className="animate-spin" />} 등록
              </button>
              <button onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
