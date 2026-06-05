'use client'

import { useState, useEffect } from 'react'
import { formatKRW } from '@/lib/utils'
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { LayoutDashboard, BarChart2, Wrench } from 'lucide-react'
import { ChartBuilder } from './_components/ChartBuilder'
import { DashboardGrid } from './_components/DashboardGrid'
import type { ChartConfig } from './_components/chartTypes'
import { CHART_COLORS, CHART_STORAGE_KEY, PERIODS } from './_components/chartTypes'

// ── Helpers ───────────────────────────────────────────────────────────────────
function loadLocalCharts(): ChartConfig[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(CHART_STORAGE_KEY) ?? '[]') } catch { return [] }
}
function saveLocalCharts(charts: ChartConfig[]) {
  try { localStorage.setItem(CHART_STORAGE_KEY, JSON.stringify(charts)) } catch { /* ignore */ }
}
async function fetchDbCharts(): Promise<ChartConfig[]> {
  try {
    const r = await fetch('/api/bi/dashboard')
    if (!r.ok) return []
    const d = await r.json()
    return Array.isArray(d.charts) ? (d.charts as ChartConfig[]) : []
  } catch { return [] }
}
async function persistDbCharts(charts: ChartConfig[]) {
  try {
    await fetch('/api/bi/dashboard', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ charts }),
    })
  } catch { /* ignore */ }
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, danger }: { label: string; value: string; sub?: string; danger?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${danger ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ── Analysis Tab ─────────────────────────────────────────────────────────────
type SalesData   = { byChannel: { channel: string; _sum: { totalAmount: string }; _count: { id: number } }[] }
type CustomerData = { total: number; active: number; vip: number; churnRisk: number; avgLtv: string }
type MarketingData = { totalSent: number; openRate: number; conversionRate: number; revenue: string }
type ScmData     = { expiringSkus: { name: string; lotExpiry: string; inventory: { qtyAvailable: number }[] }[] }
type MonthPoint  = { label: string; value: number }

function AnalysisTab({ period }: { period: string }) {
  const [salesData, setSalesData]       = useState<SalesData | null>(null)
  const [salesMonthly, setSalesMonthly] = useState<MonthPoint[]>([])
  const [customerData, setCustomerData] = useState<CustomerData | null>(null)
  const [marketingData, setMarketingData] = useState<MarketingData | null>(null)
  const [scmData, setScmData]           = useState<ScmData | null>(null)
  const [subTab, setSubTab]             = useState('sales')

  useEffect(() => {
    fetch(`/api/bi?type=sales&period=${period}`).then(r => r.json()).then(d => setSalesData(d.data))
    fetch('/api/bi?type=customers').then(r => r.json()).then(d => setCustomerData(d.data))
    fetch(`/api/bi?type=marketing&period=${period}`).then(r => r.json()).then(d => setMarketingData(d.data))
    fetch('/api/bi?type=scm').then(r => r.json()).then(d => setScmData(d.data))
    fetch('/api/bi?type=flex&dimension=month&metric=revenue').then(r => r.json()).then(d => setSalesMonthly(d.data ?? []))
  }, [period])

  const totalRevenue = salesData?.byChannel?.reduce((s, c) => s + Number(c._sum.totalAmount ?? 0), 0) ?? 0
  const totalOrders  = salesData?.byChannel?.reduce((s, c) => s + c._count.id, 0) ?? 0

  const SUB_TABS = [
    { value: 'sales',     label: '매출' },
    { value: 'customers', label: '고객' },
    { value: 'marketing', label: '마케팅' },
    { value: 'scm',       label: 'SCM' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {SUB_TABS.map(t => (
          <button key={t.value} onClick={() => setSubTab(t.value)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${subTab === t.value ? 'bg-white shadow-sm text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-800'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── 매출 ── */}
      {subTab === 'sales' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="총 매출" value={formatKRW(totalRevenue)} sub={PERIODS.find(p => p.value === period)?.label} />
            <KpiCard label="총 주문" value={totalOrders.toLocaleString()} sub="건" />
            <KpiCard label="평균 주문액" value={formatKRW(totalOrders > 0 ? totalRevenue / totalOrders : 0)} sub="주문당" />
            <KpiCard label="채널 수" value={String(salesData?.byChannel?.length ?? 0)} sub="활성" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {salesData?.byChannel && salesData.byChannel.length > 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">채널별 매출</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={salesData.byChannel}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="channel" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${(Number(v)/1e6).toFixed(0)}M`} />
                    <Tooltip formatter={(v: unknown) => formatKRW(Number(v))} />
                    <Bar dataKey="_sum.totalAmount" radius={[4, 4, 0, 0]}>
                      {salesData.byChannel.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <div className="bg-white rounded-xl border border-gray-200 flex items-center justify-center h-40 text-sm text-gray-400">채널 데이터 없음</div>}

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
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(Number(v)/1e6).toFixed(0)}M`} />
                    <Tooltip formatter={(v: unknown) => formatKRW(Number(v))} />
                    <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="url(#sGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : <div className="bg-white rounded-xl border border-gray-200 flex items-center justify-center h-40 text-sm text-gray-400">월별 데이터 없음</div>}
          </div>

          {salesData?.byChannel && salesData.byChannel.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">채널별 매출 비중</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={salesData.byChannel.map(c => ({ label: c.channel, value: Number(c._sum.totalAmount ?? 0) }))}
                    dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={85} innerRadius={45}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
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

      {/* ── 고객 ── */}
      {subTab === 'customers' && customerData && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard label="전체 고객" value={(customerData.total ?? 0).toLocaleString()} />
            <KpiCard label="활성 고객" value={(customerData.active ?? 0).toLocaleString()} />
            <KpiCard label="VIP" value={(customerData.vip ?? 0).toLocaleString()} sub={`${customerData.total > 0 ? ((customerData.vip / customerData.total) * 100).toFixed(1) : 0}%`} />
            <KpiCard label="이탈 위험" value={(customerData.churnRisk ?? 0).toLocaleString()} danger />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs text-gray-500 mb-1">평균 LTV</p>
            <p className="text-3xl font-bold text-blue-700">{formatKRW(Number(customerData.avgLtv ?? 0))}</p>
          </div>
        </div>
      )}

      {/* ── 마케팅 ── */}
      {subTab === 'marketing' && marketingData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="총 발송 수" value={(marketingData.totalSent ?? 0).toLocaleString()} />
          <KpiCard label="오픈율" value={`${((marketingData.openRate ?? 0) * 100).toFixed(1)}%`} />
          <KpiCard label="전환율" value={`${((marketingData.conversionRate ?? 0) * 100).toFixed(1)}%`} />
          <KpiCard label="기여 매출" value={formatKRW(Number(marketingData.revenue ?? 0))} />
        </div>
      )}

      {/* ── SCM ── */}
      {subTab === 'scm' && scmData && (
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
              {scmData.expiringSkus.length === 0
                ? <tr><td colSpan={3} className="text-center py-8 text-gray-400 text-sm">임박 SKU 없음</td></tr>
                : scmData.expiringSkus.map((sku, i) => {
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
                  })
              }
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BiPage() {
  const [period, setPeriod]     = useState('monthly')
  const [activeTab, setActiveTab] = useState<'analysis' | 'builder' | 'dashboard'>('analysis')
  const [charts, setCharts]     = useState<ChartConfig[]>([])
  const [dashBadge, setDashBadge] = useState(0)

  useEffect(() => {
    fetchDbCharts().then(dbCharts => {
      if (dbCharts.length > 0) {
        setCharts(dbCharts)
        saveLocalCharts(dbCharts)
      } else {
        setCharts(loadLocalCharts())
      }
    })
  }, [])

  function handleAddToDashboard(config: ChartConfig) {
    const next = [...charts, config]
    setCharts(next)
    saveLocalCharts(next)
    persistDbCharts(next)
    setDashBadge(b => b + 1)
    setActiveTab('dashboard')
  }

  function handleUpdateCharts(next: ChartConfig[]) {
    setCharts(next)
    saveLocalCharts(next)
    persistDbCharts(next)
  }

  const TABS = [
    { value: 'analysis' as const,  label: '분석',         icon: <BarChart2 size={14} /> },
    { value: 'builder'  as const,  label: '차트 빌더',    icon: <Wrench size={14} /> },
    { value: 'dashboard' as const, label: '내 대시보드',  icon: <LayoutDashboard size={14} />, badge: dashBadge },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-lg font-semibold text-gray-900">BI 대시보드</h1>
        {activeTab === 'analysis' && (
          <div className="flex items-center gap-1">
            {PERIODS.map(p => (
              <button key={p.value} onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${period === p.value ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(tab => (
          <button key={tab.value} onClick={() => { setActiveTab(tab.value); if (tab.value === 'dashboard') setDashBadge(0) }}
            className={`relative flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg transition-colors ${
              activeTab === tab.value ? 'bg-white shadow-sm text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-800'
            }`}>
            {tab.icon}
            {tab.label}
            {(tab.badge ?? 0) > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white text-[10px] rounded-full flex items-center justify-center">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'analysis'  && <AnalysisTab period={period} />}
      {activeTab === 'builder'   && <ChartBuilder onAddToDashboard={handleAddToDashboard} />}
      {activeTab === 'dashboard' && (
        <DashboardGrid charts={charts} onUpdate={handleUpdateCharts} />
      )}
    </div>
  )
}
