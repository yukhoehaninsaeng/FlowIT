'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatKRW } from '@/lib/utils'
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { Plus, Trash2, Loader2, BarChart2, ChevronDown, ChevronUp } from 'lucide-react'

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']

const PERIODS = [
  { label: '이번달', value: 'monthly' },
  { label: '분기', value: 'quarterly' },
  { label: '연도', value: 'yearly' },
]

const DIMENSIONS = [
  { value: 'channel',  label: '매출 채널',    xLabel: '채널' },
  { value: 'month',    label: '월별 추이',     xLabel: '월' },
  { value: 'segment',  label: '고객 세그먼트', xLabel: '세그먼트' },
  { value: 'stage',    label: '딜 단계',       xLabel: '단계' },
  { value: 'category', label: '상품 카테고리', xLabel: '카테고리' },
  { value: 'reason',   label: '반품 사유',     xLabel: '사유' },
  { value: 'partner',  label: '거래처 정산',   xLabel: '거래처' },
]

const METRICS_BY_DIM: Record<string, { value: string; label: string; isCurrency: boolean }[]> = {
  channel:  [{ value: 'revenue', label: '매출액', isCurrency: true }, { value: 'count', label: '주문 수', isCurrency: false }],
  month:    [{ value: 'revenue', label: '매출액', isCurrency: true }, { value: 'count', label: '주문 수', isCurrency: false }],
  segment:  [{ value: 'count', label: '고객 수', isCurrency: false }, { value: 'avg_ltv', label: '평균 LTV', isCurrency: true }],
  stage:    [{ value: 'revenue', label: '딜 금액', isCurrency: true }, { value: 'count', label: '딜 건수', isCurrency: false }],
  category: [{ value: 'count', label: '상품 수', isCurrency: false }],
  reason:   [{ value: 'count', label: '건수', isCurrency: false }, { value: 'refund', label: '환불액', isCurrency: true }],
  partner:  [{ value: 'revenue', label: '정산액', isCurrency: true }, { value: 'count', label: '정산 건수', isCurrency: false }],
}

const CHART_TYPES = [
  { value: 'bar',   label: '막대' },
  { value: 'line',  label: '라인' },
  { value: 'area',  label: '영역' },
  { value: 'pie',   label: '파이' },
  { value: 'donut', label: '도넛' },
]

interface ChartConfig {
  id: string
  title: string
  dimension: string
  metric: string
  chartType: string
  period: string
}

interface DataPoint { label: string; value: number }

const CHART_STORAGE_KEY = 'flowit_bi_charts'
const PAID = ['PAID', 'SHIPPED', 'DELIVERED']

function loadSavedCharts(): ChartConfig[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(CHART_STORAGE_KEY) ?? '[]') } catch { return [] }
}

function isCurrencyMetric(dimension: string, metric: string): boolean {
  return METRICS_BY_DIM[dimension]?.find(m => m.value === metric)?.isCurrency ?? false
}

