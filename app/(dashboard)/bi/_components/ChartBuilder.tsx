'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Loader2, Zap, ChevronDown, ChevronUp } from 'lucide-react'
import { ChartRenderer, type DataPoint } from './ChartRenderer'
import type { ChartConfig } from './chartTypes'
import {
  DIMENSIONS, DIMENSION_CATEGORIES, METRICS_BY_DIM, CHART_TYPES,
  PERIODS, QUICK_TEMPLATES, recommendChartType, N_SERIES_DIMS, type DimensionCategory,
} from './chartTypes'

interface Props {
  onAddToDashboard: (config: ChartConfig) => void
}

const CHART_TYPE_ICONS: Record<string, string> = {
  bar: '▌▌', bar_h: '━━', line: '╱╲', area: '◣◢', pie: '◔', donut: '◎',
  funnel: '▽▼', treemap: '▪◼',
  bar_grouped: '▌▐', bar_stacked: '▬▬', line_multi: '≈≈', scatter: '∴∵', combo: '▌╱',
}

export function ChartBuilder({ onAddToDashboard }: Props) {
  const [dimCategory, setDimCategory] = useState<DimensionCategory | 'all'>('all')
  const [dimension,  setDimension]  = useState('month')
  const [metric,     setMetric]     = useState('revenue')
  const [metric2,    setMetric2]    = useState('')
  const [chartType,  setChartType]  = useState('area')
  const [period,     setPeriod]     = useState(`year_${new Date().getFullYear() - 1}`)
  const [limit,      setLimit]      = useState(10)
  const [title,      setTitle]      = useState('')

  const [previewData,   setPreviewData]   = useState<DataPoint[]>([])
  const [previewSeries, setPreviewSeries] = useState<string[]>([])
  const [previewing,    setPreviewing]    = useState(false)
  const [hasPreview,    setHasPreview]    = useState(false)
  const [showBuilder,   setShowBuilder]   = useState(false)

  const currentDimInfo  = DIMENSIONS.find(d => d.value === dimension)
  const currentType     = CHART_TYPES.find(t => t.value === chartType)
  const isMulti         = currentType?.multiSeries ?? false
  const currentMetrics  = METRICS_BY_DIM[dimension] ?? []
  const needsLimit      = ['sku_top'].includes(dimension)

  // AI 추천: 차원 변경 시 최적 차트 자동 선택 (stale closure 방지: effect 내부에서 직접 계산)
  useEffect(() => {
    const opts = METRICS_BY_DIM[dimension] ?? []
    if (!opts.find(m => m.value === metric)) setMetric(opts[0]?.value ?? 'revenue')
    setMetric2('')
    setHasPreview(false)
    setChartType(recommendChartType(dimension))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimension])

  useEffect(() => {
    if (!isMulti) setMetric2('')
    setHasPreview(false)
  }, [chartType, isMulti])

  const fetchPreview = useCallback(async () => {
    setPreviewing(true); setHasPreview(false)
    try {
      const m2 = isMulti && metric2 ? `&metric2=${metric2}` : ''
      const lim = needsLimit ? `&limit=${limit}` : ''
      const r = await fetch(`/api/bi?type=flex&dimension=${dimension}&metric=${metric}${m2}&period=${period}${lim}`)
      const d = await r.json()
      setPreviewData(d.data ?? [])
      setPreviewSeries(d.series ?? [])
      setHasPreview(true)
    } finally { setPreviewing(false) }
  }, [dimension, metric, metric2, chartType, period, isMulti, limit, needsLimit])

  function handleAdd() {
    if (!hasPreview || previewData.length === 0) return
    const dimInfo    = DIMENSIONS.find(d => d.value === dimension)!
    const metricInfo = (METRICS_BY_DIM[dimension] ?? []).find(m => m.value === metric)!
    const m2Info     = metric2 ? METRICS_BY_DIM[dimension]?.find(m => m.value === metric2) : undefined

    const config: ChartConfig = {
      id: Date.now().toString(),
      title,
      dimension, metric, metric2: metric2 || undefined,
      chartType, period,
      colSpan: dimension === 'channel_trend' || chartType === 'funnel' ? 12 : 6,
      height: chartType === 'treemap' || chartType === 'funnel' ? 'lg' : 'md',
      limit: needsLimit ? limit : undefined,
      dimLabel:     dimInfo?.label    ?? dimension,
      metricLabel:  metricInfo?.label ?? metric,
      metric2Label: m2Info?.label,
      isCurrency:   metricInfo?.isCurrency  ?? false,
      isCurrency2:  m2Info?.isCurrency,
      series:       previewSeries.length > 0 ? previewSeries : undefined,
    }
    onAddToDashboard(config)
    setTitle(''); setHasPreview(false); setPreviewSeries([])
  }

  // Apply a quick template
  function applyTemplate(tpl: typeof QUICK_TEMPLATES[0]) {
    setDimension(tpl.dimension)
    setMetric(tpl.metric)
    setChartType(tpl.chartType)
    setPeriod(tpl.period)
    if (tpl.limit) setLimit(tpl.limit)
    setMetric2('')
    setHasPreview(false)
    setShowBuilder(true)
    setTitle(tpl.title)
  }

  const metricInfo  = METRICS_BY_DIM[dimension]?.find(m => m.value === metric)
  const metric2Info = METRICS_BY_DIM[dimension]?.find(m => m.value === metric2)
  const filteredDims = dimCategory === 'all'
    ? DIMENSIONS
    : DIMENSIONS.filter(d => d.category === dimCategory)

  return (
    <div className="space-y-4">

      {/* ── 빠른 시작 템플릿 ────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={14} className="text-yellow-500" />
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">빠른 시작 템플릿</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {QUICK_TEMPLATES.map(tpl => (
            <button key={tpl.title} onClick={() => applyTemplate(tpl)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-left transition-all group">
              <span className="text-lg leading-none">{tpl.icon}</span>
              <span className="text-xs font-medium text-gray-700 group-hover:text-blue-700 leading-tight">{tpl.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── 커스텀 빌더 (토글) ──────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200">
        <button onClick={() => setShowBuilder(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">커스텀 차트 빌더</p>
          {showBuilder ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </button>

        {showBuilder && (
          <div className="px-5 pb-5 space-y-5 border-t border-gray-100 pt-4">

            {/* Step 1: 데이터 설정 */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">1 · 데이터 설정</p>

              {/* 카테고리 필터 */}
              <div className="flex flex-wrap gap-1 mb-3">
                {(['all', ...DIMENSION_CATEGORIES] as const).map(cat => (
                  <button key={cat} onClick={() => setDimCategory(cat)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${dimCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {cat === 'all' ? '전체' : cat}
                  </button>
                ))}
              </div>

              {/* 차원 선택 */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-3">
                {filteredDims.map(d => (
                  <button key={d.value} onClick={() => setDimension(d.value)}
                    title={d.hint}
                    className={`flex flex-col items-start gap-0.5 px-3 py-2 rounded-lg border text-left transition-all ${
                      dimension === d.value
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                    }`}>
                    <span className={`text-xs font-medium leading-tight ${dimension === d.value ? 'text-white' : 'text-gray-700'}`}>{d.label}</span>
                    <span className={`text-[10px] leading-tight ${dimension === d.value ? 'text-blue-200' : 'text-gray-400'}`}>{d.category}</span>
                  </button>
                ))}
              </div>

              {currentDimInfo && (
                <p className="text-xs text-blue-600 bg-blue-50 rounded-md px-3 py-1.5 mb-3">{currentDimInfo.hint}</p>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Y축 (측정값)</label>
                  <select value={metric} onChange={e => { setMetric(e.target.value); setHasPreview(false) }}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {currentMetrics.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    2번째 Y축 {!isMulti && <span className="text-gray-300">(단일 계열 미사용)</span>}
                  </label>
                  <select value={metric2} onChange={e => { setMetric2(e.target.value); setHasPreview(false) }}
                    disabled={!isMulti || currentMetrics.length < 2}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">선택 안함</option>
                    {currentMetrics.filter(m => m.value !== metric).map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">기간</label>
                  <select value={period} onChange={e => { setPeriod(e.target.value); setHasPreview(false) }}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                {needsLimit && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">상위 N개</label>
                    <select value={limit} onChange={e => { setLimit(Number(e.target.value)); setHasPreview(false) }}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {[5, 10, 20, 50].map(n => <option key={n} value={n}>상위 {n}개</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Step 2: 차트 유형 */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">2 · 차트 유형</p>
                {!N_SERIES_DIMS.has(dimension) && (
                  <span className="text-[10px] text-green-700 bg-green-50 border border-green-200 rounded px-2 py-0.5">
                    AI 추천: {CHART_TYPES.find(t => t.value === recommendChartType(dimension))?.label}
                  </span>
                )}
              </div>

              {N_SERIES_DIMS.has(dimension) ? (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-50 rounded-lg text-xs text-blue-700 border border-blue-100">
                  <span>📊</span>
                  <span>채널별 N계열 데이터 → <strong>꺾은선</strong> 차트로 자동 표시됩니다 (채널별 월간 추이 전용)</span>
                </div>
              ) : (
                <div className="grid grid-cols-5 md:grid-cols-7 lg:grid-cols-9 gap-2">
                  {CHART_TYPES.map(ct => {
                    const isRec = recommendChartType(dimension) === ct.value
                    return (
                      <button key={ct.value} onClick={() => setChartType(ct.value)} title={ct.desc}
                        className={`relative flex flex-col items-center gap-1 p-2 rounded-lg border text-center transition-all ${
                          chartType === ct.value
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : isRec
                            ? 'border-green-400 bg-green-50 text-gray-700 hover:border-green-500'
                            : ct.multiSeries
                            ? 'border-dashed border-gray-300 text-gray-600 hover:border-blue-400 hover:bg-blue-50'
                            : 'border-gray-200 text-gray-600 hover:border-blue-400 hover:bg-blue-50'
                        }`}>
                        {isRec && chartType !== ct.value && (
                          <span className="absolute -top-1.5 -right-1.5 px-1 py-0.5 bg-green-500 text-white text-[8px] rounded-full font-bold leading-none">AI</span>
                        )}
                        <span className="text-base leading-none">{CHART_TYPE_ICONS[ct.value] ?? '▪'}</span>
                        <span className="text-[10px] font-medium leading-tight">{ct.label}</span>
                        {ct.multiSeries && <span className={`text-[9px] ${chartType === ct.value ? 'text-blue-200' : 'text-blue-400'}`}>2계열</span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Step 3: 미리보기 */}
            <div>
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
                  <button onClick={handleAdd} disabled={!hasPreview || previewData.length === 0}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-40">
                    <Plus size={13} /> 대시보드에 추가
                  </button>
                </div>
              </div>

              {hasPreview ? (
                previewData.length === 0
                  ? <p className="text-sm text-gray-400 text-center py-12">데이터가 없습니다</p>
                  : <ChartRenderer
                      data={previewData} chartType={chartType}
                      isCurrency={metricInfo?.isCurrency ?? false}
                      isCurrency2={metric2Info?.isCurrency ?? false}
                      label1={metricInfo?.label ?? metric}
                      label2={metric2Info?.label ?? metric2}
                      height={320}
                      series={previewSeries.length > 0 ? previewSeries : undefined}
                    />
              ) : (
                <div className="flex items-center justify-center py-16 text-sm text-gray-400">
                  미리보기 버튼을 눌러 차트를 확인하세요
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
