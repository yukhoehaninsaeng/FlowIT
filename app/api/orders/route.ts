import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { prisma } from '@/lib/db'
import { Channel, OrderStatus } from '@prisma/client'

export const GET = withAuth(async (req) => {
  const { searchParams } = req.nextUrl
  const cursor = searchParams.get('cursor') ?? undefined
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 100)
  const channel = searchParams.get('channel') as Channel | null
  const status = searchParams.get('status') as OrderStatus | null
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  const where = {
    ...(channel ? { channel } : {}),
    ...(status ? { status } : {}),
    ...(startDate || endDate ? {
      orderedAt: {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {})
      }
    } : {})
  }

  const items = await prisma.order.findMany({
    where,
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    orderBy: { orderedAt: 'desc' },
    include: { customer: { select: { name: true, email: true } }, items: { include: { skuMaster: { select: { name: true } } } } }
  })

  const hasMore = items.length > limit
  if (hasMore) items.pop()

  return NextResponse.json({
    data: items,
    meta: { nextCursor: hasMore ? items[items.length - 1]?.id : null, hasMore }
  })
})
