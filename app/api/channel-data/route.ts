import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { prisma } from '@/lib/db'

const PAID = ['PAID', 'SHIPPED', 'DELIVERED']

function parsePeriod(period: string): { start: Date; end: Date } {
  const match = period.match(/^(\d{4})Q([1-4])$/)
  if (match) {
    const year = parseInt(match[1])
    const quarter = parseInt(match[2])
    const startMonth = (quarter - 1) * 3
    const start = new Date(year, startMonth, 1)
    const end = new Date(year, startMonth + 3, 0, 23, 59, 59, 999)
    return { start, end }
  }
  // 폴백: 현재 월
  const now = new Date()
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
  }
}

function prevQuarter(period: string): string {
  const match = period.match(/^(\d{4})Q([1-4])$/)
  if (match) {
    const year = parseInt(match[1])
    const q = parseInt(match[2])
    return q === 1 ? `${year - 1}Q4` : `${year}Q${q - 1}`
  }
  return period
}

export const GET = withAuth(async (req) => {
  const { searchParams } = req.nextUrl
  const period = searchParams.get('period') ?? '2024Q1'

  const { start, end } = parsePeriod(period)
  const prev = parsePeriod(prevQuarter(period))

  // 현재 분기 채널별 매출 + 주문 수
  const currentOrders = await prisma.order.groupBy({
    by: ['channel'],
    where: { status: { in: PAID }, orderedAt: { gte: start, lte: end } },
    _sum: { totalAmount: true },
    _count: { id: true },
  })

  if (currentOrders.length === 0) {
    return NextResponse.json([])
  }

  // 전분기 채널별 매출 (MoM 계산용)
  const prevOrders = await prisma.order.groupBy({
    by: ['channel'],
    where: { status: { in: PAID }, orderedAt: { gte: prev.start, lte: prev.end } },
    _sum: { totalAmount: true },
  })

  // 채널별 판매량(qty 합계) — Order → OrderItem 조인 필요
  type UnitRow = { channel: string; units: bigint }
  const unitRows = await prisma.$queryRaw<UnitRow[]>`
    SELECT o.channel, COALESCE(SUM(oi.qty), 0)::bigint AS units
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.status = ANY(${PAID}::text[])
      AND o.ordered_at >= ${start}
      AND o.ordered_at <= ${end}
    GROUP BY o.channel
  `

  // 채널별 반품 건수 — Return.order_id → Order.channel 조인
  type ReturnRow = { channel: string; cnt: bigint }
  const returnRows = await prisma.$queryRaw<ReturnRow[]>`
    SELECT o.channel, COUNT(r.id)::bigint AS cnt
    FROM returns r
    JOIN orders o ON o.id = r.order_id
    WHERE r.created_at >= ${start}
      AND r.created_at <= ${end}
    GROUP BY o.channel
  `

  const totalRevenue = currentOrders.reduce(
    (s, r) => s + Number(r._sum.totalAmount ?? 0),
    0
  )

  const prevMap = new Map(prevOrders.map(r => [r.channel, Number(r._sum.totalAmount ?? 0)]))
  const unitsMap = new Map(unitRows.map(r => [r.channel, Number(r.units)]))
  const returnsMap = new Map(returnRows.map(r => [r.channel, Number(r.cnt)]))

  const rows = currentOrders.map(row => {
    const revenue = Number(row._sum.totalAmount ?? 0)
    const orderCount = row._count.id
    const returnCount = returnsMap.get(row.channel) ?? 0
    const prevRevenue = prevMap.get(row.channel) ?? 0

    return {
      channel: row.channel,
      revenue,
      units: unitsMap.get(row.channel) ?? 0,
      returnRate: orderCount > 0 ? returnCount / orderCount : 0,
      revenueShare: totalRevenue > 0 ? revenue / totalRevenue : 0,
      mom: prevRevenue > 0 ? (revenue - prevRevenue) / prevRevenue : 0,
    }
  })

  return NextResponse.json(rows)
})
