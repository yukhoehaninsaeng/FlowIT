import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { prisma } from '@/lib/db'

export const GET = withAuth(async (req) => {
  const { searchParams } = req.nextUrl
  const cursor = searchParams.get('cursor') ?? undefined
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 100)

  const items = await prisma.channelOrderRaw.findMany({
    where: { processed: false, errorMessage: { contains: 'unmapped' } },
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    orderBy: { ingestedAt: 'desc' }
  })

  const hasMore = items.length > limit
  if (hasMore) items.pop()

  return NextResponse.json({
    data: items,
    meta: { nextCursor: hasMore ? items[items.length - 1]?.id : null, hasMore }
  })
})
