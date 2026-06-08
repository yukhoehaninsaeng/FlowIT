'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatKRW } from '@/lib/utils'
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  Zap, BarChart2, LayoutDashboard, ChevronUp, ChevronDown,
  Trash2, Loader2, Plus, Sparkles,
} from 'lucide-react'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']

// ─── Types ───────────────────────────────────────────────────────────────────
type DataType = 'timeseries' | 'comparison' | 'distribution' | 'ranking' | 'pipeline'
type ChartTypeId = 'bar' | 'line' | 'area' | 'pie' | 'donut'

interface DataPoint { label: string; value: number }

interface ChartOption {
  id: string; name: string; subtitle: string; category: string
  dataType: DataType; dimension: string; metric: string; description: string
}

interface SavedChart {
  id: string; optionId: string; chartType: ChartTypeId; period: string
  yMetric: string; title: string; savedAt: string
}

// ─── Constants ───────────────────────────────────────────────────────────────
const DATA_TYPE_LABEL: Record<DataType, string> = {
  timeseries:   'TYPE A · 시계열 · 시간 흐름 추이',
  comparison:   'TYPE B · 비교 · 항목 간 비교',
  distribution: 'TYPE C · 분포 · 비중 분석',
  ranking:      'TYPE D · 랭킹 · 순위 분석',
  pipeline:     'TYPE E · 퍼널 · 단계별 전환',
}

const AI_RECOMMEND: Record<DataType, ChartTypeId> = {
  timeseries: 'area', comparison: 'bar', distribution: 'donut', ranking: 'bar', pipeline: 'bar',
}

const CHART_TYPES: { value: ChartTypeId; label: string }[] = [
  { value: 'bar', label: '막대' }, { value: 'line', label: '라인' },
  { value: 'area', label: '영역' }, { value: 'pie', label: '파이' }, { value: 'donut', label: '도넛' },
]

const PERIODS = [
  { value: 'monthly', label: '이번달' },
  { value: 'quarterly', label: '분기' },
  { value: 'yearly', label: '연도' },
]

const CATEGORY_FILTERS = [
  { id: 'all', label: '전체' }, { id: 'sales', label: '매출·채널' },
  { id: 'product', label: '상품' }, { id: 'customer', label: '고객' },
  { id: 'pipeline', label: '영업' }, { id: 'marketing', label: '마케팅' },
  { id: 'logistics', label: '물류·반품' },
]

