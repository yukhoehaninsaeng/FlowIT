import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { withAuditLog } from '@/lib/middleware/withAuditLog'
import { prisma } from '@/lib/db'
import { z } from 'zod'


const createSchema = z.object({
  name: z.string().min(1),
  channel: z.string(),
  handle: z.string().min(1),
  followerCnt: z.number().int().default(0),
  avgEngagement: z.number().default(0),
  skinTypeFocus: z.string().optional(),
  categoryFocus: z.array(z.string()).default([]),
  contact: z.string().optional(),
  notes: z.string().optional()
})

export const GET = withAuth(async (req) => {
  const { searchParams } = req.nextUrl
  const cursor = searchParams.get('cursor') ?? undefined
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 100)

  const items = await prisma.influencer.findMany({
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    orderBy: { avgRoi: 'desc' },
    include: { _count: { select: { campaigns: true } } }
  })

  const hasMore = items.length > limit
  if (hasMore) items.pop()

  return NextResponse.json({
    data: items,
    meta: { nextCursor: hasMore ? items[items.length - 1]?.id : null, hasMore }
  })
})

export const POST = withAuditLog(
  withAuth(async (req) => {
    const body = createSchema.safeParse(await req.json())
    if (!body.success) {
      return NextResponse.json({ error: 'Validation failed', details: body.error.flatten() }, { status: 400 })
    }
    const influencer = await prisma.influencer.create({ data: body.data })
    return NextResponse.json({ data: influencer }, { status: 201 })
  }),
  { action: 'CREATE', resource: 'influencer' }
)
