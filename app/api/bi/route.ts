import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { prisma } from '@/lib/db'

const PAID = ['PAID', 'SHIPPED', 'DELIVERED']
const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']
const STAGE_ORDER = ['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST']

function parsePeriod(period: string): { start: Date; end: Date; granularity: 'day' | 'month'; year?: number } {
  const now = new Date()
  const y = now.getFullYear(), m = now.getMonth()
  const eod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)

  switch (period) {
    case 'this_month':
      return { start: new Date(y, m, 1), end: eod(now), granularity: 'day' }
    case 'last_month':
      return { start: new Date(y, m - 1, 1), end: eod(new Date(y, m, 0)), granularity: 'day' }
    case '6months':
      return { start: new Date(y, m - 5, 1), end: eod(new Date(y, m + 1, 0)), granularity: 'month' }
    case '1year':
      return { start: new Date(y - 1, 0, 1), end: new Date(y - 1, 11, 31, 23, 59, 59, 999), granularity: 'month', year: y - 1 }
    case 'monthly':
      return { start: new Date(y, m, 1), end: eod(now), granularity: 'day' }
    case 'quarterly':
      return { start: new Date(y, Math.floor(m / 3) * 3, 1), end: eod(now), granularity: 'month' }
    default: {
      const yr = parseInt(period.match(/^year_(\d{4})$/)?.[1] ?? '0') || y
      return { start: new Date(yr, 0, 1), end: new Date(yr, 11, 31, 23, 59, 59, 999), granularity: 'month', year: yr }
    }
  }
}

function allDays(start: Date, end: Date): string[] {
  const days: string[] = []
  const d = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  while (d <= endDay) {
    days.push(d.toISOString().substring(0, 10))
    d.setDate(d.getDate() + 1)
  }
  return days
}

function allMonths(start: Date, end: Date): string[] {
  const months: string[] = []
  const d = new Date(start.getFullYear(), start.getMonth(), 1)
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1)
  while (d <= endMonth) {
    months.push(d.toISOString().substring(0, 7))
    d.setMonth(d.getMonth() + 1)
  }
  return months
}

function dayLabel(dayKey: string): string {
  const [, mo, dd] = dayKey.split('-')
  return `${parseInt(mo)}/${parseInt(dd)}`
}

