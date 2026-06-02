'use client'

import { useEffect, useState } from 'react'
import { BrainCircuit, TrendingUp, TrendingDown, Minus, RefreshCw, Loader2 } from 'lucide-react'

interface Forecast {
  id: string
  skuCode: string
  skuName: string
  forecastDate: string
  forecastQty: number
  actualQty: number | null
  confidence: string | null
  factors: Record<string, unknown> | null
}

export default function ForecastPage() {
  const [forecasts, setForecasts] = useState<Forecast[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/forecast')
      .then(r => r.ok ? r.json() : { forecasts: [] })
      .then(d => setForecasts(d.forecasts ?? []))
      .finally(() => setLoading(false))
  }, [])

  async function regenerate() {
    setGenerating(true)
    try {
      await fetch('/api/forecast/generate', { method: 'POST' })
      const r = await fetch('/api/forecast')
      const d = await r.json()
      setForecasts(d.forecasts ?? [])
    } finally {
      setGenerating(false)
    }
  }

  const filtered = forecasts.filter(f =>
    f.skuCode.toLowerCase().includes(search.toLowerCase()) ||
    f.skuName.toLowerCase().includes(search.toLowerCase())
  )

  function accuracyIcon(forecast: number, actual: number | null) {
    if (!actual) return <Minus size={14} className="text-gray-400" />
    const ratio = actual / forecast
    if (ratio > 1.1) return <TrendingUp size={14} className="text-green-500" />
    if (ratio < 0.9) return <TrendingDown size={14} className="text-red-500" />
    return <Minus size={14} className="text-blue-500" />
  }

  return (
    <>

          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 mb-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <BrainCircuit size={20} />
                  <span className="font-semibold">AI 수요예측 엔진</span>
                </div>
                <p className="text-sm text-blue-200">과거 판매 데이터, 계절성, 프로모션 효과를 학습하여 SKU별 수요를 예측합니다.</p>
              </div>
              <button
                onClick={regenerate}
                disabled={generating}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
              >
                {generating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                예측 재실행
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="bg-white/10 rounded-lg p-3">
                <div className="text-xs text-blue-200">예측 SKU 수</div>
                <div className="text-2xl font-bold">{forecasts.length}</div>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <div className="text-xs text-blue-200">평균 신뢰도</div>
                <div className="text-2xl font-bold">
                  {forecasts.length > 0
                    ? `${Math.round(forecasts.reduce((s, f) => s + Number(f.confidence ?? 0), 0) / forecasts.length * 100)}%`
                    : '—'}
                </div>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <div className="text-xs text-blue-200">총 예측 수량</div>
                <div className="text-2xl font-bold">
                  {forecasts.reduce((s, f) => s + f.forecastQty, 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="mb-4">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="SKU 코드, 상품명 검색..."
              className="w-full max-w-sm px-4 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">SKU</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">예측 기간</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">예측 수량</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">실적 수량</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">정확도</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">신뢰도</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">주요 요인</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={7} className="py-12 text-center text-gray-400">로딩 중...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center">
                      <BrainCircuit size={32} className="mx-auto mb-2 text-gray-300" />
                      <p className="text-sm text-gray-400 mb-3">예측 데이터가 없습니다</p>
                      <button
                        onClick={regenerate}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        예측 생성하기
                      </button>
                    </td>
                  </tr>
                ) : filtered.map(f => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs text-gray-500">{f.skuCode}</div>
                      <div className="text-gray-700 font-medium">{f.skuName}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {new Date(f.forecastDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {f.forecastQty.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600">
                      {f.actualQty?.toLocaleString() ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center">
                        {accuracyIcon(f.forecastQty, f.actualQty)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {f.confidence ? (
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${Math.round(Number(f.confidence) * 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600">{Math.round(Number(f.confidence) * 100)}%</span>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {f.factors ? Object.keys(f.factors).join(', ') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
    </>
  )
}
