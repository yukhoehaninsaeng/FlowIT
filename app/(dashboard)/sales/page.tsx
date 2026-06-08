'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { formatKRW } from '@/lib/utils'
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus, X, Loader2, ChevronRight, FileText, CreditCard,
  MessageSquare, CheckCircle, ExternalLink
} from 'lucide-react'
import Link from 'next/link'

interface Deal {
  id: string; title: string; amount: string; probability: number; stage: string
  account: { id: string; name: string }; expectedClose: string | null; notes: string | null
}
interface Account { id: string; name: string }
interface Receivable {
  id: string; invoiceNo: string; amount: string; paidAmount: string
  status: string; dueDate: string
}

const STAGES = ['LEAD', 'MEETING', 'QUOTE', 'REVIEW', 'CLOSED']
const STAGE_LABEL: Record<string, string> = {
  LEAD: '잠재', MEETING: '미팅', QUOTE: '견적', REVIEW: '검토', CLOSED: '성사'
}
const STAGE_COLOR: Record<string, string> = {
  LEAD: 'bg-gray-100', MEETING: 'bg-blue-50', QUOTE: 'bg-yellow-50',
  REVIEW: 'bg-orange-50', CLOSED: 'bg-green-50'
}
const RECEIVABLE_STATUS: Record<string, { label: string; color: string }> = {
  unpaid:  { label: '미수금 미납', color: 'bg-red-100 text-red-700' },
  partial: { label: '미수금 일부납', color: 'bg-yellow-100 text-yellow-700' },
  paid:    { label: '완납', color: 'bg-green-100 text-green-700' },
  overdue: { label: '연체', color: 'bg-red-200 text-red-800' },
}

const DEFAULT_FORM = {
  accountId: '', title: '', stage: 'LEAD', amount: '',
  probability: '50', expectedClose: '', notes: ''
}

function DealCard({ deal, onSelect }: { deal: Deal; onSelect: (d: Deal) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: deal.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div
      ref={setNodeRef} style={style} {...attributes} {...listeners}
      className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow group"
    >
      <div className="flex items-start justify-between gap-1">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 mb-1 truncate">{deal.account?.name}</p>
          <p className="text-sm font-semibold text-gray-900 mb-2 leading-snug">{deal.title}</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onSelect(deal) }}
          className="flex-shrink-0 p-1 text-gray-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity rounded cursor-pointer"
        >
          <ChevronRight size={14} />
        </button>
      </div>
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