const CHART_OPTIONS: ChartOption[] = [
  { id: 'channel_revenue',  name: '채널별 매출',     subtitle: '매출·채널', category: 'sales',     dataType: 'comparison',   dimension: 'channel',  metric: 'revenue', description: '채널별 총 매출액 비교' },
  { id: 'channel_monthly',  name: '채널별 월간 추이', subtitle: '매출·채널', category: 'sales',     dataType: 'timeseries',   dimension: 'month',    metric: 'revenue', description: '월별 채널 매출 흐름' },
  { id: 'monthly_trend',    name: '월별 추이',        subtitle: '매출·채널', category: 'sales',     dataType: 'timeseries',   dimension: 'month',    metric: 'revenue', description: '선택 연도의 월별 매출/주문수 변화' },
  { id: 'yoy',              name: '전년 동기 비교',   subtitle: '매출·채널', category: 'sales',     dataType: 'comparison',   dimension: 'month',    metric: 'revenue', description: '전년 동월 대비 매출 증감' },
  { id: 'weekday',          name: '요일별 패턴',      subtitle: '매출·채널', category: 'sales',     dataType: 'timeseries',   dimension: 'month',    metric: 'count',   description: '요일별 주문 수 패턴' },
  { id: 'hourly',           name: '시간대별',         subtitle: '매출·채널', category: 'sales',     dataType: 'timeseries',   dimension: 'month',    metric: 'count',   description: '시간대별 주문 분포' },
  { id: 'top_products',     name: '상위 상품',        subtitle: '상품',      category: 'product',   dataType: 'ranking',      dimension: 'category', metric: 'count',   description: '판매량 상위 상품 순위' },
  { id: 'category_dist',    name: '카테고리별',       subtitle: '상품',      category: 'product',   dataType: 'distribution', dimension: 'category', metric: 'count',   description: '카테고리별 상품 분포' },
  { id: 'segment',          name: '고객 세그먼트',    subtitle: '고객',      category: 'customer',  dataType: 'distribution', dimension: 'segment',  metric: 'count',   description: 'RFM 기반 고객 세그먼트 분포' },
  { id: 'deal_pipeline',    name: '영업 파이프라인',  subtitle: '영업',      category: 'pipeline',  dataType: 'pipeline',     dimension: 'stage',    metric: 'count',   description: '단계별 딜 수 및 전환율' },
  { id: 'deal_amount',      name: '딜 단계 금액',     subtitle: '영업',      category: 'pipeline',  dataType: 'comparison',   dimension: 'stage',    metric: 'revenue', description: '단계별 딜 금액 합계' },
  { id: 'campaign_perf',    name: '캠페인 성과',      subtitle: '마케팅',    category: 'marketing', dataType: 'comparison',   dimension: 'channel',  metric: 'revenue', description: '채널별 캠페인 기여 매출' },
  { id: 'return_reason',    name: '반품 사유',        subtitle: '물류·반품', category: 'logistics', dataType: 'distribution', dimension: 'reason',   metric: 'count',   description: '사유별 반품 건수 분포' },
  { id: 'return_monthly',   name: '반품 월별 추이',   subtitle: '물류·반품', category: 'logistics', dataType: 'timeseries',   dimension: 'month',    metric: 'count',   description: '월별 반품 건수 추이' },
  { id: 'carrier',          name: '배송사별',         subtitle: '물류·반품', category: 'logistics', dataType: 'comparison',   dimension: 'channel',  metric: 'count',   description: '배송사별 출고 건수' },
  { id: 'partner_settle',   name: '거래처 정산',      subtitle: '물류·반품', category: 'logistics', dataType: 'comparison',   dimension: 'partner',  metric: 'revenue', description: '거래처별 정산 금액' },
]

const TEMPLATES = [
  { id: 't1',  name: '월간 매출 추이',    emoji: '📈', optionId: 'monthly_trend',  chartType: 'area'  as ChartTypeId, period: 'yearly' },
  { id: 't2',  name: '채널별 매출 비중',  emoji: '🎯', optionId: 'channel_revenue', chartType: 'donut' as ChartTypeId, period: 'monthly' },
  { id: 't3',  name: '전년 대비 매출',    emoji: '📊', optionId: 'yoy',             chartType: 'bar'   as ChartTypeId, period: 'yearly' },
  { id: 't4',  name: '채널별 월별 추이',  emoji: '🏪', optionId: 'channel_monthly', chartType: 'line'  as ChartTypeId, period: 'yearly' },
  { id: 't5',  name: '상위 10 상품',      emoji: '🏆', optionId: 'top_products',    chartType: 'bar'   as ChartTypeId, period: 'monthly' },
  { id: 't6',  name: '영업 파이프라인',   emoji: '🔀', optionId: 'deal_pipeline',   chartType: 'bar'   as ChartTypeId, period: 'monthly' },
  { id: 't7',  name: '요일별 주문 패턴',  emoji: '📅', optionId: 'weekday',          chartType: 'bar'   as ChartTypeId, period: 'monthly' },
  { id: 't8',  name: '시간대별 주문',     emoji: '🕐', optionId: 'hourly',           chartType: 'bar'   as ChartTypeId, period: 'monthly' },
  { id: 't9',  name: '세그먼트별 LTV',    emoji: '👥', optionId: 'segment',          chartType: 'bar'   as ChartTypeId, period: 'monthly' },
  { id: 't10', name: '카테고리 분포',     emoji: '📦', optionId: 'category_dist',   chartType: 'pie'   as ChartTypeId, period: 'monthly' },
  { id: 't11', name: '반품 사유 분석',    emoji: '↩️', optionId: 'return_reason',   chartType: 'donut' as ChartTypeId, period: 'monthly' },
  { id: 't12', name: '캠페인 기여 매출',  emoji: '🎪', optionId: 'campaign_perf',   chartType: 'bar'   as ChartTypeId, period: 'monthly' },
]

