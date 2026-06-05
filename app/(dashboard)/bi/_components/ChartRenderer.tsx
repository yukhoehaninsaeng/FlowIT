'use client'

import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ComposedChart, ReferenceLine, ScatterChart, Scatter, ZAxis,
  FunnelChart, Funnel, LabelList, Treemap, RadialBarChart, RadialBar, PolarAngleAxis,
} from 'recharts'
import { formatKRW } from '@/lib/utils'
import { CHART_COLORS, getChannelColor } from './chartTypes'

// Rule 12: 숫자 단위 축약 (라벨용)
function fmtLabel(v: number, isCur: boolean): string {
  if (isCur) {
    if (v >= 1e8) return `${(v / 1e8).toFixed(1)}억`
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
    if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`
    return v.toLocaleString()
  }
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`
  return v.toLocaleString()
}

export interface DataPoint {
  label: string
  value: number
  value2?: number
  [key: string]: string | number | undefined
}

interface Props {
  data: DataPoint[]
  chartType: string
  isCurrency?: boolean
  isCurrency2?: boolean
  label1?: string
  label2?: string
  height?: number
  series?: string[]
}

function mkTick(isCur: boolean) {
  return (v: number) => isCur
    ? (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : String(v))
    : v.toLocaleString()
}

export function ChartRenderer({
  data, chartType,
  isCurrency = false, isCurrency2 = false,
  label1 = '값1', label2 = '값2',
  height = 300,
  series,
}: Props) {
  const fmt1 = (v: number) => isCurrency  ? formatKRW(v) : v.toLocaleString()
  const fmt2 = (v: number) => isCurrency2 ? formatKRW(v) : v.toLocaleString()
  const tf1 = mkTick(isCurrency)
  const tf2 = mkTick(isCurrency2)
  const ttFmt = (v: unknown, name: unknown) => {
    const n = Number(v), s = String(name)
    return [s === 'value' || s === label1 ? fmt1(n) : fmt2(n), s === 'value' ? label1 : s === 'value2' ? label2 : s]
  }
  const lgFmt = (v: string) => v === 'value' ? label1 : v === 'value2' ? label2 : v

  /* ── N-Series Line (channel_trend) — Rule 11 채널 고정 색상 ── */
  if (series && series.length > 0) {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={mkTick(isCurrency)} />
          <Tooltip formatter={(v: unknown, name: unknown) => [isCurrency ? formatKRW(Number(v)) : Number(v).toLocaleString(), String(name)]} />
          <Legend />
          {series.map((key, i) => (
            <Line key={key} type="monotone" dataKey={key}
              stroke={getChannelColor(key, i)}
              strokeWidth={2} dot={{ r: 3 }} name={key} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    )
  }

  /* ── Funnel ────────────────────────────────────────────────── */
  if (chartType === 'funnel') {
    const funnelData = data.map((d, i) => ({ ...d, fill: CHART_COLORS[i % CHART_COLORS.length], name: d.label }))
    return (
      <ResponsiveContainer width="100%" height={height}>
        <FunnelChart>
          <Tooltip formatter={(v: unknown) => fmt1(Number(v))} />
          <Funnel dataKey="value" data={funnelData} isAnimationActive>
            <LabelList position="center" fill="#fff" stroke="none" dataKey="label" style={{ fontSize: 12, fontWeight: 600 }} />
            <LabelList position="right" fill="#374151" stroke="none" dataKey="value" formatter={(v: unknown) => fmt1(Number(v))} style={{ fontSize: 11 }} />
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    )
  }

  /* ── Treemap ───────────────────────────────────────────────── */
  if (chartType === 'treemap') {
    const tmData = data.map((d, i) => ({ name: d.label, size: d.value, fill: CHART_COLORS[i % CHART_COLORS.length] }))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const CustomContent = (props: any) => {
      const { x, y, width, height: h, name, value } = props
      if (!width || !h || width < 30 || h < 20) return null
      return (
        <g>
          <rect x={x} y={y} width={width} height={h} fill={props.fill} rx={4} />
          <text x={x + 8} y={y + 18} fill="#fff" fontSize={Math.min(13, width / 5)} fontWeight={600} className="select-none">{name}</text>
          {h > 36 && <text x={x + 8} y={y + 34} fill="rgba(255,255,255,0.8)" fontSize={Math.min(11, width / 6)}>{isCurrency ? formatKRW(value) : value?.toLocaleString()}</text>}
        </g>
      )
    }
    return (
      <ResponsiveContainer width="100%" height={height}>
        <Treemap data={tmData} dataKey="size" aspectRatio={4 / 3} content={<CustomContent />}>
          <Tooltip formatter={(v: unknown) => fmt1(Number(v))} />
        </Treemap>
      </ResponsiveContainer>
    )
  }

  /* ── Radial Bar ────────────────────────────────────────────── */
  if (chartType === 'radial') {
    const max = Math.max(...data.map(d => d.value), 1)
    const radialData = data.map((d, i) => ({ ...d, name: d.label, fill: CHART_COLORS[i % CHART_COLORS.length], pct: Math.round(d.value / max * 100) }))
    return (
      <ResponsiveContainer width="100%" height={height}>
        <RadialBarChart innerRadius="20%" outerRadius="90%" data={radialData} startAngle={90} endAngle={-270}>
          <PolarAngleAxis type="number" domain={[0, max]} tick={false} />
          <RadialBar dataKey="value" background={{ fill: '#f3f4f6' }} cornerRadius={4} label={{ position: 'insideStart', fill: '#fff', fontSize: 11 }} />
          <Tooltip formatter={(v: unknown) => fmt1(Number(v))} />
          <Legend iconType="circle" formatter={lgFmt} />
        </RadialBarChart>
      </ResponsiveContainer>
    )
  }

  /* ── Scatter (value = X, value2 = Y) ──────────────────────── */
  if (chartType === 'scatter') {
    const scatterData = data.map(d => ({ x: d.value, y: d.value2 ?? 0, z: 1, label: d.label }))
    return (
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis type="number" dataKey="x" name={label1} tick={{ fontSize: 11 }} tickFormatter={tf1} label={{ value: label1, position: 'bottom', fontSize: 11 }} />
          <YAxis type="number" dataKey="y" name={label2} tick={{ fontSize: 11 }} tickFormatter={tf2} label={{ value: label2, angle: -90, position: 'insideLeft', fontSize: 11 }} />
          <ZAxis type="number" dataKey="z" range={[60, 60]} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ payload }) => {
            if (!payload?.length) return null
            const d = payload[0]?.payload
            return (
              <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs shadow">
                <p className="font-medium text-gray-800 mb-1">{d?.label}</p>
                <p>{label1}: {fmt1(d?.x)}</p>
                <p>{label2}: {fmt2(d?.y)}</p>
              </div>
            )
          }} />
          <Scatter data={scatterData} fill={CHART_COLORS[0]} />
        </ScatterChart>
      </ResponsiveContainer>
    )
  }

  /* ── Pie / Donut ───────────────────────────────────────────── */
  if (chartType === 'pie' || chartType === 'donut') {
    const RMIN_LABEL = 5
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%"
            outerRadius={height * 0.32} innerRadius={chartType === 'donut' ? height * 0.17 : 0}
            label={({ percent }) => (percent ?? 0) * 100 >= RMIN_LABEL ? `${((percent ?? 0) * 100).toFixed(0)}%` : ''}
            labelLine={false}>
            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v: unknown, name: unknown) => [fmt1(Number(v)), String(name)]} />
          <Legend formatter={(v: string) => v} wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  /* ── Horizontal Bar ────────────────────────────────────────── */
  if (chartType === 'bar_h') {
    const showLbl = data.length <= 10
    return (
      <ResponsiveContainer width="100%" height={Math.max(height, data.length * 36 + 40)}>
        <BarChart data={data} layout="vertical" margin={{ right: showLbl ? 52 : 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={tf1} />
          <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={110} />
          <Tooltip formatter={(v: unknown) => fmt1(Number(v))} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            {showLbl && (
              <LabelList dataKey="value" position="right"
                style={{ fontSize: 10, fill: '#6b7280' }}
                formatter={(v: unknown) => fmtLabel(Number(v), isCurrency)} />
            )}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )
  }

  /* ── Grouped Bar ───────────────────────────────────────────── */
  if (chartType === 'bar_grouped') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={tf1} />
          <Tooltip formatter={ttFmt} />
          <Legend formatter={lgFmt} />
          <Bar dataKey="value"  fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} name={label1} />
          <Bar dataKey="value2" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} name={label2} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  /* ── Stacked Bar ───────────────────────────────────────────── */
  if (chartType === 'bar_stacked') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={tf1} />
          <Tooltip formatter={ttFmt} />
          <Legend formatter={lgFmt} />
          <Bar dataKey="value"  stackId="a" fill={CHART_COLORS[0]} name={label1} />
          <Bar dataKey="value2" stackId="a" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} name={label2} />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  /* ── Multi-Line ────────────────────────────────────────────── */
  if (chartType === 'line_multi') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="l" tick={{ fontSize: 11 }} tickFormatter={tf1} />
          <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} tickFormatter={tf2} />
          <Tooltip formatter={ttFmt} />
          <Legend formatter={lgFmt} />
          <ReferenceLine yAxisId="l" y={0} stroke="#d1d5db" strokeDasharray="4 4" />
          <Line yAxisId="l" type="monotone" dataKey="value"  stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 3 }} name={label1} />
          <Line yAxisId="r" type="monotone" dataKey="value2" stroke={CHART_COLORS[2]} strokeWidth={2} dot={{ r: 3 }} name={label2} />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  /* ── Combo (Bar + Line) ────────────────────────────────────── */
  if (chartType === 'combo') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="l" tick={{ fontSize: 11 }} tickFormatter={tf1} />
          <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11 }} tickFormatter={tf2} />
          <Tooltip formatter={ttFmt} />
          <Legend formatter={lgFmt} />
          <Bar  yAxisId="l" dataKey="value"  fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} name={label1} />
          <Line yAxisId="r" type="monotone" dataKey="value2" stroke={CHART_COLORS[2]} strokeWidth={2} dot={{ r: 3 }} name={label2} />
        </ComposedChart>
      </ResponsiveContainer>
    )
  }

  /* ── Line ──────────────────────────────────────────────────── */
  if (chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={tf1} />
          <Tooltip formatter={(v: unknown) => fmt1(Number(v))} />
          <ReferenceLine y={0} stroke="#d1d5db" strokeDasharray="4 4" />
          <Line type="monotone" dataKey="value" stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  /* ── Area ──────────────────────────────────────────────────── */
  if (chartType === 'area') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor={CHART_COLORS[0]} stopOpacity={0.25} />
              <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={tf1} />
          <Tooltip formatter={(v: unknown) => fmt1(Number(v))} />
          <Area type="monotone" dataKey="value" stroke={CHART_COLORS[0]} fill="url(#aGrad)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  /* ── Bar (default) ── Rule 12: 10개 이하 값 라벨 표시 ─────── */
  const showBarLbl = data.length <= 10
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={tf1} />
        <Tooltip formatter={(v: unknown) => fmt1(Number(v))} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          {showBarLbl && (
            <LabelList dataKey="value" position="top"
              style={{ fontSize: 10, fill: '#6b7280' }}
              formatter={(v: unknown) => fmtLabel(Number(v), isCurrency)} />
          )}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
