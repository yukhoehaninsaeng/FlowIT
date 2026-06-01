'use client'

import { useState, useEffect } from 'react'
import { formatKRW } from '@/lib/utils'
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Deal {
  id: string; title: string; amount: string; probability: number; stage: string
  account: { name: string }; expectedClose: string | null
}

const STAGES = ['LEAD', 'MEETING', 'QUOTE', 'REVIEW', 'CLOSED']
const STAGE_LABEL: Record<string, string> = {
  LEAD: '잠재', MEETING: '미팅', QUOTE: '견적', REVIEW: '검토', CLOSED: '성사'
}
const STAGE_COLOR: Record<string, string> = {
  LEAD: 'bg-gray-100', MEETING: 'bg-blue-50', QUOTE: 'bg-yellow-50',
  REVIEW: 'bg-orange-50', CLOSED: 'bg-green-50'
}

function DealCard({ deal }: { deal: Deal }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: deal.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white rounded-lg border border-gray-200 p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow"
    >
      <p className="text-xs font-medium text-gray-500 mb-1">{deal.account?.name}</p>
      <p className="text-sm font-semibold text-gray-900 mb-2">{deal.title}</p>
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-blue-700">{formatKRW(Number(deal.amount))}</span>
        <span className="text-xs text-gray-400">{deal.probability}%</span>
      </div>
      {deal.expectedClose && (
        <p className="text-xs text-gray-400 mt-1">{new Date(deal.expectedClose).toLocaleDateString('ko-KR')} 마감</p>
      )}
    </div>
  )
}

export default function SalesPage() {
  const [deals, setDeals] = useState<Deal[]>([])

  useEffect(() => {
    fetch('/api/deals').then(r => r.json()).then(d => setDeals(d.data ?? []))
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

  const totalPipeline = deals.filter(d => d.stage !== 'CLOSED').reduce((s, d) => s + Number(d.amount) * d.probability / 100, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">영업 파이프라인</h1>
        <span className="text-sm text-gray-500">예상 매출 <strong className="text-gray-900">{formatKRW(totalPipeline)}</strong></span>
      </div>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map(stage => (
            <div key={stage} className={`flex-none w-64 rounded-xl ${STAGE_COLOR[stage]} p-3`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-700">{STAGE_LABEL[stage]}</span>
                <span className="text-xs text-gray-400">{byStage(stage).length}건</span>
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
    </div>
  )
}
