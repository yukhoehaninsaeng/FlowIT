import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { withAuditLog } from '@/lib/middleware/withAuditLog'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { DealStage } from '@prisma/client'

const createSchema = z.object({
  accountId: z.string().min(1),
  title: z.string().min(1),
  stage: z.nativeEnum(DealStage).default('LEAD'),
  amount: z.number().int().positive(),
  probability: z.number().int().min(0).max(100).default(50),
  assigneeId: z.string().optional(),
  expectedClose: z.string().datetime().optional(),
  notes: z.string().optional()
})

export const GET = withAuth(async (req) => {
  const { searchParams } = req.nextUrl
  const stage = searchParams.get('stage') as DealStage | null
  const cursor = searchParams.get('cursor') ?? undefined
  const limit = Math.min(Number(searchParams.get('limit') ?? 50), 200)

  const items = await prisma.deal.findMany({
    where: stage ? { stage } : {},
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    orderBy: { updatedAt: 'desc' },
    include: { account: { select: { name: true } } }
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
    const deal = await prisma.deal.create({
      data: {
        ...body.data,
        expectedClose: body.data.expectedClose ? new Date(body.data.expectedClose) : undefined
      },
      include: { account: { select: { name: true } } }
    })
    return NextResponse.json({ data: deal }, { status: 201 })
  }),
  { action: 'CREATE', resource: 'deal' }
)
