import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { prisma } from '@/lib/db'


const PAID = ['PAID', 'SHIPPED', 'DELIVERED']

function parsePeriod(period: string): { start: Date; end?: Date } {
  const now = new Date()
  const yearMatch = period.match(/^year_(\d{4})$/)
  if (yearMatch) {
    const yr = parseInt(yearMatch[1])
    return { start: new Date(yr, 0, 1), end: new Date(yr + 1, 0, 1) }
  }
  if (period === 'monthly')   return { start: new Date(now.getFullYear(), now.getMonth(), 1) }
  if (period === 'quarterly') return { start: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1) }
  return { start: new Date(now.getFullYear(), 0, 1) }
}

export const GET = withAuth(async (req) => {
  const { searchParams } = req.nextUrl
  const type   = searchParams.get('type')   ?? 'sales'
  const period = searchParams.get('period') ?? 'monthly'
  const skuId  = searchParams.get('skuId')

  const { start: periodStart, end: periodEnd } = parsePeriod(period)

  // Build date filter helper
  function dateWhere() {
    return periodEnd
      ? { gte: periodStart, lt: periodEnd }
      : { gte: periodStart }
  }

  const now = new Date()
  const cacheKey = `${type}_${period}_${now.getFullYear()}_${now.getMonth()}`
  const cached = await prisma.biCache.findUnique({ where: { key: cacheKey } })
  if (cached && (Date.now() - cached.computedAt.getTime()) < 3600000) {
    return NextResponse.json({ data: cached.data })
  }

  let data: unknown

  if (type === 'sales') {
    const orders = await prisma.order.groupBy({
      by: ['channel'],
      where: { status: { in: PAID }, orderedAt: dateWhere() },
      _sum: { totalAmount: true },
      _count: { id: true }
    })
    data = { byChannel: orders, period: periodStart }
  } else if (type === 'customers') {
    const [total, active, vip, churnRisk] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({ where: { isActive: true } }),
      prisma.customer.count({ where: { segment: 'vip' } }),
      prisma.customer.count({ where: { segment: 'churn_risk' } })
    ])
    const avgLtv = await prisma.customer.aggregate({ _avg: { ltv: true }, where: { ltv: { gt: 0 } } })
    data = { total, active, vip, churnRisk, avgLtv: avgLtv._avg.ltv }
  } else if (type === 'marketing') {
    const sends = await prisma.campaignSend.aggregate({
      _count: { id: true },
      where: { sentAt: dateWhere() }
    })
    const opens = await prisma.campaignSend.count({ where: { sentAt: dateWhere(), openedAt: { not: null } } })
    const conversions = await prisma.campaignSend.count({ where: { sentAt: dateWhere(), convertedAt: { not: null } } })
    const revenue = await prisma.campaignSend.aggregate({ _sum: { revenueAttr: true }, where: { sentAt: dateWhere() } })
    data = {
      totalSent: sends._count.id,
      openRate: sends._count.id > 0 ? opens / sends._count.id : 0,
      conversionRate: sends._count.id > 0 ? conversions / sends._count.id : 0,
      revenue: revenue._sum.revenueAttr
    }
  } else if (type === 'scm') {
    const expiring = await prisma.skuMaster.findMany({
      where: { lotExpiry: { lte: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), not: null } },
      include: { inventory: true },
      orderBy: { lotExpiry: 'asc' }
    })
    data = { expiringSkus: expiring }
  } else if (type === 'flex') {
    const dimension = searchParams.get('dimension') ?? 'channel'
    const metric    = searchParams.get('metric')    ?? 'revenue'
    const metric2   = searchParams.get('metric2')   ?? null

    type Row = { label: string; value: number; value2?: number }

    function pickMetric(m: string, rev: number, cnt: number, avgLtv: number, refund: number): number {
      if (m === 'count')   return cnt
      if (m === 'avg_ltv') return avgLtv
      if (m === 'refund')  return refund
      return rev
    }

    /* ── 채널별 월간 추이 (N-series) ──────────────────────── */
    if (dimension === 'channel_trend') {
      const orders = await prisma.order.findMany({
        where: { status: { in: PAID }, orderedAt: dateWhere() },
        select: { orderedAt: true, totalAmount: true, channel: true }
      })

      const channels = [...new Set(orders.map(o => o.channel))].sort()
      const grouped: Record<string, Record<string, number>> = {}

      for (const o of orders) {
        const month = o.orderedAt.toISOString().substring(0, 7)
        if (!grouped[month]) grouped[month] = {}
        const val = metric === 'count' ? 1 : Number(o.totalAmount)
        grouped[month][o.channel] = (grouped[month][o.channel] ?? 0) + val
      }

      const rows = Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([label, vals]) => {
          const row: Record<string, string | number> = { label }
          for (const ch of channels) row[ch] = vals[ch] ?? 0
          return row
        })

      return NextResponse.json({ data: rows, series: channels })
    }

    let rawRows: Row[] = []

    if (dimension === 'channel') {
      const rows = await prisma.order.groupBy({
        by: ['channel'],
        where: { status: { in: PAID }, orderedAt: dateWhere() },
        _sum: { totalAmount: true }, _count: { id: true }
      })
      rawRows = rows.map(r => {
        const rev = Number(r._sum.totalAmount ?? 0), cnt = r._count.id
        const row: Row = { label: r.channel, value: pickMetric(metric, rev, cnt, 0, 0) }
        if (metric2) row.value2 = pickMetric(metric2, rev, cnt, 0, 0)
        return row
      })
    } else if (dimension === 'month') {
      const orders = await prisma.order.findMany({
        where: { status: { in: PAID }, orderedAt: dateWhere() },
        select: { orderedAt: true, totalAmount: true },
        orderBy: { orderedAt: 'asc' }
      })
      const grouped: Record<string, { revenue: number; count: number }> = {}
      for (const o of orders) {
        const key = o.orderedAt.toISOString().substring(0, 7)
        if (!grouped[key]) grouped[key] = { revenue: 0, count: 0 }
        grouped[key].revenue += Number(o.totalAmount); grouped[key].count++
      }
      rawRows = Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([label, v]) => {
          const row: Row = { label, value: pickMetric(metric, v.revenue, v.count, 0, 0) }
          if (metric2) row.value2 = pickMetric(metric2, v.revenue, v.count, 0, 0)
          return row
        })
    } else if (dimension === 'segment') {
      const rows = await prisma.customer.groupBy({
        by: ['segment'], _count: { id: true }, _avg: { ltv: true }
      })
      rawRows = rows.map(r => {
        const cnt = r._count.id, avgLtv = Number(r._avg.ltv ?? 0)
        const row: Row = { label: r.segment ?? '', value: pickMetric(metric, 0, cnt, avgLtv, 0) }
        if (metric2) row.value2 = pickMetric(metric2, 0, cnt, avgLtv, 0)
        return row
      })
    } else if (dimension === 'stage') {
      const rows = await prisma.deal.groupBy({
        by: ['stage'], _count: { id: true }, _sum: { amount: true }
      })
      rawRows = rows.map(r => {
        const rev = Number(r._sum.amount ?? 0), cnt = r._count.id
        const row: Row = { label: r.stage, value: pickMetric(metric, rev, cnt, 0, 0) }
        if (metric2) row.value2 = pickMetric(metric2, rev, cnt, 0, 0)
        return row
      })
    } else if (dimension === 'category') {
      const rows = await prisma.skuMaster.groupBy({
        by: ['category'], where: { isActive: true }, _count: { id: true }
      })
      rawRows = rows.map(r => ({ label: r.category, value: r._count.id }))
    } else if (dimension === 'reason') {
      const rows = await prisma.return.groupBy({
        by: ['reason'], _count: { id: true }, _sum: { refundAmount: true }
      })
      rawRows = rows.filter(r => r.reason).map(r => {
        const cnt = r._count.id, refund = Number(r._sum.refundAmount ?? 0)
        const row: Row = { label: r.reason!, value: pickMetric(metric, 0, cnt, 0, refund) }
        if (metric2) row.value2 = pickMetric(metric2, 0, cnt, 0, refund)
        return row
      })
    } else if (dimension === 'partner') {
      const rows = await prisma.settlement.groupBy({
        by: ['partnerName'], _count: { id: true }, _sum: { totalAmount: true }
      })
      rawRows = rows.filter(r => r.partnerName).map(r => {
        const rev = Number(r._sum.totalAmount ?? 0), cnt = r._count.id
        const row: Row = { label: r.partnerName!, value: pickMetric(metric, rev, cnt, 0, 0) }
        if (metric2) row.value2 = pickMetric(metric2, rev, cnt, 0, 0)
        return row
      })
    }

    return NextResponse.json({ data: rawRows })
  } else if (type === 'voc' && skuId) {
    const reviews = await prisma.vocReview.groupBy({
      by: ['sentiment'],
      where: { skuMasterId: skuId, analyzedAt: { not: null } },
      _count: { id: true }
    })
    data = { sentimentBreakdown: reviews }
  }

  await prisma.biCache.upsert({
    where: { key: cacheKey },
    create: { key: cacheKey, data: data as object },
    update: { data: data as object, computedAt: new Date() }
  })

  return NextResponse.json({ data })
})
