'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatKRW, cn } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, Users, CreditCard, AlertCircle, Settings, Eye, EyeOff, GripVertical, CheckCircle, BarChart2 } from 'lucide-react'
import { DndContext, DragEndEvent, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useModules } from '@/lib/hooks/useModules'
import { MODULE_REGISTRY, CATEGORY_LABELS, type ModuleCategory } from '@/lib/modules/registry'
import { usePathname } from 'next/navigation'
import { ChartRenderer } from '@/app/(dashboard)/bi/_components/ChartRenderer'
import type { ChartConfig } from '@/app/(dashboard)/bi/_components/chartTypes'
import { HEIGHT_PX, COL_SPAN_CLASSES } from '@/app/(dashboard)/bi/_components/chartTypes'

// ── 위젯 정의 ──────────────────────────────────────────────────
const WIDGET_DEFS = [
  { id: 'kpi',             label: 'KPI 지표',       description: '매출·고객·LTV·이탈위험' },
  { id: 'pipeline',        label: '영업 파이프라인', description: '딜 단계별 현황' },
  { id: 'sales_chart',     label: '채널별 매출',     description: '채널 분포 차트' },
  { id: 'segment_chart',   label: '고객 세그먼트',   description: '세그먼트 현황' },
  { id: 'recent_activity', label: '최근 활동',       description: '시스템 활동 로그' },
  { id: 'bi_charts',       label: 'BI 차트',         description: 'BI 대시보드에서 만든 차트' },
]

type WidgetConfig = { id: string; enabled: boolean }
const STORAGE_KEY = 'flowit_dash_widgets'

function loadConfig(): WidgetConfig[] {
  try {
    if (typeof window === 'undefined') return WIDGET_DEFS.map(w => ({ id: w.id, enabled: true }))
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const saved: WidgetConfig[] = JSON.parse(raw)
      const existing = saved.filter(s => WIDGET_DEFS.some(w => w.id === s.id))
      const newOnes = WIDGET_DEFS.filter(w => !saved.some(s => s.id === w.id)).map(w => ({ id: w.id, enabled: true }))
      return [...existing, ...newOnes]
    }
  } catch { /* ignore */ }
  return WIDGET_DEFS.map(w => ({ id: w.id, enabled: true }))
}

function saveConfig(cfg: WidgetConfig[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)) } catch { /* ignore */ }
}

// ── 데이터 인터페이스 ──────────────────────────────────────────
interface KpiData {
  byChannel: { channel: string; _sum: { totalAmount: string }; _count: { id: number } }[]
}
interface CustomerKpi { total: number; active: number; vip: number; churnRisk: number; avgLtv: string | null }
interface AuditLog { id: string; action: string; resource: string; user: { name: string }; createdAt: string }
interface DealSummary { stage: string; count: number; totalAmount: number }

// ── 모바일 메뉴 그리드 ─────────────────────────────────────────
const CATEGORY_ORDER: ModuleCategory[] = ['core', 'master', 'sales', 'marketing', 'logistics', 'analytics']
const CATEGORY_COLORS: Record<string, string> = {
  core: 'bg-blue-600', master: 'bg-purple-600', sales: 'bg-green-600',
  marketing: 'bg-orange-500', logistics: 'bg-cyan-600', analytics: 'bg-indigo-600',
}

