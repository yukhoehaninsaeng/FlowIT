'use client'

import { useState, useEffect } from 'react'
import { formatKRW } from '@/lib/utils'
import { Plus, Star } from 'lucide-react'

interface Influencer {
  id: string; name: string; channel: string; handle: string; followerCnt: number
  avgEngagement: string; avgRoi: string; skinTypeFocus: string | null; _count: { campaigns: number }
}

export default function InfluencersPage() {
  const [influencers, setInfluencers] = useState<Influencer[]>([])

  useEffect(() => {
    fetch('/api/influencers').then(r => r.json()).then(d => setInfluencers(d.data ?? []))
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">인플루언서</h1>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-700">
          <Plus size={14} />
          추가
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">이름</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">채널</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">핸들</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">팔로워</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">참여율</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">평균 ROI</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">캠페인 수</th>
            </tr>
          </thead>
          <tbody>
            {influencers.map(inf => (
              <tr key={inf.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{inf.name}</td>
                <td className="px-4 py-3 text-gray-500">{inf.channel}</td>
                <td className="px-4 py-3 text-gray-500">@{inf.handle}</td>
                <td className="px-4 py-3 text-right text-gray-700">{inf.followerCnt.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-gray-700">{Number(inf.avgEngagement).toFixed(2)}%</td>
                <td className="px-4 py-3 text-right">
                  <span className={Number(inf.avgRoi) >= 1 ? 'text-green-600 font-medium' : 'text-red-500'}>
                    {Number(inf.avgRoi).toFixed(2)}x
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-gray-500">{inf._count.campaigns}</td>
              </tr>
            ))}
            {influencers.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400 text-sm">인플루언서가 없습니다</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
