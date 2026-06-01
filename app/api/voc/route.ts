import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { prisma } from '@/lib/db'

export const GET = withAuth(async (req) => {
  const { searchParams } = req.nextUrl
  const cursor = searchParams.get('cursor') ?? undefined
  const limit = Math.min(Number(searchParams.get('limit') ?? 30), 100)
  const alertOnly = searchParams.get('alertOnly') === 'true'
  const skuId = searchParams.get('skuId') ?? undefined

  const items = await prisma.vocReview.findMany({
    where: {
      ...(alertOnly ? { isAlert: true } : {}),
      ...(skuId ? { skuMasterId: skuId } : {})
    },
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    orderBy: { ingestedAt: 'desc' },
    include: { skuMaster: { select: { name: true } } }
  })

  const hasMore = items.length > limit
  if (hasMore) items.pop()

  return NextResponse.json({
    data: items,
    meta: { nextCursor: hasMore ? items[items.length - 1]?.id : null, hasMore }
  })
})
