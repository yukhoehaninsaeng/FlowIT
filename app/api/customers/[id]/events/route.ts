import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { prisma } from '@/lib/db'

export const GET = withAuth(async (req, { params }) => {
  const { searchParams } = req.nextUrl
  const cursor = searchParams.get('cursor') ?? undefined
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 100)

  const events = await prisma.customerEvent.findMany({
    where: { customerId: params?.id },
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    orderBy: { occurredAt: 'desc' }
  })

  const hasMore = events.length > limit
  if (hasMore) events.pop()

  return NextResponse.json({
    data: events,
    meta: { nextCursor: hasMore ? events[events.length - 1]?.id : null, hasMore }
  })
})