const STORAGE_KEY = 'flowit_bi_saved_v2'

function loadSaved(): SavedChart[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') } catch { return [] }
}

function isCurrency(metric: string) {
  return metric === 'revenue' || metric === 'avg_ltv' || metric === 'refund'
}

// ─── ChartRenderer ────────────────────────────────────────────────────────────
function ChartRenderer({ data, chartType, currency }: { data: DataPoint[]; chartType: ChartTypeId; currency: boolean }) {
  const fmt  = (v: number) => currency ? formatKRW(v) : v.toLocaleString()
  const tick = (v: number) => currency
    ? (v >= 1_000_000 ? `${(v/1_000_000).toFixed(0)}M` : v >= 1_000 ? `${(v/1_000).toFixed(0)}K` : String(v))
    : v.toLocaleString()

  if (chartType === 'pie' || chartType === 'donut') {
    const total = data.reduce((s, d) => s + d.value, 0)
    return (
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%"
            outerRadius={90} innerRadius={chartType === 'donut' ? 50 : 0}
            label={({ name, value }: { name?: string; value?: number }) =>
              `${name} (${total > 0 ? Math.round((value ?? 0) / total * 100) : 0}%)`}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v: unknown) => fmt(Number(v))} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    )
  }
  if (chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={tick} />
          <Tooltip formatter={(v: unknown) => fmt(Number(v))} />
          <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    )
  }
  if (chartType === 'area') {
    return (
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={tick} />
          <Tooltip formatter={(v: unknown) => fmt(Number(v))} />
          <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="url(#aGrad)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={tick} />
        <Tooltip formatter={(v: unknown) => fmt(Number(v))} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── SavedChartCard ───────────────────────────────────────────────────────────
function SavedChartCard({ saved, onDelete }: { saved: SavedChart; onDelete: () => void }) {
  const opt = CHART_OPTIONS.find(o => o.id === saved.optionId)
  const [data, setData] = useState<DataPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!opt) { setLoading(false); return }
    fetch(`/api/bi?type=flex&dimension=${opt.dimension}&metric=${saved.yMetric}&period=${saved.period}`)
      .then(r => r.json()).then(d => setData(d.data ?? [])).finally(() => setLoading(false))
  }, [opt, saved.yMetric, saved.period])

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{saved.title || opt?.name}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{opt?.subtitle} · {CHART_TYPES.find(c => c.value === saved.chartType)?.label} · {PERIODS.find(p => p.value === saved.period)?.label}</p>
        </div>
        <button onClick={onDelete} className="p-1 text-gray-300 hover:text-red-400 rounded"><Trash2 size={14} /></button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-40"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-sm text-gray-400">데이터 없음</div>
      ) : (
        <ChartRenderer data={data} chartType={saved.chartType} currency={isCurrency(saved.yMetric)} />
      )}
    </div>
  )
}

