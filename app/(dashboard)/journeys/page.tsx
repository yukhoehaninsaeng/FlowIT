'use client'

import { useState, useEffect } from 'react'
import { Plus, GitBranch } from 'lucide-react'

interface Journey {
  id: string; name: string; triggerType: string; isActive: boolean; createdAt: string
  createdBy: { name: string }; _count: { enrollments: number }
}

export default function JourneysPage() {
  const [journeys, setJourneys] = useState<Journey[]>([])

  useEffect(() => {
    fetch('/api/journeys').then(r => r.json()).then(d => setJourneys(d.data ?? []))
  }, [])

  const toggleActive = async (id: string, isActive: boolean) => {
    await fetch(`/api/journeys/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive })
    })
    setJourneys(prev => prev.map(j => j.id === id ? { ...j, isActive: !isActive } : j))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">여정 자동화</h1>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-700">
          <Plus size={14} />
          여정 만들기
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {journeys.map(journey => (
          <div key={journey.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <GitBranch size={16} className="text-blue-600" />
                <p className="font-semibold text-gray-900">{journey.name}</p>
              </div>
              <button
                onClick={() => toggleActive(journey.id, journey.isActive)}
                className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${journey.isActive ? 'bg-blue-600' : 'bg-gray-200'}`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform mt-0.5 ${journey.isActive ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>트리거: {journey.triggerType}</span>
              <span>등록: {journey._count.enrollments}명</span>
            </div>
            <p className="text-xs text-gray-400 mt-2">생성자: {journey.createdBy?.name} · {new Date(journey.createdAt).toLocaleDateString('ko-KR')}</p>
          </div>
        ))}
        {journeys.length === 0 && (
          <div className="col-span-2 flex items-center justify-center h-32 text-gray-400 text-sm bg-white rounded-xl border border-gray-200">
            여정이 없습니다
          </div>
        )}
      </div>
    </div>
  )
}