// ─── Chart Renderer ──────────────────────────────────────────────────────────
function ChartRenderer({ data, chartType, isCurrency }: { data: DataPoint[]; chartType: string; isCurrency: boolean }) {
  const fmt = (v: number) => isCurrency ? formatKRW(v) : v.toLocaleString()
  const tickFmt = (v: number) => isCurrency
    ? (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}K` : String(v))
    : v.toLocaleString()

  if (chartType === 'pie' || chartType === 'donut') {
    const total = data.reduce((s, d) => s + d.value, 0)
    return (
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            outerRadius={90}
            innerRadius={chartType === 'donut' ? 50 : 0}
            label={({ name, value }: { name?: string; value?: number }) => `${name} (${total > 0 ? Math.round((value ?? 0) / total * 100) : 0}%)`}
            labelLine
          >
            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
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
          <YAxis tick={{ fontSize: 11 }} tickFormatter={tickFmt} />
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
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={tickFmt} />
          <Tooltip formatter={(v: unknown) => fmt(Number(v))} />
          <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="url(#areaGrad)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  // Bar (default)
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={tickFmt} />
        <Tooltip formatter={(v: unknown) => fmt(Number(v))} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Single Saved Chart Card ──────────────────────────────────────────────────
function SavedChartCard({ config, onDelete }: { config: ChartConfig; onDelete: () => void }) {
  const [data, setData] = useState<DataPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/bi?type=flex&dimension=${config.dimension}&metric=${config.metric}&period=${config.period}`)
      .then(r => r.json())
      .then(d => setData(d.data ?? []))
      .finally(() => setLoading(false))
  }, [config.dimension, config.metric, config.period])

  const dimLabel = DIMENSIONS.find(d => d.value === config.dimension)?.label ?? config.dimension
  const metricLabel = METRICS_BY_DIM[config.dimension]?.find(m => m.value === config.metric)?.label ?? config.metric
  const isCurrency = isCurrencyMetric(config.dimension, config.metric)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{config.title || `${dimLabel} × ${metricLabel}`}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{dimLabel} · {metricLabel} · {CHART_TYPES.find(c => c.value === config.chartType)?.label}</p>
        </div>
        <button onClick={onDelete} className="text-gray-300 hover:text-red-400 p-1 rounded">
          <Trash2 size={14} />
        </button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 size={20} className="animate-spin text-gray-300" />
        </div>
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-sm text-gray-400">데이터 없음</div>
      ) : (
        <ChartRenderer data={data} chartType={config.chartType} isCurrency={isCurrency} />
      )}
    </div>
  )
}

