'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Loader2, Zap, ChevronDown, ChevronUp, Lightbulb, TrendingUp, TrendingDown, AlertTriangle, Info } from 'lucide-react'
import { ChartRenderer, type DataPoint } from './ChartRenderer'
import type { ChartConfig } from './chartTypes'
import {
  DIMENSIONS, DIMENSION_CATEGORIES, METRICS_BY_DIM, CHART_TYPES,
  PERIODS, QUICK_TEMPLATES, recommendChartType, N_SERIES_DIMS,
  DIMENSION_DATA_TYPE, DATA_TYPE_INFO, getRecommendMeta, calcConfidence,
  type DimensionCategory,
} from './chartTypes'

interface Props {
  onAddToDashboard: (config: ChartConfig) => void
}

const CHART_TYPE_ICONS: Record<string, string> = {
  bar: '▌▌', bar_h: '━━', line: '╱╲', area: '◣◢', pie: '◔', donut: '◎',
  funnel: '▽▼', treemap: '▪◼',
  bar_grouped: '▌▐', bar_stacked: '▬▬', line_multi: '≈≈', scatter: '∴∵', combo: '▌╱',
}

// ── Rule 18: 자동 인사이트 계산 ─────────────────────────────────────────────────
interface Insight {
  type: 'max' | 'min' | 'change' | 'outlier' | 'trend'
  text: string
  level: 'info' | 'warn' | 'success'
}

function fmtShort(v: number, isCurrency: boolean): string {
  if (isCurrency) {
    if (v >= 1e8) return `${(v / 1e8).toFixed(1)}억`
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
    if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`
    return v.toLocaleString()
  }
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`
  return v.toLocaleString()
}

function computeInsights(data: DataPoint[], isCurrency: boolean, dataType: string | null): Insight[] {
  if (!data || data.length < 2) return []
  const insights: Insight[] = []
  const values = data.map(d => d.value)
  const fmt = (v: number) => fmtShort(v, isCurrency)

  const maxVal = Math.max(...values)
  const minVal = Math.min(...values)
  const maxIdx = values.indexOf(maxVal)
  const minIdx = values.indexOf(minVal)

  // 1. 최고 / 최저
  insights.push({ type: 'max', text: `최고: ${data[maxIdx].label} → ${fmt(maxVal)}`, level: 'success' })
  if (minIdx !== maxIdx && values.length > 2) {
    insights.push({ type: 'min', text: `최저: ${data[minIdx].label} → ${fmt(minVal)}`, level: 'info' })
  }

  // 2. 직전 대비 변화 (시계열)
  if (dataType === 'A' && data.length >= 2) {
    const last = values[values.length - 1]
    const prev = values[values.length - 2]
    if (prev > 0) {
      const pct = (last - prev) / prev * 100
      const sign = pct >= 0 ? '+' : ''
      insights.push({
        type: 'change',
        text: `최근 변화: ${sign}${pct.toFixed(1)}% (${data[data.length - 2].label} → ${data[data.length - 1].label})`,
        level: pct >= 0 ? 'success' : 'warn',
      })
    }
  }

  // 3. 이상값 감지 ±3σ [Rule 13]
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const std  = Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length)
  const hasOutliers = std > 0
  if (std > 0) {
    const outliers = data.filter(d => Math.abs(d.value - mean) > 3 * std)
    if (outliers.length > 0) {
      insights.push({
        type: 'outlier',
        text: `이상값 감지: ${outliers.map(o => o.label).join(', ')} (평균 대비 ±3σ 이탈 — 확인 필요)`,
        level: 'warn',
      })
    }
  }

  // 4. 트렌드 방향 (시계열, 4개 이상)
  if (dataType === 'A' && values.length >= 4) {
    const half     = Math.floor(values.length / 2)
    const firstAvg = values.slice(0, half).reduce((s, v) => s + v, 0) / half
    const lastAvg  = values.slice(half).reduce((s, v) => s + v, 0) / (values.length - half)
    const trendPct = firstAvg > 0 ? (lastAvg - firstAvg) / firstAvg * 100 : 0
    if (Math.abs(trendPct) > 10) {
      insights.push({
        type: 'trend',
        text: `트렌드: ${trendPct > 0 ? '지속 상승' : '지속 하락'} (전반기 vs 후반기 ${trendPct > 0 ? '+' : ''}${trendPct.toFixed(0)}%)`,
        level: trendPct > 0 ? 'success' : 'warn',
      })
    } else {
      insights.push({ type: 'trend', text: '트렌드: 보합 (전반기 vs 후반기 변동 없음)', level: 'info' })
    }
  }

  void hasOutliers  // used above
  return insights.slice(0, 5)
}