// ─── ChartBuilderTab ──────────────────────────────────────────────────────────
function ChartBuilderTab({ onSave }: { onSave: (chart: SavedChart) => void }) {
  const [catFilter, setCatFilter] = useState('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [chartType, setChartType] = useState<ChartTypeId>('bar')
  const [yMetric, setYMetric] = useState('revenue')
  const [period, setPeriod] = useState('monthly')
  const [title, setTitle] = useState('')
  const [previewData, setPreviewData] = useState<DataPoint[]>([])
  const [previewing, setPreviewing] = useState(false)
  const [hasPrev, setHasPrev] = useState(false)
  const [builderOpen, setBuilderOpen] = useState(true)

  const selected = CHART_OPTIONS.find(o => o.id === selectedId)
  const aiRecommend = selected ? AI_RECOMMEND[selected.dataType] : null

  const visibleOptions = catFilter === 'all'
    ? CHART_OPTIONS
    : CHART_OPTIONS.filter(o => o.category === catFilter)

  function selectOption(opt: ChartOption) {
    setSelectedId(opt.id)
    setChartType(AI_RECOMMEND[opt.dataType])
    setHasPrev(false)
    setPreviewData([])
    const firstMetric = opt.metric
    setYMetric(firstMetric)
  }

  function applyTemplate(tmpl: typeof TEMPLATES[0]) {
    const opt = CHART_OPTIONS.find(o => o.id === tmpl.optionId)
    if (!opt) return
    setSelectedId(opt.id)
    setChartType(tmpl.chartType)
    setPeriod(tmpl.period)
    setYMetric(opt.metric)
    setHasPrev(false)
    setPreviewData([])
    setBuilderOpen(true)
  }

  const fetchPreview = useCallback(async () => {
    if (!selected) return
    setPreviewing(true); setHasPrev(false)
    try {
      const r = await fetch(`/api/bi?type=flex&dimension=${selected.dimension}&metric=${yMetric}&period=${period}`)
      const d = await r.json()
      setPreviewData(d.data ?? [])
      setHasPrev(true)
    } finally { setPreviewing(false) }
  }, [selected, yMetric, period])

  function addToDashboard() {
    if (!selected || !hasPrev) return
    onSave({
      id: Date.now().toString(),
      optionId: selected.id,
      chartType,
      period,
      yMetric,
      title,
      savedAt: new Date().toISOString(),
    })
    setTitle('')
    setHasPrev(false)
  }

  return (
    <div className="space-y-5">
      {/* 빠른 시작 템플릿 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-base">⭐</span>
          <h2 className="text-sm font-semibold text-gray-900">빠른 시작 템플릿</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TEMPLATES.map(tmpl => (
            <button key={tmpl.id} onClick={() => applyTemplate(tmpl)}
              className="flex items-center gap-2 px-3 py-2.5 text-left rounded-lg border border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-colors group">
              <span className="text-base flex-shrink-0">{tmpl.emoji}</span>
              <span className="text-xs text-gray-700 group-hover:text-blue-700 leading-tight">{tmpl.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 커스텀 차트 빌더 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button onClick={() => setBuilderOpen(p => !p)}
          className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-gray-900 hover:bg-gray-50">
          <span className="flex items-center gap-2">
            <BarChart2 size={16} className="text-blue-600" />커스텀 차트 빌더
          </span>
          {builderOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </button>

        {builderOpen && (
          <div className="border-t border-gray-100 px-5 pb-5 space-y-5 pt-4">
            {/* Step 1 */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-semibold text-gray-700">1 · 데이터 설정</span>
                {selected && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700 font-medium">
                    {DATA_TYPE_LABEL[selected.dataType]}
                  </span>
                )}
              </div>

              {/* Category filter */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {CATEGORY_FILTERS.map(cat => (
                  <button key={cat.id} onClick={() => setCatFilter(cat.id)}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      catFilter === cat.id
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'border-gray-200 text-gray-600 hover:border-gray-400'
                    }`}>
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Chart option grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {visibleOptions.map(opt => (
                  <button key={opt.id} onClick={() => selectOption(opt)}
                    className={`text-left px-3 py-2.5 rounded-lg border transition-colors ${
                      selectedId === opt.id
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-gray-100 hover:border-blue-300 hover:bg-blue-50'
                    }`}>
                    <p className={`text-xs font-medium leading-tight ${selectedId === opt.id ? 'text-white' : 'text-gray-800'}`}>{opt.name}</p>
                    <p className={`text-[10px] mt-0.5 ${selectedId === opt.id ? 'text-blue-100' : 'text-gray-400'}`}>{opt.subtitle}</p>
                  </button>
                ))}
              </div>

              {selected && (
                <p className="text-xs text-blue-600 mt-2">{selected.description}</p>
              )}
            </div>

            {/* Step 2 */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-semibold text-gray-700">2 · 차트 유형</span>
                {aiRecommend && (
                  <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-purple-50 text-purple-700 font-medium">
                    <Sparkles size={10} />
                    AI 추천: {CHART_TYPES.find(c => c.value === aiRecommend)?.label}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {CHART_TYPES.map(ct => (
                  <button key={ct.value} onClick={() => setChartType(ct.value)}
                    className={`px-3 py-1.5 text-xs rounded-md border transition-colors ${
                      chartType === ct.value
                        ? 'bg-blue-600 text-white border-blue-600'
                        : ct.value === aiRecommend
                          ? 'border-purple-300 text-purple-700 bg-purple-50 hover:bg-purple-100'
                          : 'border-gray-200 text-gray-600 hover:border-gray-400'
                    }`}>
                    {ct.label}
                    {ct.value === aiRecommend && chartType !== ct.value && (
                      <span className="ml-1 text-purple-500">✦</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Config row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Y축 (측정값)</label>
                <select value={yMetric} onChange={e => setYMetric(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="revenue">매출액</option>
                  <option value="count">건수</option>
                  <option value="avg_ltv">평균 LTV</option>
                  <option value="refund">환불액</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">2번째 Y축 (단일 계열 미사용)</label>
                <select className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">선택 안함</option>
                  <option value="count">건수</option>
                  <option value="revenue">매출액</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">기간</label>
                <select value={period} onChange={e => setPeriod(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>

            {/* Action row */}
            <div className="flex items-center gap-2 flex-wrap">
              <input value={title} onChange={e => setTitle(e.target.value)}
                placeholder="차트 제목 (선택)"
                className="flex-1 min-w-[160px] max-w-xs px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button onClick={fetchPreview} disabled={!selected || previewing}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-800 text-white text-sm rounded-md hover:bg-gray-700 disabled:opacity-40">
                {previewing && <Loader2 size={13} className="animate-spin" />}
                미리보기
              </button>
              <button onClick={addToDashboard} disabled={!hasPrev || previewData.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-40">
                <Plus size={14} /> 내 대시보드에 추가
              </button>
            </div>

            {/* Preview */}
            {hasPrev && (
              <div className="border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                <p className="text-xs text-gray-500 mb-3 font-medium">미리보기</p>
                {previewData.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">해당 기간 데이터가 없습니다</p>
                ) : (
                  <ChartRenderer data={previewData} chartType={chartType} currency={isCurrency(yMetric)} />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── MyDashboardTab ───────────────────────────────────────────────────────────
function MyDashboardTab({ saved, onDelete }: { saved: SavedChart[]; onDelete: (id: string) => void }) {
  if (saved.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <LayoutDashboard size={40} className="mx-auto mb-3 text-gray-200" />
        <p className="text-sm">저장된 차트가 없습니다.</p>
        <p className="text-xs mt-1">차트 빌더에서 만든 차트를 여기에 추가하세요.</p>
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {saved.map(s => (
        <SavedChartCard key={s.id} saved={s} onDelete={() => onDelete(s.id)} />
      ))}
    </div>
  )
}

// ─── AnalysisTab ──────────────────────────────────────────────────────────────
type SalesData = { byChannel: { channel: string; _sum: { totalAmount: string }; _count: { id: number } }[] }
type CustomerData = { total: number; active: number; vip: number; churnRisk: number; avgLtv: string }
type MarketingData = { totalSent: number; openRate: number; conversionRate: number; revenue: string }
type ScmData = { expiringSkus: { name: string; lotExpiry: string; inventory: { qtyAvailable: number }[] }[] }

function AnalysisTab({ period }: { period: string }) {
  const [salesData, setSalesData] = useState<SalesData | null>(null)
  const [salesMonthly, setSalesMonthly] = useState<DataPoint[]>([])
  const [customerData, setCustomerData] = useState<CustomerData | null>(null)
  const [marketingData, setMarketingData] = useState<MarketingData | null>(null)
  const [scmData, setScmData] = useState<ScmData | null>(null)
  const [innerTab, setInnerTab] = useState('sales')

  useEffect(() => {
    fetch(`/api/bi?type=sales&period=${period}`).then(r => r.json()).then(d => setSalesData(d.data))
    fetch('/api/bi?type=customers').then(r => r.json()).then(d => setCustomerData(d.data))
    fetch(`/api/bi?type=marketing&period=${period}`).then(r => r.json()).then(d => setMarketingData(d.data))
    fetch('/api/bi?type=scm').then(r => r.json()).then(d => setScmData(d.data))
    fetch('/api/bi?type=flex&dimension=month&metric=revenue').then(r => r.json()).then(d => setSalesMonthly(d.data ?? []))
  }, [period])

  const totalRevenue = salesData?.byChannel?.reduce((s, c) => s + Number(c._sum.totalAmount ?? 0), 0) ?? 0
  const totalOrders  = salesData?.byChannel?.reduce((s, c) => s + c._count.id, 0) ?? 0

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {(['sales','customers','marketing','scm'] as const).map(t => (
          <button key={t} onClick={() => setInnerTab(t)}
            className={`px-3 py-1.5 text-xs rounded-md transition-colors ${innerTab === t ? 'bg-white shadow-sm text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-800'}`}>
            {t === 'sales' ? '매출' : t === 'customers' ? '고객' : t === 'marketing' ? '마케팅' : 'SCM'}
          </button>
        ))}
      </div>

      {innerTab === 'sales' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="총 매출" value={formatKRW(totalRevenue)} sub={`${PERIODS.find(p => p.value === period)?.label} 기준`} />
            <KpiCard label="총 주문 수" value={totalOrders.toLocaleString()} sub="건" />
            <KpiCard label="평균 주문액" value={formatKRW(totalOrders > 0 ? totalRevenue / totalOrders : 0)} sub="주문당" />
            <KpiCard label="채널 수" value={String(salesData?.byChannel?.length ?? 0)} sub="활성 채널" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {salesData?.byChannel && salesData.byChannel.length > 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">채널별 매출</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={salesData.byChannel}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="channel" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(Number(v)/1_000_000).toFixed(0)}M`} />
                    <Tooltip formatter={(v: unknown) => formatKRW(Number(v))} />
                    <Bar dataKey="_sum.totalAmount" radius={[4,4,0,0]}>
                      {salesData.byChannel.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyCard message="채널별 매출 데이터 없음" />}
            {salesMonthly.length > 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">월별 매출 추이</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={salesMonthly}>
                    <defs>
                      <linearGradient id="sGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(Number(v)/1_000_000).toFixed(0)}M`} />
                    <Tooltip formatter={(v: unknown) => formatKRW(Number(v))} />
                    <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="url(#sGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyCard message="월별 데이터 없음" />}
          </div>
          {salesData?.byChannel && salesData.byChannel.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">채널별 매출 비중</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={salesData.byChannel.map(c => ({ label: c.channel, value: Number(c._sum.totalAmount ?? 0) }))}
                    dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={85} innerRadius={45}
                    label={({ name, percent }: { name?: string; percent?: number }) => `${name} ${((percent ?? 0)*100).toFixed(0)}%`}>
                    {salesData.byChannel.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: unknown) => formatKRW(Number(v))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {innerTab === 'customers' && customerData && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="전체 고객" value={customerData.total.toLocaleString()} />
            <KpiCard label="활성 고객" value={customerData.active.toLocaleString()} />
            <KpiCard label="VIP" value={customerData.vip.toLocaleString()} sub={`${customerData.total > 0 ? ((customerData.vip/customerData.total)*100).toFixed(1) : 0}%`} />
            <KpiCard label="이탈 위험" value={customerData.churnRisk.toLocaleString()} danger />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">평균 LTV</h3>
            <p className="text-3xl font-bold text-blue-700">{formatKRW(Number(customerData.avgLtv ?? 0))}</p>
          </div>
        </div>
      )}

      {innerTab === 'marketing' && marketingData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="총 발송 수" value={marketingData.totalSent.toLocaleString()} />
          <KpiCard label="오픈율" value={`${((marketingData.openRate ?? 0)*100).toFixed(1)}%`} />
          <KpiCard label="전환율" value={`${((marketingData.conversionRate ?? 0)*100).toFixed(1)}%`} />
          <KpiCard label="기여 매출" value={formatKRW(Number(marketingData.revenue ?? 0))} />
        </div>
      )}

      {innerTab === 'scm' && scmData && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">유통기한 임박 SKU (60일 이내)</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">상품명</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">유통기한</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">잔여 재고</th>
              </tr>
            </thead>
            <tbody>
              {scmData.expiringSkus.map((sku, i) => {
                const qty  = sku.inventory.reduce((s, inv) => s + inv.qtyAvailable, 0)
                const days = Math.ceil((new Date(sku.lotExpiry).getTime() - Date.now()) / 86400000)
                return (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="px-4 py-3 text-gray-900">{sku.name}</td>
                    <td className="px-4 py-3">
                      <span className={days <= 7 ? 'text-red-600 font-medium' : days <= 30 ? 'text-orange-600' : 'text-gray-500'}>
                        {new Date(sku.lotExpiry).toLocaleDateString('ko-KR')} (D-{days})
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{qty.toLocaleString()}</td>
                  </tr>
                )
              })}
              {scmData.expiringSkus.length === 0 && (
                <tr><td colSpan={3} className="text-center py-8 text-gray-400 text-sm">유통기한 임박 SKU가 없습니다</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BiPage() {
  const [activeTab, setActiveTab] = useState<'analysis' | 'builder' | 'dashboard'>('analysis')
  const [period, setPeriod] = useState('monthly')
  const [saved, setSaved] = useState<SavedChart[]>([])

  useEffect(() => { setSaved(loadSaved()) }, [])

  function handleSave(chart: SavedChart) {
    const next = [...saved, chart]
    setSaved(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setActiveTab('dashboard')
  }

  function handleDelete(id: string) {
    const next = saved.filter(s => s.id !== id)
    setSaved(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const TABS = [
    { id: 'analysis' as const,   label: '분석',       icon: BarChart2 },
    { id: 'builder' as const,    label: '차트 빌더',  icon: Zap },
    { id: 'dashboard' as const,  label: '내 대시보드', icon: LayoutDashboard },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-lg font-semibold text-gray-900">BI 대시보드</h1>
        {activeTab === 'analysis' && (
          <div className="flex items-center gap-1.5">
            {PERIODS.map(p => (
              <button key={p.value} onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${period === p.value ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Tabs */}
      <div className="flex gap-0 border-b border-gray-200">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}>
              <Icon size={14} />
              {tab.label}
              {tab.id === 'dashboard' && saved.length > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">{saved.length}</span>
              )}
            </button>
          )
        })}
      </div>

      {activeTab === 'analysis'  && <AnalysisTab period={period} />}
      {activeTab === 'builder'   && <ChartBuilderTab onSave={handleSave} />}
      {activeTab === 'dashboard' && <MyDashboardTab saved={saved} onDelete={handleDelete} />}
    </div>
  )
}

function KpiCard({ label, value, sub, danger }: { label: string; value: string; sub?: string; danger?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${danger ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function EmptyCard({ message }: { message: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 flex items-center justify-center h-40 text-sm text-gray-400">
      {message}
    </div>
  )
}
