'use client'

import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  ComposedChart, ReferenceLine,
} from 'recharts'
import { formatKRW } from '@/lib/utils'
import { CHART_COLORS } from './chartTypes'

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
  series?: string[]   // for N-series charts (channel_trend etc.)
}

function mkTick(isCur: boolean) {
  return (v: number) => isCur
    ? (v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}K` : String(v))
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
    const n = Number(v); const s = String(name)
    return [s === 'value' ? fmt1(n) : fmt2(n), s === 'value' ? label1 : label2]
  }
  const lgFmt = (v: string) => v === 'value' ? label1 : label2

  /* ── N-Series Line (channel_trend) ─────────────────────────── */
  if (series && series.length > 0) {
    const tickFmt = mkTick(isCurrency)
    const tooltipFmt = (v: unknown) => isCurrency ? formatKRW(Number(v)) : Number(v).toLocaleString()
    return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={tickFmt} />
          <Tooltip formatter={tooltipFmt} />
          <Legend />
          {series.map((key, i) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={CHART_COLORS[i % CHART_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              name={key}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    )
  }

  /* ── Pie / Donut ───────────────────────────────────────────── */
  if (chartType === 'pie' || chartType === 'donut') {
    const total = data.reduce((s, d) => s + d.value, 0)
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%"
            outerRadius={height * 0.32} innerRadius={chartType === 'donut' ? height * 0.17 : 0}
            label={({ name, value }) => `${name} (${total > 0 ? Math.round(value / total * 100) : 0}%)`} labelLine>
            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v: unknown) => fmt1(Number(v))} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  /* ── Horizontal Bar ────────────────────────────────────────── */
  if (chartType === 'bar_h') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={tf1} />
          <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={80} />
          <Tooltip formatter={(v: unknown) => fmt1(Number(v))} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
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
          <Bar dataKey="value"  fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} name="value" />
          <Bar dataKey="value2" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} name="value2" />
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
          <Bar dataKey="value"  stackId="a" fill={CHART_COLORS[0]} name="value" />
          <Bar dataKey="value2" stackId="a" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} name="value2" />
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
          <Line yAxisId="l" type="monotone" dataKey="value"  stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 3 }} name="value" />
          <Line yAxisId="r" type="monotone" dataKey="value2" stroke={CHART_COLORS[2]} strokeWidth={2} dot={{ r: 3 }} name="value2" />
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
          <Bar  yAxisId="l" dataKey="value"  fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} name="value" />
          <Line yAxisId="r" type="monotone" dataKey="value2" stroke={CHART_COLORS[2]} strokeWidth={2} dot={{ r: 3 }} name="value2" />
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
              <stop offset="5%"  stopColor={CHART_COLORS[0]} stopOpacity={0.2} />
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

  /* ── Bar (default) ─────────────────────────────────────────── */
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={tf1} />
        <Tooltip formatter={(v: unknown) => fmt1(Number(v))} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