// ── Rule 16: 신뢰도 계산 헬퍼 ───────────────────────────────────────────────────
function computeConfidence(data: DataPoint[], dimension: string): number {
  const dataType = DIMENSION_DATA_TYPE[dimension]
  const values   = data.map(d => d.value)
  const n        = values.length
  const mean     = n > 0 ? values.reduce((s, v) => s + v, 0) / n : 0
  const std      = n > 0 ? Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n) : 0
  const outliers = std > 0 ? values.filter(v => Math.abs(v - mean) > 3 * std) : []
  return calcConfidence({
    dataTypeClear:   !!dataType,
    categoryCountOk: n >= 2 && n <= 10,
    hasTimeAxis:     dataType === 'A',
    noMissingValues: values.every(v => v != null && !isNaN(v)),
    noOutliers:      outliers.length === 0,
  })
}

export function ChartBuilder({ onAddToDashboard }: Props) {
  const [dimCategory,    setDimCategory]    = useState<DimensionCategory | 'all'>('all')
  const [dimension,      setDimension]      = useState('month')
  const [metric,         setMetric]         = useState('revenue')
  const [metric2,        setMetric2]        = useState('')
  const [chartType,      setChartType]      = useState('area')
  const [period,         setPeriod]         = useState(`year_${new Date().getFullYear() - 1}`)
  const [limit,          setLimit]          = useState(10)
  const [title,          setTitle]          = useState('')

  const [previewData,    setPreviewData]    = useState<DataPoint[]>([])
  const [previewSeries,  setPreviewSeries]  = useState<string[]>([])
  const [previewing,     setPreviewing]     = useState(false)
  const [hasPreview,     setHasPreview]     = useState(false)
  const [showBuilder,    setShowBuilder]    = useState(false)
  const [insights,       setInsights]       = useState<Insight[]>([])
  const [autoCorrectMsg, setAutoCorrectMsg] = useState('')
  const [dataConfidence, setDataConfidence] = useState<number | null>(null)

  const currentType    = CHART_TYPES.find(t => t.value === chartType)
  const isMulti        = currentType?.multiSeries ?? false
  const currentMetrics = METRICS_BY_DIM[dimension] ?? []
  const needsLimit     = ['sku_top'].includes(dimension)
  const dataType       = DIMENSION_DATA_TYPE[dimension] ?? null
  const dataTypeInfo   = dataType ? DATA_TYPE_INFO[dataType] : null
  const filteredDims   = dimCategory === 'all' ? DIMENSIONS : DIMENSIONS.filter(d => d.category === dimCategory)
  const metricInfo     = METRICS_BY_DIM[dimension]?.find(m => m.value === metric)
  const metric2Info    = METRICS_BY_DIM[dimension]?.find(m => m.value === metric2)
  const recommendMeta  = getRecommendMeta(dimension)

  // AI 추천: 차원 변경 시 최적 차트 자동 선택
  useEffect(() => {
    const opts = METRICS_BY_DIM[dimension] ?? []
    if (!opts.find(m => m.value === metric)) setMetric(opts[0]?.value ?? 'revenue')
    setMetric2('')
    setHasPreview(false)
    setInsights([])
    setAutoCorrectMsg('')
    setDataConfidence(null)
    setChartType(recommendChartType(dimension))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimension])

  useEffect(() => {
    if (!isMulti) setMetric2('')
    setHasPreview(false)
  }, [chartType, isMulti])

  const fetchPreview = useCallback(async () => {
    setPreviewing(true); setHasPreview(false); setInsights([]); setDataConfidence(null)
    try {
      const m2  = isMulti && metric2 ? `&metric2=${metric2}` : ''
      const lim = needsLimit ? `&limit=${limit}` : ''
      const r   = await fetch(`/api/bi?type=flex&dimension=${dimension}&metric=${metric}${m2}&period=${period}${lim}`)
      const d   = await r.json()
      const rows: DataPoint[] = d.data ?? []

      // [Rule 9] 자동 보정: 카테고리 6개 이상 + 세로막대 → 가로막대 전환
      if (rows.length >= 6 && chartType === 'bar' && dataType !== 'A') {
        setChartType('bar_h')
        setAutoCorrectMsg(`카테고리 ${rows.length}개 이상 → 가로막대로 자동 전환`)
      } else {
        setAutoCorrectMsg('')
      }

      setPreviewData(rows)
      setPreviewSeries(d.series ?? [])
      setHasPreview(true)

      // [Rule 18] 자동 인사이트 (단일 계열만)
      if (rows.length > 0 && !d.series) {
        setInsights(computeInsights(rows, metricInfo?.isCurrency ?? false, dataType))
        setDataConfidence(computeConfidence(rows, dimension))
      }
    } finally { setPreviewing(false) }
  }, [dimension, metric, metric2, chartType, period, isMulti, limit, needsLimit, dataType, metricInfo])

  function handleAdd() {
    if (!hasPreview || previewData.length === 0) return
    const dimInfo = DIMENSIONS.find(d => d.value === dimension)!
    const mInfo   = (METRICS_BY_DIM[dimension] ?? []).find(m => m.value === metric)!
    const m2Info  = metric2 ? METRICS_BY_DIM[dimension]?.find(m => m.value === metric2) : undefined

    const config: ChartConfig = {
      id: Date.now().toString(),
      title: title || `${dimInfo.label} · ${mInfo.label}`,
      dimension, metric, metric2: metric2 || undefined,
      chartType, period,
      colSpan: dimension === 'channel_trend' || chartType === 'funnel' ? 12 : 6,
      height: chartType === 'treemap' || chartType === 'funnel' ? 'lg' : 'md',
      limit: needsLimit ? limit : undefined,
      dimLabel:     dimInfo.label,
      metricLabel:  mInfo.label,
      metric2Label: m2Info?.label,
      isCurrency:   mInfo.isCurrency ?? false,
      isCurrency2:  m2Info?.isCurrency,
      series:       previewSeries.length > 0 ? previewSeries : undefined,
    }
    onAddToDashboard(config)
    setTitle(''); setHasPreview(false); setPreviewSeries([]); setInsights([])
  }

  function applyTemplate(tpl: typeof QUICK_TEMPLATES[0]) {
    setDimension(tpl.dimension)
    setMetric(tpl.metric)
    setChartType(tpl.chartType)
    setPeriod(tpl.period)
    if (tpl.limit) setLimit(tpl.limit)
    setMetric2(''); setHasPreview(false); setInsights([])
    setShowBuilder(true); setTitle(tpl.title)
  }

  const insightIcon = (type: string, level: string) => {
    if (type === 'outlier') return <AlertTriangle size={12} className="text-amber-500 flex-shrink-0 mt-0.5" />
    if (level === 'success') return <TrendingUp size={12} className="text-green-500 flex-shrink-0 mt-0.5" />
    if (level === 'warn')    return <TrendingDown size={12} className="text-red-400 flex-shrink-0 mt-0.5" />
    return <Info size={12} className="text-gray-400 flex-shrink-0 mt-0.5" />
  }

  const confidenceColor = (c: number) =>
    c >= 80 ? 'text-green-700 bg-green-50' : c >= 60 ? 'text-yellow-700 bg-yellow-50' : 'text-red-700 bg-red-50'

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
              {/* 제목 + 데이터 유형 뱃지 [Rule 5] */}
              <div className="flex items-center gap-2 mb-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">1 · 데이터 설정</p>
                {dataTypeInfo && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${dataTypeInfo.badge}`}>
                    {dataTypeInfo.label} · {dataTypeInfo.desc}
                  </span>
                )}
              </div>

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
                  <button key={d.value} onClick={() => setDimension(d.value)} title={d.hint}
                    className={`flex flex-col items-start gap-0.5 px-3 py-2 rounded-lg border text-left transition-all ${
                      dimension === d.value ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                    }`}>
                    <span className={`text-xs font-medium leading-tight ${dimension === d.value ? 'text-white' : 'text-gray-700'}`}>{d.label}</span>
                    <span className={`text-[10px] leading-tight ${dimension === d.value ? 'text-blue-200' : 'text-gray-400'}`}>{d.category}</span>
                  </button>
                ))}
              </div>

              {/* 차원 힌트 */}
              {DIMENSIONS.find(d => d.value === dimension)?.hint && (
                <p className="text-xs text-blue-600 bg-blue-50 rounded-md px-3 py-1.5 mb-3">
                  {DIMENSIONS.find(d => d.value === dimension)!.hint}
                </p>
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
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">2 · 차트 유형</p>
                {!N_SERIES_DIMS.has(dimension) && (
                  <span className="text-[10px] text-green-700 bg-green-50 border border-green-200 rounded px-2 py-0.5">
                    AI 추천: {CHART_TYPES.find(t => t.value === recommendChartType(dimension))?.label}
                  </span>
                )}
              </div>

              {/* AI 추천 이유 패널 [Rule 17] */}
              {!N_SERIES_DIMS.has(dimension) && recommendMeta.reasons.length > 0 && (
                <div className="mb-3 px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Lightbulb size={11} className="text-yellow-500" />
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">추천 이유</span>
                    <span className="ml-auto text-[10px] font-semibold text-green-700">신뢰도 {recommendMeta.confidence}%</span>
                  </div>
                  <ul className="space-y-0.5">
                    {recommendMeta.reasons.map((r, i) => (
                      <li key={i} className="text-[11px] text-gray-600 flex items-start gap-1">
                        <span className="text-blue-400 mt-0.5 flex-shrink-0">·</span> {r}
                      </li>
                    ))}
                  </ul>
                  {recommendMeta.alternativeValue !== '─' && (
                    <p className="text-[10px] text-gray-400 mt-1.5">대안: {recommendMeta.alternativeLabel}</p>
                  )}
                </div>
              )}

              {N_SERIES_DIMS.has(dimension) ? (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-50 rounded-lg text-xs text-blue-700 border border-blue-100">
                  <span>📊</span>
                  <span>채널별 N계열 데이터 → <strong>꺾은선</strong> 차트로 자동 표시됩니다</span>
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
                          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-green-500 text-white text-[8px] rounded-full font-bold flex items-center justify-center">AI</span>
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

            {/* Step 3: 미리보기 & 저장 */}
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

              {/* 자동 보정 알림 [Rule 9] */}
              {autoCorrectMsg && (
                <div className="mb-3 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                  <AlertTriangle size={12} />
                  {autoCorrectMsg}
                </div>
              )}

              {hasPreview ? (
                previewData.length === 0
                  ? <p className="text-sm text-gray-400 text-center py-12">데이터가 없습니다</p>
                  : (
                    <>
                      <ChartRenderer
                        data={previewData} chartType={chartType}
                        isCurrency={metricInfo?.isCurrency ?? false}
                        isCurrency2={metric2Info?.isCurrency ?? false}
                        label1={metricInfo?.label ?? metric}
                        label2={metric2Info?.label ?? metric2}
                        height={320}
                        series={previewSeries.length > 0 ? previewSeries : undefined}
                      />

                      {/* 자동 인사이트 패널 [Rule 18] */}
                      {insights.length > 0 && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                              <Lightbulb size={12} className="text-yellow-500" />
                              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">AI 인사이트</span>
                            </div>
                            {dataConfidence != null && (
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${confidenceColor(dataConfidence)}`}>
                                데이터 신뢰도 {dataConfidence}%
                              </span>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            {insights.map((ins, i) => (
                              <div key={i} className={`flex items-start gap-2 text-xs rounded px-2.5 py-1.5 ${
                                ins.level === 'warn'    ? 'bg-amber-50 text-amber-800' :
                                ins.level === 'success' ? 'bg-green-50 text-green-800' :
                                                          'bg-white text-gray-700'
                              }`}>
                                {insightIcon(ins.type, ins.level)}
                                <span>{ins.text}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )
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
