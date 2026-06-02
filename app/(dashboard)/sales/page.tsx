'use client'

import { useState, useEffect } from 'react'
import { formatKRW } from '@/lib/utils'
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, X, Loader2 } from 'lucide-react'

interface Deal {
  id: string; title: string; amount: string; probability: number; stage: string
  account: { id: string; name: string }; expectedClose: string | null; notes: string | null
}

interface Account { id: string; name: string }

const STAGES = ['LEAD', 'MEETING', 'QUOTE', 'REVIEW', 'CLOSED']
const STAGE_LABEL: Record<string, string> = {
  LEAD: '잠재', MEETING: '미팅', QUOTE: '견적', REVIEW: '검토', CLOSED: '성사'
}
const STAGE_COLOR: Record<string, string> = {
  LEAD: 'bg-gray-100', MEETING: 'bg-blue-50', QUOTE: 'bg-yellow-50',
  REVIEW: 'bg-orange-50', CLOSED: 'bg-green-50'
}

const DEFAULT_FORM = {
  accountId: '', title: '', stage: 'LEAD', amount: '',
  probability: '50', expectedClose: '', notes: ''
}

function DealCard({ deal }: { deal: Deal }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: deal.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div
      ref={setNodeRef} style={style} {...attributes} {...listeners}
      className="bg-white rounded-lg border border-gray-200 p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow"
    >
      <p className="text-xs font-medium text-gray-500 mb-1">{deal.account?.name}</p>
      <p className="text-sm font-semibold text-gray-900 mb-2">{deal.title}</p>
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-blue-700">{formatKRW(Number(deal.amount))}</span>
        <span className="text-xs text-gray-400">{deal.probability}%</span>
      </div>
      {deal.expectedClose && (
        <p className="text-xs text-gray-400 mt-1">
          {new Date(deal.expectedClose).toLocaleDateString('ko-KR')} 마감
        </p>
      )}
    </div>
  )
}

export default function SalesPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/deals').then(r => r.json()).then(d => setDeals(d.data ?? []))
    fetch('/api/accounts').then(r => r.json()).then(d => setAccounts(d.accounts ?? []))
  }, [])

  const byStage = (stage: string) => deals.filter(d => d.stage === stage)

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const deal = deals.find(d => d.id === active.id)
    const targetStage = over.id as string
    if (!deal || !STAGES.includes(targetStage)) return
    setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, stage: targetStage } : d))
    await fetch(`/api/deals/${deal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: targetStage })
    })
  }

  async function handleCreate() {
    if (!form.accountId) { setError('거래처를 선택하세요.'); return }
    if (!form.title.trim()) { setError('딜 제목을 입력하세요.'); return }
    if (!form.amount || isNaN(Number(form.amount))) { setError('금액을 입력하세요.'); return }
    setSaving(true); setError('')
    try {
      const r = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: form.accountId,
          title: form.title,
          stage: form.stage,
          amount: Number(form.amount),
          probability: Number(form.probability),
          expectedClose: form.expectedClose ? new Date(form.expectedClose).toISOString() : undefined,
          notes: form.notes || undefined,
        }),
      })
      if (!r.ok) { const d = await r.json(); setError(d.error ?? '등록 실패'); return }
      const { deal: newDeal } = await r.json()
      setDeals(prev => [newDeal, ...prev])
      setShowModal(false)
      setForm(DEFAULT_FORM)
    } finally { setSaving(false) }
  }

  const totalPipeline = deals
    .filter(d => d.stage !== 'CLOSED')
    .reduce((s, d) => s + Number(d.amount) * d.probability / 100, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">영업 파이프라인</h1>
          <p className="text-sm text-gray-500 mt-0.5">예상 매출 <strong className="text-gray-900">{formatKRW(totalPipeline)}</strong></p>
        </div>
        <button
          onClick={() => { setShowModal(true); setError('') }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
        >
          <Plus size={14} /> 딜 등록
        </button>
      </div>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map(stage => (
            <div key={stage} className={`flex-none w-64 rounded-xl ${STAGE_COLOR[stage]} p-3`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-700">{STAGE_LABEL[stage]}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{byStage(stage).length}건</span>
                  <button
                    onClick={() => { setForm(p => ({ ...p, stage })); setShowModal(true); setError('') }}
                    className="text-gray-400 hover:text-blue-600 transition-colors"
                    title={`${STAGE_LABEL[stage]} 단계로 딜 등록`}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              <SortableContext items={byStage(stage).map(d => d.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {byStage(stage).map(deal => <DealCard key={deal.id} deal={deal} />)}
                </div>
              </SortableContext>
            </div>
          ))}
        </div>
      </DndContext>

      {/* 딜 등록 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900">딜 등록</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-3">
              {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>}

              <div>
                <label className="block text-xs text-gray-500 mb-1">거래처 *</label>
                <select value={form.accountId} onChange={e => setForm(p => ({ ...p, accountId: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">거래처 선택</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                {accounts.length === 0 && (
                  <p className="text-xs text-orange-600 mt-1">
                    거래처가 없습니다.{' '}
                    <a href="/accounts" className="underline">거래처를 먼저 등록하세요.</a>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">딜 제목 *</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="예: 2024년 하반기 납품 계약"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">단계</label>
                  <select value={form.stage} onChange={e => setForm(p => ({ ...p, stage: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {STAGES.map(s => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">수주 확률 (%)</label>
                  <input type="number" min={0} max={100}
                    value={form.probability} onChange={e => setForm(p => ({ ...p, probability: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">금액 (원) *</label>
                <input type="number" min={0}
                  value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                  placeholder="10000000"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {form.amount && !isNaN(Number(form.amount)) && (
                  <p className="text-xs text-gray-400 mt-1">{formatKRW(Number(form.amount))}</p>
                )}
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">예상 마감일</label>
                <input type="date" value={form.expectedClose} onChange={e => setForm(p => ({ ...p, expectedClose: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-xs text-gray-500 mb-1">메모</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  rows={2} placeholder="특이사항, 고객 요구사항 등"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-gray-200">
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