export const GET = withAuth(async (req) => {
  const { searchParams } = req.nextUrl
  const type   = searchParams.get('type')   ?? 'sales'
  const period = searchParams.get('period') ?? 'this_month'
  const skuId  = searchParams.get('skuId')

  let parsedPeriod: ReturnType<typeof parsePeriod>
  if (period === 'custom') {
    const cs = searchParams.get('customStart')  // YYYY-MM-DD
    const ce = searchParams.get('customEnd')    // YYYY-MM-DD
    const start = cs ? new Date(cs + 'T00:00:00') : new Date(new Date().getFullYear(), 0, 1)
    const end   = ce ? new Date(ce + 'T23:59:59') : new Date()
    const diffDays = Math.round((end.getTime() - start.getTime()) / 86400000)
    parsedPeriod = { start, end, granularity: diffDays <= 62 ? 'day' : 'month' }
  } else {
    parsedPeriod = parsePeriod(period)
  }
  const { start: periodStart, end: periodEnd, granularity, year: periodYear } = parsedPeriod

  function dateWhere() {
    return { gte: periodStart, lte: periodEnd }
  }

  // ── 캐시 (flex는 차원별로 캐시 키 구분) ─────────────────────────────
  const dimension = searchParams.get('dimension') ?? ''
  const now = new Date()
  const customSuffix = period === 'custom'
    ? `_${searchParams.get('customStart') ?? ''}_${searchParams.get('customEnd') ?? ''}`
    : `_${now.getFullYear()}_${now.getMonth()}`
  const cacheKey = `${type}_${dimension}_${period}${customSuffix}`
  if (type !== 'flex') {
    const cached = await prisma.biCache.findUnique({ where: { key: cacheKey } })
    if (cached && (Date.now() - cached.computedAt.getTime()) < 3600000) {
      return NextResponse.json({ data: cached.data })
    }
  }

  let data: unknown

  // ── 요약 타입들 ──────────────────────────────────────────────────────
  if (type === 'sales') {
    const orders = await prisma.order.groupBy({
      by: ['channel'],
      where: { status: { in: PAID }, orderedAt: dateWhere() },
      _sum: { totalAmount: true }, _count: { id: true },
    })
    data = { byChannel: orders, period: periodStart }
  } else if (type === 'customers') {
    const [total, active, vip, churnRisk] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: { isActive: true } }),
      prisma.customer.count({ where: { segment: 'vip' } }),
      prisma.customer.count({ where: { segment: 'churn_risk' } }),
    ])
    const avgLtv = await prisma.customer.aggregate({ _avg: { ltv: true }, where: { ltv: { gt: 0 } } })
    data = { total, active, vip, churnRisk, avgLtv: avgLtv._avg.ltv }
  } else if (type === 'marketing') {
    const sends = await prisma.campaignSend.aggregate({ _count: { id: true }, where: { sentAt: dateWhere() } })
    const opens = await prisma.campaignSend.count({ where: { sentAt: dateWhere(), openedAt: { not: null } } })
    const conversions = await prisma.campaignSend.count({ where: { sentAt: dateWhere(), convertedAt: { not: null } } })
    const revenue = await prisma.campaignSend.aggregate({ _sum: { revenueAttr: true }, where: { sentAt: dateWhere() } })
    data = {
      totalSent: sends._count.id,
      openRate: sends._count.id > 0 ? opens / sends._count.id : 0,
      conversionRate: sends._count.id > 0 ? conversions / sends._count.id : 0,
      revenue: revenue._sum.revenueAttr,
    }
  } else if (type === 'scm') {
    const expiring = await prisma.skuMaster.findMany({
      where: { lotExpiry: { lte: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), not: null } },
      include: { inventory: true },
      orderBy: { lotExpiry: 'asc' },
    })
    data = { expiringSkus: expiring }
  } else if (type === 'voc' && skuId) {
    const reviews = await prisma.vocReview.groupBy({
      by: ['sentiment'],
      where: { skuMasterId: skuId, analyzedAt: { not: null } },
      _count: { id: true },
    })
    data = { sentimentBreakdown: reviews }
  } else if (type === 'flex') {
    const metric  = searchParams.get('metric')  ?? 'revenue'
    const metric2 = searchParams.get('metric2') ?? null
    const limit   = parseInt(searchParams.get('limit') ?? '0') || 0

    type Row = { label: string; value: number; value2?: number }

    function pickMetric(m: string, rev: number, cnt: number, avgLtv: number, refund: number, qty = 0): number {
      if (m === 'count')   return cnt
      if (m === 'avg_ltv') return avgLtv
      if (m === 'refund')  return refund
      if (m === 'qty')     return qty
      return rev
    }

    let rawRows: Row[] = []

    /* ── 채널별 추이 (N-series) ── */
    if (dimension === 'channel_trend') {
      const orders = await prisma.order.findMany({
        where: { status: { in: PAID }, orderedAt: dateWhere() },
        select: { orderedAt: true, totalAmount: true, channel: true },
      })
      const channels = [...new Set(orders.map(o => o.channel))].sort()

      if (granularity === 'day') {
        const grouped: Record<string, Record<string, number>> = {}
        for (const o of orders) {
          const key = o.orderedAt.toISOString().substring(0, 10)
          if (!grouped[key]) grouped[key] = {}
          const val = metric === 'count' ? 1 : Number(o.totalAmount)
          grouped[key][o.channel] = (grouped[key][o.channel] ?? 0) + val
        }
        const days = allDays(periodStart, periodEnd)
        const rows = days.map(day => {
          const vals = grouped[day] ?? {}
          const row: Record<string, string | number> = { label: dayLabel(day) }
          for (const ch of channels) row[ch] = vals[ch] ?? 0
          return row
        })
        return NextResponse.json({ data: rows, series: channels })
      } else {
        const grouped: Record<string, Record<string, number>> = {}
        for (const o of orders) {
          const key = o.orderedAt.toISOString().substring(0, 7)
          if (!grouped[key]) grouped[key] = {}
          const val = metric === 'count' ? 1 : Number(o.totalAmount)
          grouped[key][o.channel] = (grouped[key][o.channel] ?? 0) + val
        }
        const months = allMonths(periodStart, periodEnd)
        const rows = months.map(month => {
          const vals = grouped[month] ?? {}
          const row: Record<string, string | number> = { label: month }
          for (const ch of channels) row[ch] = vals[ch] ?? 0
          return row
        })
        return NextResponse.json({ data: rows, series: channels })
      }
    }

    /* ── 채널별 ── */
    if (dimension === 'channel') {
      const rows = await prisma.order.groupBy({
        by: ['channel'],
        where: { status: { in: PAID }, orderedAt: dateWhere() },
        _sum: { totalAmount: true }, _count: { id: true },
      })
      rawRows = rows.map(r => {
        const rev = Number(r._sum.totalAmount ?? 0), cnt = r._count.id
        const row: Row = { label: r.channel, value: pickMetric(metric, rev, cnt, 0, 0) }
        if (metric2) row.value2 = pickMetric(metric2, rev, cnt, 0, 0)
        return row
      })

    /* ── 일별/월별 추이 ── */
    } else if (dimension === 'month') {
      const orders = await prisma.order.findMany({
        where: { status: { in: PAID }, orderedAt: dateWhere() },
        select: { orderedAt: true, totalAmount: true },
        orderBy: { orderedAt: 'asc' },
      })

      if (granularity === 'day') {
        const grouped: Record<string, { revenue: number; count: number }> = {}
        for (const o of orders) {
          const key = o.orderedAt.toISOString().substring(0, 10)
          if (!grouped[key]) grouped[key] = { revenue: 0, count: 0 }
          grouped[key].revenue += Number(o.totalAmount); grouped[key].count++
        }
        const days = allDays(periodStart, periodEnd)
        rawRows = days.map(day => {
          const v = grouped[day] ?? { revenue: 0, count: 0 }
          const row: Row = { label: dayLabel(day), value: pickMetric(metric, v.revenue, v.count, 0, 0) }
          if (metric2) row.value2 = pickMetric(metric2, v.revenue, v.count, 0, 0)
          return row
        })
      } else {
        const grouped: Record<string, { revenue: number; count: number }> = {}
        for (const o of orders) {
          const key = o.orderedAt.toISOString().substring(0, 7)
          if (!grouped[key]) grouped[key] = { revenue: 0, count: 0 }
          grouped[key].revenue += Number(o.totalAmount); grouped[key].count++
        }
        const months = allMonths(periodStart, periodEnd)
        rawRows = months.map(month => {
          const v = grouped[month] ?? { revenue: 0, count: 0 }
          const row: Row = { label: month, value: pickMetric(metric, v.revenue, v.count, 0, 0) }
          if (metric2) row.value2 = pickMetric(metric2, v.revenue, v.count, 0, 0)
          return row
        })
      }

    /* ── 전년 동기 비교 ── */
    } else if (dimension === 'month_yoy') {
      const yr = periodYear ?? new Date().getFullYear()
      const [curOrders, prevOrders] = await Promise.all([
        prisma.order.findMany({
          where: { status: { in: PAID }, orderedAt: { gte: new Date(yr, 0, 1), lte: new Date(yr, 11, 31, 23, 59, 59, 999) } },
          select: { orderedAt: true, totalAmount: true },
        }),
        prisma.order.findMany({
          where: { status: { in: PAID }, orderedAt: { gte: new Date(yr - 1, 0, 1), lte: new Date(yr - 1, 11, 31, 23, 59, 59, 999) } },
          select: { orderedAt: true, totalAmount: true },
        }),
      ])
      const buildMonthly = (orders: typeof curOrders) => {
        const g: Record<number, { revenue: number; count: number }> = {}
        for (const o of orders) {
          const m = o.orderedAt.getMonth()
          if (!g[m]) g[m] = { revenue: 0, count: 0 }
          g[m].revenue += Number(o.totalAmount); g[m].count++
        }
        return g
      }
      const cur = buildMonthly(curOrders), prev = buildMonthly(prevOrders)
      rawRows = Array.from({ length: 12 }, (_, i) => ({
        label: `${String(i + 1).padStart(2, '0')}월`,
        value:  pickMetric(metric, cur[i]?.revenue ?? 0,  cur[i]?.count ?? 0,  0, 0),
        value2: pickMetric(metric, prev[i]?.revenue ?? 0, prev[i]?.count ?? 0, 0, 0),
      }))

    /* ── 요일별 ── */
    } else if (dimension === 'weekday') {
      const orders = await prisma.order.findMany({
        where: { status: { in: PAID }, orderedAt: dateWhere() },
        select: { orderedAt: true, totalAmount: true },
      })
      const grouped: Record<number, { revenue: number; count: number }> = {}
      for (const o of orders) {
        const d = o.orderedAt.getDay()
        if (!grouped[d]) grouped[d] = { revenue: 0, count: 0 }
        grouped[d].revenue += Number(o.totalAmount); grouped[d].count++
      }
      rawRows = [1,2,3,4,5,6,0].map(d => ({
        label: WEEKDAY_LABELS[d],
        value: pickMetric(metric, grouped[d]?.revenue ?? 0, grouped[d]?.count ?? 0, 0, 0),
      }))

    /* ── 시간대별 ── */
    } else if (dimension === 'hour') {
      const orders = await prisma.order.findMany({
        where: { status: { in: PAID }, orderedAt: dateWhere() },
        select: { orderedAt: true, totalAmount: true },
      })
      const grouped: Record<number, { revenue: number; count: number }> = {}
      for (const o of orders) {
        const h = o.orderedAt.getHours()
        if (!grouped[h]) grouped[h] = { revenue: 0, count: 0 }
        grouped[h].revenue += Number(o.totalAmount); grouped[h].count++
      }
      rawRows = Array.from({ length: 24 }, (_, h) => ({
        label: `${String(h).padStart(2, '0')}시`,
        value: pickMetric(metric, grouped[h]?.revenue ?? 0, grouped[h]?.count ?? 0, 0, 0),
      }))

    /* ── 상위 상품 ── */
    } else if (dimension === 'sku_top') {
      const items = await prisma.orderItem.findMany({
        where: { order: { status: { in: PAID }, orderedAt: dateWhere() } },
        select: { qty: true, unitPrice: true, skuMaster: { select: { name: true } } },
      })
      const grouped: Record<string, { revenue: number; qty: number }> = {}
      for (const item of items) {
        const name = item.skuMaster?.name ?? 'Unknown'
        if (!grouped[name]) grouped[name] = { revenue: 0, qty: 0 }
        grouped[name].revenue += Number(item.unitPrice) * item.qty
        grouped[name].qty += item.qty
      }
      const sortKey = metric === 'qty' ? 'qty' : 'revenue'
      rawRows = Object.entries(grouped)
        .sort(([, a], [, b]) => b[sortKey] - a[sortKey])
        .slice(0, limit || 10)
        .map(([label, v]) => ({ label, value: metric === 'qty' ? v.qty : v.revenue }))

    /* ── 고객 세그먼트 ── */
    } else if (dimension === 'segment') {
      const rows = await prisma.customer.groupBy({
        by: ['segment'], _count: { id: true }, _avg: { ltv: true },
      })
      rawRows = rows.map(r => {
        const cnt = r._count.id, avgLtv = Number(r._avg.ltv ?? 0)
        const row: Row = { label: r.segment ?? '', value: pickMetric(metric, 0, cnt, avgLtv, 0) }
        if (metric2) row.value2 = pickMetric(metric2, 0, cnt, avgLtv, 0)
        return row
      })

    /* ── 영업 파이프라인 퍼널 ── */
    } else if (dimension === 'funnel_stage') {
      const rows = await prisma.deal.groupBy({
        by: ['stage'], _count: { id: true }, _sum: { amount: true },
      })
      const stageMap = Object.fromEntries(rows.map(r => [r.stage, r]))
      rawRows = STAGE_ORDER
        .filter(s => stageMap[s])
        .map(s => {
          const r = stageMap[s]
          const rev = Number(r._sum.amount ?? 0), cnt = r._count.id
          const row: Row = { label: s, value: pickMetric(metric, rev, cnt, 0, 0) }
          if (metric2) row.value2 = pickMetric(metric2, rev, cnt, 0, 0)
          return row
        })

    /* ── 딜 단계별 ── */
    } else if (dimension === 'stage') {
      const rows = await prisma.deal.groupBy({
        by: ['stage'], _count: { id: true }, _sum: { amount: true },
      })
      rawRows = rows.map(r => {
        const rev = Number(r._sum.amount ?? 0), cnt = r._count.id
        const row: Row = { label: r.stage, value: pickMetric(metric, rev, cnt, 0, 0) }
        if (metric2) row.value2 = pickMetric(metric2, rev, cnt, 0, 0)
        return row
      })

    /* ── 카테고리별 ── */
    } else if (dimension === 'category') {
      const rows = await prisma.skuMaster.groupBy({
        by: ['category'], where: { isActive: true }, _count: { id: true },
      })
      rawRows = rows.map(r => ({ label: r.category, value: r._count.id }))

    /* ── 캠페인 성과 ── */
    } else if (dimension === 'campaign_perf') {
      const campaigns = await prisma.campaign.findMany({
        where: { sentAt: { not: null } },
        select: {
          type: true,
          sends: { select: { revenueAttr: true, openedAt: true, convertedAt: true, sentAt: true } },
        },
      })
      const grouped: Record<string, { revenue: number; count: number }> = {}
      for (const camp of campaigns) {
        const t = camp.type || 'unknown'
        if (!grouped[t]) grouped[t] = { revenue: 0, count: 0 }
        grouped[t].count += camp.sends.length
        grouped[t].revenue += camp.sends.reduce((s, x) => s + Number(x.revenueAttr ?? 0), 0)
      }
      rawRows = Object.entries(grouped).map(([label, v]) => {
        const row: Row = { label, value: pickMetric(metric, v.revenue, v.count, 0, 0) }
        if (metric2) row.value2 = pickMetric(metric2, v.revenue, v.count, 0, 0)
        return row
      }).sort((a, b) => b.value - a.value)

    /* ── 반품 사유 ── */
    } else if (dimension === 'reason') {
      const rows = await prisma.return.groupBy({
        by: ['reason'], _count: { id: true }, _sum: { refundAmount: true },
      })
      rawRows = rows.filter(r => r.reason).map(r => {
        const cnt = r._count.id, refund = Number(r._sum.refundAmount ?? 0)
        const row: Row = { label: r.reason!, value: pickMetric(metric, 0, cnt, 0, refund) }
        if (metric2) row.value2 = pickMetric(metric2, 0, cnt, 0, refund)
        return row
      })

    /* ── 반품 추이 ── */
    } else if (dimension === 'return_trend') {
      const returns = await prisma.return.findMany({
        where: { createdAt: dateWhere() },
        select: { createdAt: true, refundAmount: true },
        orderBy: { createdAt: 'asc' },
      })

      if (granularity === 'day') {
        const grouped: Record<string, { count: number; refund: number }> = {}
        for (const r of returns) {
          const key = r.createdAt.toISOString().substring(0, 10)
          if (!grouped[key]) grouped[key] = { count: 0, refund: 0 }
          grouped[key].count++
          grouped[key].refund += Number(r.refundAmount ?? 0)
        }
        const days = allDays(periodStart, periodEnd)
        rawRows = days.map(day => {
          const v = grouped[day] ?? { count: 0, refund: 0 }
          const row: Row = { label: dayLabel(day), value: metric === 'refund' ? v.refund : v.count }
          if (metric2) row.value2 = metric2 === 'refund' ? v.refund : v.count
          return row
        })
      } else {
        const grouped: Record<string, { count: number; refund: number }> = {}
        for (const r of returns) {
          const key = r.createdAt.toISOString().substring(0, 7)
          if (!grouped[key]) grouped[key] = { count: 0, refund: 0 }
          grouped[key].count++
          grouped[key].refund += Number(r.refundAmount ?? 0)
        }
        const months = allMonths(periodStart, periodEnd)
        rawRows = months.map(month => {
          const v = grouped[month] ?? { count: 0, refund: 0 }
          const row: Row = { label: month, value: metric === 'refund' ? v.refund : v.count }
          if (metric2) row.value2 = metric2 === 'refund' ? v.refund : v.count
          return row
        })
      }

    /* ── 배송사별 ── */
    } else if (dimension === 'carrier') {
      const rows = await prisma.shipment.groupBy({
        by: ['carrier'], _count: { id: true },
        where: { carrier: { not: null } },
      })
      rawRows = rows.filter(r => r.carrier).map(r => ({ label: r.carrier!, value: r._count.id }))

    /* ── 거래처 정산 ── */
    } else if (dimension === 'partner') {
      const rows = await prisma.settlement.groupBy({
        by: ['partnerName'], _count: { id: true }, _sum: { totalAmount: true },
      })
      rawRows = rows.filter(r => r.partnerName).map(r => {
        const rev = Number(r._sum.totalAmount ?? 0), cnt = r._count.id
        const row: Row = { label: r.partnerName!, value: pickMetric(metric, rev, cnt, 0, 0) }
        if (metric2) row.value2 = pickMetric(metric2, rev, cnt, 0, 0)
        return row
      })
    }

    return NextResponse.json({ data: rawRows })
  }

  if (type !== 'flex') {
    await prisma.biCache.upsert({
      where: { key: cacheKey },
      create: { key: cacheKey, data: data as object },
      update: { data: data as object, computedAt: new Date() },
    })
  }

  return NextResponse.json({ data })
})
