import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { prisma } from '@/lib/db'
import { OrderStatus } from '@prisma/client'

const PAID: OrderStatus[] = ['PAID', 'SHIPPED', 'DELIVERED']

export const GET = withAuth(async (req) => {
  const { searchParams } = req.nextUrl
  const type = searchParams.get('type') ?? 'sales'
  const period = searchParams.get('period') ?? 'monthly'
  const channel = searchParams.get('channel')
  const skuId = searchParams.get('skuId')

  const now = new Date()
  const periodStart = period === 'monthly'
    ? new Date(now.getFullYear(), now.getMonth(), 1)
    : period === 'quarterly'
    ? new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
    : new Date(now.getFullYear(), 0, 1)

  const cacheKey = `${type}_${period}_${now.getFullYear()}_${now.getMonth()}`
  const cached = await prisma.biCache.findUnique({ where: { key: cacheKey } })
  if (cached && (Date.now() - cached.computedAt.getTime()) < 3600000) {
    return NextResponse.json({ data: cached.data })
  }

  let data: unknown

  if (type === 'sales') {
    const orders = await prisma.order.groupBy({
      by: ['channel'],
      where: { status: { in: PAID }, orderedAt: { gte: periodStart } },
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
      where: { sentAt: { gte: periodStart } }
    })
    const opens = await prisma.campaignSend.count({ where: { sentAt: { gte: periodStart }, openedAt: { not: null } } })
    const conversions = await prisma.campaignSend.count({ where: { sentAt: { gte: periodStart }, convertedAt: { not: null } } })
    const revenue = await prisma.campaignSend.aggregate({ _sum: { revenueAttr: true }, where: { sentAt: { gte: periodStart } } })
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