function DealDetailPanel({
  deal,
  onClose,
  onStageChange,
}: {
  deal: Deal
  onClose: () => void
  onStageChange: (id: string, stage: string) => void
}) {
  const [receivable, setReceivable] = useState<Receivable | null>(null)
  const [loadingRec, setLoadingRec] = useState(false)
  const [changingStage, setChangingStage] = useState(false)

  useEffect(() => {
    setLoadingRec(true)
    fetch(`/api/receivables?dealId=${deal.id}`)
      .then(r => r.json())
      .then(d => setReceivable(d.receivables?.[0] ?? null))
      .finally(() => setLoadingRec(false))
  }, [deal.id])

  async function handleStageChange(newStage: string) {
    if (newStage === deal.stage) return
    setChangingStage(true)
    await fetch(`/api/deals/${deal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: newStage })
    })
    onStageChange(deal.id, newStage)
    setChangingStage(false)
    // 미수금 자동생성됐을 수 있으니 리로드
    if (newStage === 'CLOSED') {
      setLoadingRec(true)
      setTimeout(() => {
        fetch(`/api/receivables?dealId=${deal.id}`)
          .then(r => r.json())
          .then(d => setReceivable(d.receivables?.[0] ?? null))
          .finally(() => setLoadingRec(false))
      }, 500)
    }
  }

  const recStatus = receivable ? RECEIVABLE_STATUS[receivable.status] : null

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* 배경 오버레이 */}
      <div className="flex-1 bg-black/30" onClick={onClose} />

      {/* 사이드 패널 */}
      <div className="w-96 bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-200">
          <div className="flex-1 min-w-0 pr-3">
            <p className="text-xs text-gray-400 mb-0.5">{deal.account.name}</p>
            <h2 className="text-sm font-semibold text-gray-900 leading-snug">{deal.title}</h2>
          </div>
          <button onClick={onClose} className="flex-shrink-0 text-gray-400 hover:text-gray-600 mt-0.5">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* 딜 정보 */}
          <div className="px-5 py-4 space-y-3 border-b border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">금액</span>
              <span className="font-bold text-blue-700">{formatKRW(Number(deal.amount))}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">수주 확률</span>
              <span className="font-medium text-gray-800">{deal.probability}%</span>
            </div>
            {deal.expectedClose && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">마감일</span>
                <span className="font-medium text-gray-800">{new Date(deal.expectedClose).toLocaleDateString('ko-KR')}</span>
              </div>
            )}
            {deal.notes && (
              <p className="text-xs text-gray-500 bg-gray-50 rounded-md p-2 leading-relaxed">{deal.notes}</p>
            )}
          </div>

          {/* 단계 변경 */}
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-2">단계 변경</p>
            <div className="flex flex-wrap gap-1.5">
              {STAGES.map(s => (
                <button
                  key={s}
                  onClick={() => handleStageChange(s)}
                  disabled={changingStage}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors disabled:opacity-50 ${
                    deal.stage === s
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600'
                  }`}
                >
                  {STAGE_LABEL[s]}
                  {s === 'CLOSED' && ' 🎉'}
                </button>
              ))}
            </div>
            {deal.stage === 'CLOSED' && (
              <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                <CheckCircle size={12} /> 미수금이 자동 생성되었습니다
              </p>
            )}
          </div>

          {/* 연관 미수금 */}
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                <CreditCard size={12} /> 연관 미수금
              </p>
              <Link
                href={`/receivables?accountId=${deal.account.id}`}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
              >
                전체 보기 <ExternalLink size={10} />
              </Link>
            </div>
            {loadingRec ? (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <Loader2 size={12} className="animate-spin" /> 로딩 중...
              </div>
            ) : receivable ? (
              <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-mono">{receivable.invoiceNo}</span>
                  {recStatus && (
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${recStatus.color}`}>
                      {recStatus.label}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">청구액</span>
                  <span className="font-medium">{formatKRW(Number(receivable.amount))}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">수납액</span>
                  <span className="font-medium text-green-600">{formatKRW(Number(receivable.paidAmount))}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">만기일</span>
                  <span className="font-medium">{new Date(receivable.dueDate).toLocaleDateString('ko-KR')}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400">
                {deal.stage === 'CLOSED' ? '미수금 정보를 불러오는 중...' : '딜이 성사되면 미수금이 자동 생성됩니다'}
              </p>
            )}
          </div>

          {/* 연관 모듈 바로가기 */}
          <div className="px-5 py-4 space-y-2">
            <p className="text-xs font-medium text-gray-500 mb-3">연관 메뉴</p>
            <Link
              href={`/quotes?accountId=${deal.account.id}`}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-gray-50 hover:bg-blue-50 transition-colors group"
            >
              <div className="flex items-center gap-2.5 text-sm text-gray-700 group-hover:text-blue-700">
                <FileText size={14} /> 견적서 관리
              </div>
              <ChevronRight size={14} className="text-gray-400 group-hover:text-blue-500" />
            </Link>
            <Link
              href={`/contact-logs?accountId=${deal.account.id}`}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-gray-50 hover:bg-blue-50 transition-colors group"
            >
              <div className="flex items-center gap-2.5 text-sm text-gray-700 group-hover:text-blue-700">
                <MessageSquare size={14} /> 상담 이력
              </div>
              <ChevronRight size={14} className="text-gray-400 group-hover:text-blue-500" />
            </Link>
            <Link
              href={`/receivables?accountId=${deal.account.id}`}
              className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-gray-50 hover:bg-blue-50 transition-colors group"
            >
              <div className="flex items-center gap-2.5 text-sm text-gray-700 group-hover:text-blue-700">
                <CreditCard size={14} /> 미수금 관리
              </div>
              <ChevronRight size={14} className="text-gray-400 group-hover:text-blue-500" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function SalesContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const accountIdFilter = searchParams.get('accountId')

  const [deals, setDeals] = useState<Deal[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    fetch('/api/deals').then(r => r.json()).then(d => setDeals(d.data ?? []))
    fetch('/api/accounts').then(r => r.json()).then(d => setAccounts(d.accounts ?? []))
  }, [])

  const displayDeals = accountIdFilter
    ? deals.filter(d => d.account?.id === accountIdFilter)
    : deals

  const byStage = (stage: string) => displayDeals.filter(d => d.stage === stage)

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const deal = deals.find(d => d.id === active.id)
    const targetStage = over.id as string
    if (!deal || !STAGES.includes(targetStage) || deal.stage === targetStage) return

    setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, stage: targetStage } : d))
    await fetch(`/api/deals/${deal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: targetStage })
    })

    if (targetStage === 'CLOSED') {
      setToast('🎉 딜이 성사되어 미수금이 자동 생성되었습니다')
      setTimeout(() => setToast(''), 4000)
    }
  }

  function handleStageChangeFromPanel(id: string, newStage: string) {
    setDeals(prev => prev.map(d => d.id === id ? { ...d, stage: newStage } : d))
    if (selectedDeal?.id === id) {
      setSelectedDeal(prev => prev ? { ...prev, stage: newStage } : null)
    }
    if (newStage === 'CLOSED') {
      setToast('🎉 딜이 성사되어 미수금이 자동 생성되었습니다')
      setTimeout(() => setToast(''), 4000)
    }
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

  const filterAccount = accounts.find(a => a.id === accountIdFilter)

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

      {/* 거래처 필터 배너 */}
      {accountIdFilter && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          <span>거래처 필터: <strong>{filterAccount?.name ?? accountIdFilter}</strong></span>
          <button
            onClick={() => router.push('/sales')}
            className="ml-auto text-blue-500 hover:text-blue-700"
          >
            <X size={14} />
          </button>
        </div>
      )}

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
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              <SortableContext items={byStage(stage).map(d => d.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {byStage(stage).map(deal => (
                    <DealCard key={deal.id} deal={deal} onSelect={setSelectedDeal} />
                  ))}
                </div>
              </SortableContext>
            </div>
          ))}
        </div>
      </DndContext>

      {/* 딜 상세 사이드 패널 */}
      {selectedDeal && (
        <DealDetailPanel
          deal={selectedDeal}
          onClose={() => setSelectedDeal(null)}
          onStageChange={handleStageChangeFromPanel}
        />
      )}

      {/* 토스트 알림 */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-gray-900 text-white text-sm rounded-xl shadow-lg flex items-center gap-2">
          <CheckCircle size={15} className="text-green-400" />
          {toast}
        </div>
      )}

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

export default function SalesPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-20 text-sm text-gray-400"><Loader2 size={20} className="animate-spin" /></div>}>
      <SalesContent />
    </Suspense>
  )
}
