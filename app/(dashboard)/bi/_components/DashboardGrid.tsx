'use client'

import { useState, useEffect } from 'react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, rectSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Trash2, GripVertical, Loader2, BarChart2 } from 'lucide-react'
import { ChartRenderer, type DataPoint } from './ChartRenderer'
import type { ChartConfig } from './chartTypes'
import { CHART_TYPES, COL_SPAN_CLASSES, HEIGHT_PX } from './chartTypes'

// ── Resizable Chart Card ──────────────────────────────────────────────────────
function ChartCard({
  config, onDelete, onResize, dragListeners, dragAttributes, isDragging,
}: {
  config: ChartConfig
  onDelete: () => void
  onResize: (field: 'colSpan' | 'height', value: ChartConfig['colSpan'] | ChartConfig['height']) => void
  dragListeners?: Record<string, unknown>
  dragAttributes?: Record<string, unknown>
  isDragging?: boolean
}) {
  const [data, setData] = useState<DataPoint[]>([])
  const [series, setSeries] = useState<string[] | undefined>(config.series)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const url = `/api/bi?type=flex&dimension=${config.dimension}&metric=${config.metric}${config.metric2 ? `&metric2=${config.metric2}` : ''}&period=${config.period}`
    fetch(url).then(r => r.json()).then(d => {
      setData(d.data ?? [])
      if (d.series) setSeries(d.series)
    }).finally(() => setLoading(false))
  }, [config.dimension, config.metric, config.metric2, config.period])

  const isMulti = CHART_TYPES.find(c => c.value === config.chartType)?.multiSeries ?? false
  const chartTypeLabel = CHART_TYPES.find(c => c.value === config.chartType)?.label ?? config.chartType
  const chartH = HEIGHT_PX[config.height]

  const WIDTH_OPTS: { v: ChartConfig['colSpan']; label: string }[] = [
    { v: 3, label: '¼' }, { v: 6, label: '½' }, { v: 9, label: '¾' }, { v: 12, label: '전체' },
  ]
  const HEIGHT_OPTS: { v: ChartConfig['height']; label: string }[] = [
    { v: 'sm', label: 'S' }, { v: 'md', label: 'M' }, { v: 'lg', label: 'L' },
  ]

  return (
    <div className={`bg-white rounded-xl border border-gray-200 flex flex-col transition-opacity ${isDragging ? 'opacity-40' : ''}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <button className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0"
          {...dragListeners} {...dragAttributes}>
          <GripVertical size={14} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {config.title || `${config.dimLabel} × ${config.metricLabel}`}
          </p>
          <p className="text-xs text-gray-400">
            {config.dimLabel} · {config.metricLabel}{isMulti && config.metric2Label ? ` + ${config.metric2Label}` : ''} · {chartTypeLabel}
          </p>
        </div>
        <button onClick={onDelete} className="text-gray-300 hover:text-red-400 flex-shrink-0">
          <Trash2 size={13} />
        </button>
      </div>

      {/* Chart */}
      <div className="flex-1 px-3 pt-3 pb-1">
        {loading ? (
          <div className="flex items-center justify-center" style={{ height: chartH }}>
            <Loader2 size={20} className="animate-spin text-gray-300" />
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center text-sm text-gray-400" style={{ height: chartH }}>
            데이터 없음
          </div>
        ) : (
          <ChartRenderer
            data={data} chartType={config.chartType}
            isCurrency={config.isCurrency} isCurrency2={config.isCurrency2}
            label1={config.metricLabel} label2={config.metric2Label ?? '값2'}
            height={chartH}
            series={series}
          />
        )}
      </div>

      {/* Resize Controls */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-gray-50">
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400 mr-1">너비</span>
          {WIDTH_OPTS.map(o => (
            <button key={o.v} onClick={() => onResize('colSpan', o.v)}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${config.colSpan === o.v ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
              {o.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400 mr-1">높이</span>
          {HEIGHT_OPTS.map(o => (
            <button key={o.v} onClick={() => onResize('height', o.v)}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${config.height === o.v ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Sortable Wrapper ──────────────────────────────────────────────────────────
type BaseCardProps = {
  config: ChartConfig
  onDelete: () => void
  onResize: (field: 'colSpan' | 'height', value: ChartConfig['colSpan'] | ChartConfig['height']) => void
}

function SortableCard({ config, onDelete, onResize }: BaseCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: config.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  return (
    <div ref={setNodeRef} style={style} className={COL_SPAN_CLASSES[config.colSpan] ?? 'col-span-6'}>
      <ChartCard
        config={config} onDelete={onDelete} onResize={onResize}
        dragListeners={listeners as unknown as Record<string, unknown>}
        dragAttributes={attributes as unknown as Record<string, unknown>}
        isDragging={isDragging}
      />
    </div>
  )
}

// ── Dashboard Grid ────────────────────────────────────────────────────────────
export function DashboardGrid({
  charts, onUpdate,
}: {
  charts: ChartConfig[]
  onUpdate: (next: ChartConfig[]) => void
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (over && active.id !== over.id) {
      const oldIdx = charts.findIndex(c => c.id === active.id)
      const newIdx = charts.findIndex(c => c.id === over.id)
      onUpdate(arrayMove(charts, oldIdx, newIdx))
    }
  }

  function handleDelete(id: string) {
    onUpdate(charts.filter(c => c.id !== id))
  }

  function handleResize(id: string, field: 'colSpan' | 'height', value: ChartConfig['colSpan'] | ChartConfig['height']) {
    onUpdate(charts.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  if (charts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <BarChart2 size={40} className="mb-3 text-gray-200" />
        <p className="text-sm">저장된 차트가 없습니다.</p>
        <p className="text-xs mt-1">차트 빌더에서 차트를 만들고 대시보드에 추가하세요.</p>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={charts.map(c => c.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-12 gap-4 items-start">
          {charts.map(config => (
            <SortableCard
              key={config.id} config={config}
              onDelete={() => handleDelete(config.id)}
              onResize={(f, v) => handleResize(config.id, f, v)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
