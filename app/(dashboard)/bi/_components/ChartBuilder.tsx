'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { ChartRenderer, type DataPoint } from './ChartRenderer'
import type { ChartConfig } from './chartTypes'
import {
  DIMENSIONS, METRICS_BY_DIM, CHART_TYPES, PERIODS,
} from './chartTypes'

interface Props {
  onAddToDashboard: (config: ChartConfig) => void
}

const CHART_TYPE_ICONS: Record<string, string> = {
  bar:         '▬▬',
  bar_h:       '▬▬',
  line:        '╱╲',
  area:        '◣◢',
  pie:         '◔',
  donut:       '◎',
  bar_grouped: '▬▬',
  bar_stacked: '▪▪',
  line_multi:  '≈≈',
  combo:       '▬╱',
}

export function ChartBuilder({ onAddToDashboard }: Props) {
  const [dimension, setDimension] = useState('month')
  const [metric, setMetric]       = useState('revenue')
  const [metric2, setMetric2]     = useState('')
  const [chartType, setChartType] = useState('line')
  const [period, setPeriod]       = useState('monthly')
  const [title, setTitle]         = useState('')
  const [previewData, setPreviewData] = useState<DataPoint[]>([])
  const [previewing, setPreviewing]   = useState(false)
  const [hasPreview, setHasPreview]   = useState(false)

  const currentType  = CHART_TYPES.find(t => t.value === chartType)
  const isMulti      = currentType?.multiSeries ?? false
  const currentMetrics = METRICS_BY_DIM[dimension] ?? []

  // Reset metric when dimension changes
  useEffect(() => {
    const opts = METRICS_BY_DIM[dimension] ?? []
    if (!opts.find(m => m.value === metric)) setMetric(opts[0]?.value ?? 'revenue')
    setMetric2('')
    setHasPreview(false)
  }, [dimension])

  // Reset metric2 when chartType switches from multi to single
  useEffect(() => {
    if (!isMulti) setMetric2('')
    setHasPreview(false)
  }, [chartType, isMulti])

  const fetchPreview = useCallback(async () => {
    setPreviewing(true); setHasPreview(false)
    try {
      const m2 = isMulti && metric2 ? `&metric2=${metric2}` : ''
      const r = await fetch(`/api/bi?type=flex&dimension=${dimension}&metric=${metric}${m2}&period=${period}`)
      const d = await r.json()
      setPreviewData(d.data ?? [])
      setHasPreview(true)
    } finally { setPreviewing(false) }
  }, [dimension, metric, metric2, chartType, period, isMulti])

  function handleAdd() {
    if (!hasPreview || previewData.length === 0) return
    const dimInfo    = DIMENSIONS.find(d => d.value === dimension)!
    const metricInfo = METRICS_BY_DIM[dimension]?.find(m => m.value === metric)!
    const m2Info     = metric2 ? METRICS_BY_DIM[dimension]?.find(m => m.value === metric2) : undefined

    const config: ChartConfig = {
      id: Date.now().toString(),
      title,
      dimension, metric, metric2: metric2 || undefined,
      chartType, period,
      colSpan: 6, height: 'md',
      dimLabel:     dimInfo?.label    ?? dimension,
      metricLabel:  metricInfo?.label ?? metric,
      metric2Label: m2Info?.label,
      isCurrency:   metricInfo?.isCurrency  ?? false,
      isCurrency2:  m2Info?.isCurrency,
    }
    onAddToDashboard(config)
    setTitle(''); setHasPreview(false)
  }

  const metricInfo  = METRICS_BY_DIM[dimension]?.find(m => m.value === metric)
  const metric2Info = METRICS_BY_DIM[dimension]?.find(m => m.value === metric2)

  return (
    <div className="space-y-5">
      {/* ── Step 1: Data ──────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">1 · 데이터 설정</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">X축 (기준)</label>
            <select value={dimension} onChange={e => setDimension(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {DIMENSIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Y축 (측정값)</label>
            <select value={metric} onChange={e => { setMetric(e.target.value); setHasPreview(false) }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {currentMetrics.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              2번째 Y축 {isMulti ? <span className="text-blue-500">*</span> : <span className="text-gray-300">(단일 계열 미사용)</span>}
            </label>
            <select value={metric2} onChange={e => { setMetric2(e.target.value); setHasPreview(false) }}
              disabled={!isMulti || currentMetrics.length < 2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">선택 안함</option>
              {currentMetrics.filter(m => m.value !== metric).map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">기간</label>
            <select value={period} onChange={e => { setPeriod(e.target.value); setHasPreview(false) }}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── Step 2: Chart Type ────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">2 · 차트 유형</p>
        <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
          {CHART_TYPES.map(ct => (
            <button key={ct.value} onClick={() => setChartType(ct.value)}
              title={ct.desc}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-center transition-all ${
                chartType === ct.value
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : ct.multiSeries
                  ? 'border-dashed border-gray-300 text-gray-600 hover:border-blue-400 hover:bg-blue-50'
                  : 'border-gray-200 text-gray-600 hover:border-blue-400 hover:bg-blue-50'
              }`}>
              <span className="text-base leading-none">{CHART_TYPE_ICONS[ct.value]}</span>
              <span className="text-xs font-medium leading-tight">{ct.label}</span>
              {ct.multiSeries && (
                <span className={`text-[9px] leading-none ${chartType === ct.value ? 'text-blue-200' : 'text-blue-400'}`}>2계열</span>
              )}
            </button>
          ))}
        </div>
        {isMulti && (
          <p className="mt-2 text-xs text-blue-600 bg-blue-50 rounded px-3 py-1.5">
            2계열 차트입니다. 위에서 2번째 Y축 측정값을 선택하세요.
          </p>
        )}
      </div>

      {/* ── Step 3: Preview ──────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">3 · 미리보기 & 저장</p>
          <div className="flex items-center gap-2">
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="차트 제목 (선택)"
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={fetchPreview} disabled={previewing}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-800 text-white text-sm rounded-md hover:bg-gray-700 disabled:opacity-50">
              {previewing && <Loader2 size={12} className="animate-spin" />}
              미리보기
            </button>
            <button onClick={handleAdd}
              disabled={!hasPreview || previewData.length === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-40">
              <Plus size={13} /> 대시보드에 추가
            </button>
          </div>
        </div>

        {hasPreview ? (
          previewData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">데이터가 없습니다</p>
          ) : (
            <ChartRenderer
              data={previewData}
              chartType={chartType}
              isCurrency={metricInfo?.isCurrency ?? false}
              isCurrency2={metric2Info?.isCurrency ?? false}
              label1={metricInfo?.label ?? metric}
              label2={metric2Info?.label ?? metric2}
              height={300}
            />
          )
        ) : (
          <div className="flex items-center justify-center py-16 text-sm text-gray-400">
            미리보기 버튼을 눌러 차트를 확인하세요
          </div>
        )}
      </div>
    </div>
  )
}
