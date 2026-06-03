'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

interface VocReview {
  id: string; rating: number; content: string; channel: string; sentiment: string | null
  tags: string[]; isAlert: boolean; ingestedAt: string
  skuMaster: { name: string }
}

const SENTIMENT_COLOR: Record<string, string> = {
  positive: 'bg-green-100 text-green-700',
  neutral: 'bg-gray-100 text-gray-600',
  negative: 'bg-red-100 text-red-700'
}

export default function VocPage() {
  const [reviews, setReviews] = useState<VocReview[]>([])
  const [alertOnly, setAlertOnly] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams({ limit: '30' })
    if (alertOnly) params.set('alertOnly', 'true')
    fetch(`/api/voc?${params}`).then(r => r.json()).then(d => setReviews(d.data ?? []))
  }, [alertOnly])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">VOC·리뷰</h1>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={alertOnly}
            onChange={e => setAlertOnly(e.target.checked)}
            className="rounded border-gray-300"
          />
          이상 징후만 보기
        </label>
      </div>

      <div className="space-y-3">
        {reviews.map(review => (
          <div key={review.id} className={`bg-white rounded-xl border p-4 ${review.isAlert ? 'border-red-200' : 'border-gray-200'}`}>
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 text-sm">{review.skuMaster?.name}</span>
                {review.isAlert && (
                  <span className="flex items-center gap-1 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                    <AlertTriangle size={10} />
                    이상 징후
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {review.sentiment && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${SENTIMENT_COLOR[review.sentiment]}`}>{review.sentiment}</span>
                )}
                <span className="text-xs text-gray-400">{review.channel}</span>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className={i < review.rating ? 'text-yellow-400' : 'text-gray-200'}>★</span>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{review.content}</p>
            {review.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {(review.tags as string[]).map((tag, i) => (
                  <span key={i} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{tag}</span>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-400 mt-2">{new Date(review.ingestedAt).toLocaleDateString('ko-KR')}</p>
          </div>
        ))}
        {reviews.length === 0 && (
          <div className="flex items-center justify-center h-32 text-gray-400 text-sm bg-white rounded-xl border border-gray-200">
            리뷰가 없습니다
          </div>
        )}
      </div>
    </div>
  )
}