// ─── Custom Chart Builder ─────────────────────────────────────────────────────
function CustomTab() {
  const [savedCharts, setSavedCharts] = useState<ChartConfig[]>([])
  const [showBuilder, setShowBuilder] = useState(true)
  const [dimension, setDimension] = useState('channel')
  const [metric, setMetric] = useState('revenue')
  const [chartType, setChartType] = useState('bar')
  const [period, setPeriod] = useState('monthly')
  const [title, setTitle] = useState('')
  const [previewData, setPreviewData] = useState<DataPoint[]>([])
  const [previewing, setPreviewing] = useState(false)
  const [hasPreview, setHasPreview] = useState(false)

  useEffect(() => { setSavedCharts(loadSavedCharts()) }, [])

  // When dimension changes, reset metric to first option
  useEffect(() => {
    const opts = METRICS_BY_DIM[dimension]
    if (opts && !opts.find(m => m.value === metric)) {
      setMetric(opts[0].value)
    }
  }, [dimension, metric])

  const fetchPreview = useCallback(async () => {
    setPreviewing(true); setHasPreview(false)
    try {
      const r = await fetch(`/api/bi?type=flex&dimension=${dimension}&metric=${metric}&period=${period}`)
      const d = await r.json()
      setPreviewData(d.data ?? [])
      setHasPreview(true)
    } finally { setPreviewing(false) }
  }, [dimension, metric, period])

  function saveChart() {
    if (!hasPreview || previewData.length === 0) return
    const config: ChartConfig = {
      id: Date.now().toString(),
      title,
      dimension,
      metric,
      chartType,
      period,
    }
    const next = [...savedCharts, config]
    setSavedCharts(next)
    localStorage.setItem(CHART_STORAGE_KEY, JSON.stringify(next))
    setTitle('')
    setHasPreview(false)
  }

  function deleteChart(id: string) {
    const next = savedCharts.filter(c => c.id !== id)
    setSavedCharts(next)
    localStorage.setItem(CHART_STORAGE_KEY, JSON.stringify(next))
  }

  const currentMetrics = METRICS_BY_DIM[dimension] ?? []
  const currentIsCurrency = isCurrencyMetric(dimension, metric)

  return (
    <div className="space-y-6">
      {/* Builder Panel */}
      <div className="bg-white rounded-xl border border-gray-200">
        <button
          onClick={() => setShowBuilder(p => !p)}
          className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-gray-900"
        >
          <span className="flex items-center gap-2"><BarChart2 size={16} className="text-blue-600" /> 차트 빌더</span>
          {showBuilder ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showBuilder && (
          <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">X축 (데이터 기준)</label>
                <select value={dimension} onChange={e => setDimension(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {DIMENSIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Y축 (측정 항목)</label>
                <select value={metric} onChange={e => setMetric(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {currentMetrics.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">차트 유형</label>
                <div className="flex gap-1 flex-wrap">
                  {CHART_TYPES.map(ct => (
                    <button key={ct.value} onClick={() => setChartType(ct.value)}
                      className={`px-2.5 py-1.5 text-xs rounded-md border transition-colors ${chartType === ct.value ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-400'}`}>
                      {ct.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">기간</label>
                <select value={period} onChange={e => setPeriod(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input value={title} onChange={e => setTitle(e.target.value)}
                placeholder="차트 제목 (선택)"
                className="flex-1 max-w-xs px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button onClick={fetchPreview} disabled={previewing}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-800 text-white text-sm rounded-md hover:bg-gray-700 disabled:opacity-50">
                {previewing && <Loader2 size={13} className="animate-spin" />}
                미리보기
              </button>
              <button onClick={saveChart} disabled={!hasPreview || previewData.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-40">
                <Plus size={14} /> 차트 저장
              </button>
            </div>

            {hasPreview && (
              <div className="border border-gray-100 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-3 font-medium">미리보기</p>
                {previewData.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">데이터가 없습니다</p>
                ) : (
                  <ChartRenderer data={previewData} chartType={chartType} isCurrency={currentIsCurrency} />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Saved Charts Grid */}
      {savedCharts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <BarChart2 size={36} className="mx-auto mb-3 text-gray-200" />
          <p className="text-sm">저장된 차트가 없습니다. 차트 빌더로 만들어보세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {savedCharts.map(config => (
            <SavedChartCard key={config.id} config={config} onDelete={() => deleteChart(config.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main BI Page ─────────────────────────────────────────────────────────────
type SalesData = { byChannel: { channel: string; _sum: { totalAmount: string }; _count: { id: number } }[] }
type CustomerData = { total: number; active: number; vip: number; churnRisk: number; avgLtv: string }
type MarketingData = { totalSent: number; openRate: number; conversionRate: number; revenue: string }
type ScmData = { expiringSkus: { name: string; lotExpiry: string; inventory: { qtyAvailable: number }[] }[] }

export default function BiPage() {
  const [period, setPeriod] = useState('monthly')
  const [activeTab, setActiveTab] = useState('sales')
  const [salesData, setSalesData] = useState<SalesData | null>(null)
  const [salesMonthly, setSalesMonthly] = useState<DataPoint[]>([])
  const [customerData, setCustomerData] = useState<CustomerData | null>(null)
  const [marketingData, setMarketingData] = useState<MarketingData | null>(null)
  const [scmData, setScmData] = useState<ScmData | null>(null)

  useEffect(() => {
    fetch(`/api/bi?type=sales&period=${period}`).then(r => r.json()).then(d => setSalesData(d.data))
    fetch(`/api/bi?type=customers`).then(r => r.json()).then(d => setCustomerData(d.data))
    fetch(`/api/bi?type=marketing&period=${period}`).then(r => r.json()).then(d => setMarketingData(d.data))
    fetch(`/api/bi?type=scm`).then(r => r.json()).then(d => setScmData(d.data))
    fetch(`/api/bi?type=flex&dimension=month&metric=revenue`).then(r => r.json()).then(d => setSalesMonthly(d.data ?? []))
  }, [period])

  const totalRevenue = salesData?.byChannel?.reduce((s, c) => s + Number(c._sum.totalAmount ?? 0), 0) ?? 0
  const totalOrders = salesData?.byChannel?.reduce((s, c) => s + c._count.id, 0) ?? 0
  const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0

  const TABS = [
    { value: 'sales', label: '매출' },
    { value: 'customers', label: '고객' },
    { value: 'marketing', label: '마케팅' },
    { value: 'scm', label: 'SCM' },
    { value: 'custom', label: '커스텀 차트' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-lg font-semibold text-gray-900">BI 대시보드</h1>
        <div className="flex items-center gap-2">
          {PERIODS.map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${period === p.value ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit flex-wrap">
        {TABS.map(tab => (
          <button key={tab.value} onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${activeTab === tab.value ? 'bg-white shadow-sm text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-800'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── 매출 탭 ── */}
      {activeTab === 'sales' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="총 매출" value={formatKRW(totalRevenue)} sub={`${PERIODS.find(p => p.value === period)?.label} 기준`} />
            <KpiCard label="총 주문 수" value={totalOrders.toLocaleString()} sub="건" />
            <KpiCard label="평균 주문액" value={formatKRW(avgOrder)} sub="주문당" />
            <KpiCard label="채널 수" value={String(salesData?.byChannel?.length ?? 0)} sub="활성 채널" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {salesData?.byChannel && salesData.byChannel.length > 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">채널별 매출</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={salesData.byChannel}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="channel" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${(Number(v) / 1_000_000).toFixed(0)}M`} />
                    <Tooltip formatter={(v: unknown) => formatKRW(Number(v))} />
                    <Bar dataKey="_sum.totalAmount" radius={[4, 4, 0, 0]}>
                      {salesData.byChannel.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyState message="채널별 매출 데이터 없음" />}

            {salesMonthly.length > 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">월별 매출 추이</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={salesMonthly}>
                    <defs>
                      <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(Number(v) / 1_000_000).toFixed(0)}M`} />
                    <Tooltip formatter={(v: unknown) => formatKRW(Number(v))} />
                    <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="url(#salesGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyState message="월별 데이터 없음" />}
          </div>

          {salesData?.byChannel && salesData.byChannel.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">채널별 매출 비중</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={salesData.byChannel.map(c => ({ label: c.channel, value: Number(c._sum.totalAmount ?? 0) }))}
                    dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={85} innerRadius={45}
                    label={({ name, percent }: { name?: string; percent?: number }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                    {salesData.byChannel.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: unknown) => formatKRW(Number(v))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ── 고객 탭 ── */}
      {activeTab === 'customers' && customerData && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="전체 고객" value={(customerData.total ?? 0).toLocaleString()} />
            <KpiCard label="활성 고객" value={(customerData.active ?? 0).toLocaleString()} />
            <KpiCard label="VIP" value={(customerData.vip ?? 0).toLocaleString()} sub={`${customerData.total > 0 ? ((customerData.vip / customerData.total) * 100).toFixed(1) : 0}%`} />
            <KpiCard label="이탈 위험" value={(customerData.churnRisk ?? 0).toLocaleString()} danger />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">평균 LTV</h3>
            <p className="text-3xl font-bold text-blue-700">{formatKRW(Number(customerData.avgLtv ?? 0))}</p>
          </div>
        </div>
      )}

      {/* ── 마케팅 탭 ── */}
      {activeTab === 'marketing' && marketingData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="총 발송 수" value={(marketingData.totalSent ?? 0).toLocaleString()} />
          <KpiCard label="오픈율" value={`${((marketingData.openRate ?? 0) * 100).toFixed(1)}%`} />
          <KpiCard label="전환율" value={`${((marketingData.conversionRate ?? 0) * 100).toFixed(1)}%`} />
          <KpiCard label="기여 매출" value={formatKRW(Number(marketingData.revenue ?? 0))} />
        </div>
      )}

      {/* ── SCM 탭 ── */}
      {activeTab === 'scm' && scmData && (
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
                const totalQty = sku.inventory.reduce((s, inv) => s + inv.qtyAvailable, 0)
                const days = Math.ceil((new Date(sku.lotExpiry).getTime() - Date.now()) / 86400000)
                return (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="px-4 py-3 text-gray-900">{sku.name}</td>
                    <td className="px-4 py-3">
                      <span className={days <= 7 ? 'text-red-600 font-medium' : days <= 30 ? 'text-orange-600' : 'text-gray-500'}>
                        {new Date(sku.lotExpiry).toLocaleDateString('ko-KR')} (D-{days})
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{totalQty.toLocaleString()}</td>
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

      {/* ── 커스텀 차트 탭 ── */}
      {activeTab === 'custom' && <CustomTab />}
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

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 flex items-center justify-center h-40 text-sm text-gray-400">
      {message}
    </div>
  )
}