function MobileMenuGrid() {
  const { modules } = useModules()
  const pathname = usePathname()
  const nonDashboard = modules.filter(m => m.key !== 'dashboard')
  const grouped = CATEGORY_ORDER.reduce<Record<string, typeof nonDashboard>>((acc, cat) => {
    const items = nonDashboard.filter(m => MODULE_REGISTRY.find(d => d.key === m.key)?.category === cat)
    if (items.length) acc[cat] = items
    return acc
  }, {})

  return (
    <div className="space-y-6 pb-4">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">메뉴</h1>
        <p className="text-xs text-gray-400 mt-0.5">{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>
      {CATEGORY_ORDER.map(cat => {
        const items = grouped[cat]
        if (!items?.length) return null
        const color = CATEGORY_COLORS[cat] ?? 'bg-gray-600'
        return (
          <div key={cat}>
            <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">{CATEGORY_LABELS[cat]}</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-3">
              {items.map(({ key, href, label }) => {
                const def = MODULE_REGISTRY.find(d => d.key === key)
                const Icon = def?.icon
                const active = pathname === href || pathname.startsWith(href + '/')
                return (
                  <Link key={key} href={href}
                    className={cn(
                      'flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border transition-all',
                      active ? 'border-blue-400 bg-blue-50' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    )}>
                    <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center', color)}>
                      {Icon && <Icon size={20} className="text-white" />}
                    </div>
                    <span className="text-[11px] text-gray-700 text-center leading-tight font-medium">{label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────
export default function DashboardClient() {
  const [salesData, setSalesData] = useState<KpiData | null>(null)
  const [customerData, setCustomerData] = useState<CustomerKpi | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [dealSummary, setDealSummary] = useState<DealSummary[]>([])
  const [editMode, setEditMode] = useState(false)
  const [widgets, setWidgets] = useState<WidgetConfig[]>([])
  const [saved, setSaved] = useState(false)

  useEffect(() => { setWidgets(loadConfig()) }, [])

  useEffect(() => {
    fetch('/api/bi?type=sales&period=monthly').then(r => r.json()).then(d => setSalesData(d.data))
    fetch('/api/bi?type=customers').then(r => r.json()).then(d => setCustomerData(d.data))
    fetch('/api/admin/audit-logs?limit=8').then(r => r.json()).then(d => setAuditLogs(d.data ?? []))
    fetch('/api/deals').then(r => r.json()).then(d => {
      const deals: Array<{ stage: string; amount: string }> = d.data ?? []
      const stageMap: Record<string, { count: number; total: number }> = {}
      for (const deal of deals) {
        if (!stageMap[deal.stage]) stageMap[deal.stage] = { count: 0, total: 0 }
        stageMap[deal.stage].count++
        stageMap[deal.stage].total += Number(deal.amount)
      }
      setDealSummary(Object.entries(stageMap).map(([stage, v]) => ({ stage, count: v.count, totalAmount: v.total })))
    })
  }, [])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setWidgets(prev => {
      const oldIdx = prev.findIndex(w => w.id === active.id)
      const newIdx = prev.findIndex(w => w.id === over.id)
      return arrayMove(prev, oldIdx, newIdx)
    })
  }

  function toggleWidget(id: string) {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w))
  }

  function handleSave() {
    saveConfig(widgets)
    setEditMode(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const totalRevenue = salesData?.byChannel?.reduce((s, c) => s + Number(c._sum.totalAmount ?? 0), 0) ?? 0
  const totalPipeline = dealSummary.filter(d => d.stage !== 'CLOSED').reduce((s, d) => s + d.totalAmount, 0)

  const STAGE_LABEL: Record<string, string> = { LEAD: '잠재', MEETING: '미팅', QUOTE: '견적', REVIEW: '검토', CLOSED: '성사' }
  const STAGE_COLOR: Record<string, string> = {
    LEAD: 'bg-gray-100', MEETING: 'bg-blue-100', QUOTE: 'bg-yellow-100', REVIEW: 'bg-orange-100', CLOSED: 'bg-green-100'
  }

  const orderedWidgets = widgets.length > 0 ? widgets : WIDGET_DEFS.map(w => ({ id: w.id, enabled: true }))

  return (
    <div>
      {/* 모바일: 메뉴 그리드 */}
      <div className="lg:hidden">
        <MobileMenuGrid />
      </div>

      {/* 데스크톱: 대시보드 */}
      <div className="hidden lg:block">

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">대시보드</h1>
          <p className="text-xs text-gray-400 mt-0.5">{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <CheckCircle size={13} /> 저장됨
            </span>
          )}
          {editMode ? (
            <>
              <button onClick={handleSave}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700">
                저장
              </button>
              <button onClick={() => { setWidgets(loadConfig()); setEditMode(false) }}
                className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900">취소</button>
            </>
          ) : (
            <button onClick={() => setEditMode(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-md hover:bg-gray-50">
              <Settings size={13} /> 편집
            </button>
          )}
        </div>
      </div>

      {/* 편집 모드 패널 */}
      {editMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
          <p className="text-xs font-medium text-blue-800 mb-3">드래그로 순서 변경 · 눈 아이콘으로 표시/숨김</p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={orderedWidgets.map(w => w.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1.5">
                {orderedWidgets.map(w => {
                  const def = WIDGET_DEFS.find(d => d.id === w.id)
                  if (!def) return null
                  return <SortableWidgetRow key={w.id} widget={w} def={def} onToggle={toggleWidget} />
                })}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* 위젯 렌더링 */}
      <div className="space-y-5">
        {orderedWidgets.filter(w => w.enabled).map(w => {
          switch (w.id) {
            case 'kpi': return (
              <div key="kpi" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="이번달 총 매출" value={formatKRW(totalRevenue)} icon={<CreditCard size={20} className="text-blue-600" />} bg="bg-blue-50" />
                <KpiCard label="활성 고객 수" value={(customerData?.active ?? 0).toLocaleString()} icon={<Users size={20} className="text-green-600" />} bg="bg-green-50" />
                <KpiCard label="평균 LTV" value={formatKRW(Number(customerData?.avgLtv ?? 0))} icon={<TrendingUp size={20} className="text-purple-600" />} bg="bg-purple-50" />
                <KpiCard label="이탈 위험 고객" value={(customerData?.churnRisk ?? 0).toLocaleString()} icon={<AlertCircle size={20} className="text-red-600" />} bg="bg-red-50" />
              </div>
            )
            case 'pipeline': return (
              <div key="pipeline" className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-900">영업 파이프라인</h2>
                  <span className="text-xs text-gray-400">예상 매출 {formatKRW(totalPipeline)}</span>
                </div>
                {dealSummary.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
                    {['LEAD','MEETING','QUOTE','REVIEW','CLOSED'].map(stage => {
                      const s = dealSummary.find(d => d.stage === stage)
                      return (
                        <div key={stage} className={`${STAGE_COLOR[stage]} rounded-lg p-3`}>
                          <p className="text-xs font-medium text-gray-600">{STAGE_LABEL[stage]}</p>
                          <p className="text-2xl font-bold text-gray-900 mt-1">{s?.count ?? 0}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{formatKRW(s?.totalAmount ?? 0)}</p>
                        </div>
                      )
                    })}
                  </div>
                ) : <EmptyState message="진행 중인 딜이 없습니다" />}
              </div>
            )
            case 'sales_chart': return (
              <div key="sales_chart" className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">채널별 매출</h2>
                {salesData?.byChannel && salesData.byChannel.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={salesData.byChannel}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="channel" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${(v / 1000000).toFixed(0)}M`} />
                      <Tooltip formatter={(v: unknown) => formatKRW(Number(v))} />
                      <Bar dataKey="_sum.totalAmount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyState message="매출 데이터가 없습니다" />}
              </div>
            )
            case 'segment_chart': return (
              <div key="segment_chart" className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">고객 세그먼트</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <SegmentCard label="VIP" count={customerData?.vip ?? 0} color="text-yellow-600 bg-yellow-50" />
                  <SegmentCard label="이탈 위험" count={customerData?.churnRisk ?? 0} color="text-red-600 bg-red-50" />
                  <SegmentCard label="전체 활성" count={customerData?.active ?? 0} color="text-blue-600 bg-blue-50" />
                  <SegmentCard label="전체 고객" count={customerData?.total ?? 0} color="text-gray-600 bg-gray-50" />
                </div>
              </div>
            )
            case 'recent_activity': return (
              <div key="recent_activity" className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">최근 활동</h2>
                {auditLogs.length > 0 ? (
                  <div className="space-y-2">
                    {auditLogs.map(log => (
                      <div key={log.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-blue-50 text-blue-700">{log.action}</span>
                          <span className="text-sm text-gray-700">{log.user?.name}</span>
                          <span className="text-xs text-gray-400">{log.resource}</span>
                        </div>
                        <span className="text-xs text-gray-400">{new Date(log.createdAt).toLocaleString('ko-KR')}</span>
                      </div>
                    ))}
                  </div>
                ) : <EmptyState message="활동 내역이 없습니다" />}
              </div>
            )
            case 'bi_charts': return <BiChartsWidget key="bi_charts" />
            default: return null
          }
        })}
      </div>

      </div> {/* end desktop block */}
    </div>
  )
}

// ── 서브 컴포넌트 ──────────────────────────────────────────────
function SortableWidgetRow({ widget, def, onToggle }: {
  widget: WidgetConfig
  def: { id: string; label: string; description: string }
  onToggle: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widget.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 px-3 py-2.5">
      <button {...attributes} {...listeners} className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing">
        <GripVertical size={16} />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-800">{def.label}</p>
        <p className="text-xs text-gray-400">{def.description}</p>
      </div>
      <button onClick={() => onToggle(widget.id)} className={`transition-colors ${widget.enabled ? 'text-blue-600' : 'text-gray-300'}`}>
        {widget.enabled ? <Eye size={16} /> : <EyeOff size={16} />}
      </button>
    </div>
  )
}

function KpiCard({ label, value, icon, bg }: { label: string; value: string; icon: React.ReactNode; bg: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-500">{label}</span>
        <div className={`${bg} p-2 rounded-lg`}>{icon}</div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function SegmentCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={`${color} rounded-lg p-4`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-1">{count.toLocaleString()}</p>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return <div className="flex items-center justify-center h-28 text-sm text-gray-400">{message}</div>
}

// ── BI 차트 위젯 ────────────────────────────────────────────────
function BiChartsWidget() {
  const [charts, setCharts] = useState<ChartConfig[]>([])
  const [data, setData] = useState<Record<string, { data: unknown[]; series?: string[] }>>({})

  useEffect(() => {
    fetch('/api/bi/dashboard')
      .then(r => r.json())
      .then(d => {
        const loaded: ChartConfig[] = Array.isArray(d.charts) ? d.charts : []
        setCharts(loaded)
        loaded.forEach(cfg => {
          const m2 = cfg.metric2 ? `&metric2=${cfg.metric2}` : ''
          const lim = cfg.limit ? `&limit=${cfg.limit}` : ''
          fetch(`/api/bi?type=flex&dimension=${cfg.dimension}&metric=${cfg.metric}${m2}&period=${cfg.period}${lim}`)
            .then(r => r.json())
            .then(d => setData(prev => ({ ...prev, [cfg.id]: { data: d.data ?? [], series: d.series } })))
            .catch(() => {/* ignore */})
        })
      })
      .catch(() => {/* ignore */})
  }, [])

  if (charts.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <BarChart2 size={15} className="text-blue-600" /> BI 차트
          </h2>
          <Link href="/bi" className="text-xs text-blue-600 hover:underline">차트 만들기 →</Link>
        </div>
        <EmptyState message="BI 대시보드에서 차트를 추가하면 여기에 표시됩니다" />
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <BarChart2 size={15} className="text-blue-600" /> BI 차트
        </h2>
        <Link href="/bi" className="text-xs text-blue-600 hover:underline">편집 →</Link>
      </div>
      <div className="grid grid-cols-12 gap-4">
        {charts.slice(0, 4).map(cfg => {
          const entry = data[cfg.id]
          const chartData = entry?.data ?? []
          const series   = entry?.series
          const hpx = HEIGHT_PX[cfg.height] ?? 300
          return (
            <div key={cfg.id} className={`${COL_SPAN_CLASSES[cfg.colSpan] ?? 'col-span-6'} min-w-0`}>
              {cfg.title && <p className="text-xs font-medium text-gray-600 mb-1 truncate">{cfg.title}</p>}
              {chartData.length > 0 ? (
                <ChartRenderer
                  data={chartData as Parameters<typeof ChartRenderer>[0]['data']}
                  chartType={cfg.chartType}
                  isCurrency={cfg.isCurrency}
                  isCurrency2={cfg.isCurrency2}
                  label1={cfg.metricLabel}
                  label2={cfg.metric2Label}
                  height={hpx}
                  series={series}
                />
              ) : (
                <div style={{ height: hpx }} className="flex items-center justify-center text-xs text-gray-300">
                  불러오는 중…
                </div>
              )}
            </div>
          )
        })}
      </div>
      {charts.length > 4 && (
        <p className="text-xs text-gray-400 text-center mt-3">
          +{charts.length - 4}개 차트 더 있음 · <Link href="/bi" className="text-blue-500 hover:underline">BI 대시보드에서 보기</Link>
        </p>
      )}
    </div>
  )
}
