'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import Link from 'next/link'

interface Campaign {
  id: string; name: string; type: string; status: string
  createdBy: { name: string }; createdAt: string; _count: { sends: number }
}

const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SCHEDULED: 'bg-blue-100 text-blue-700',
  SENDING: 'bg-yellow-100 text-yellow-700',
  DONE: 'bg-green-100 text-green-700',
  PAUSED: 'bg-orange-100 text-orange-700'
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: '초안', SCHEDULED: '예약', SENDING: '발송중', DONE: '완료', PAUSED: '일시정지'
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])

  useEffect(() => {
    fetch('/api/campaigns').then(r => r.json()).then(d => setCampaigns(d.data ?? []))
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">캠페인</h1>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-700">
          <Plus size={14} />
          캠페인 만들기
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">캠페인명</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">유형</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">상태</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">발송 수</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">생성자</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">생성일</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map(c => (
              <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link href={`/campaigns/${c.id}`} className="text-gray-900 font-medium hover:text-blue-600">{c.name}</Link>
                </td>
                <td className="px-4 py-3 text-gray-500">{c.type}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLOR[c.status] ?? ''}`}>
                    {STATUS_LABEL[c.status] ?? c.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-gray-700">{c._count.sends.toLocaleString()}</td>
                <td className="px-4 py-3 text-gray-500">{c.createdBy?.name}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(c.createdAt).toLocaleDateString('ko-KR')}</td>
              </tr>
            ))}
            {campaigns.length === 0 && (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400 text-sm">캠페인이 없습니다</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
