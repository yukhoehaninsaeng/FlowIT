import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { withAuditLog } from '@/lib/middleware/withAuditLog'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { CampaignType, Prisma } from '@prisma/client'

const createSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['EMAIL', 'KAKAO_ALIMTALK', 'SMS']),
  segmentFilter: z.record(z.string(), z.unknown()).default({}),
  messageA: z.string().min(1),
  messageB: z.string().optional(),
  abEnabled: z.boolean().default(false),
  abRatioA: z.number().int().min(0).max(100).default(50),
  scheduledAt: z.string().datetime().optional()
})

export const GET = withAuth(async (req) => {
  const { searchParams } = req.nextUrl
  const cursor = searchParams.get('cursor') ?? undefined
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 100)

  const items = await prisma.campaign.findMany({
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    orderBy: { createdAt: 'desc' },
    include: { createdBy: { select: { name: true } }, _count: { select: { sends: true } } }
  })

  const hasMore = items.length > limit
  if (hasMore) items.pop()

  return NextResponse.json({
    data: items,
    meta: { nextCursor: hasMore ? items[items.length - 1]?.id : null, hasMore }
  })
})

export const POST = withAuditLog(
  withAuth(async (req, { session }) => {
    const body = createSchema.safeParse(await req.json())
    if (!body.success) {
      return NextResponse.json({ error: 'Validation failed', details: body.error.flatten() }, { status: 400 })
    }
    const { segmentFilter, scheduledAt, ...rest } = body.data
    const campaign = await prisma.campaign.create({
      data: {
        ...rest,
        type: rest.type as CampaignType,
        segmentFilter: segmentFilter as Prisma.InputJsonObject,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        createdById: session.user.id
      }
    })
    return NextResponse.json({ data: campaign }, { status: 201 })
  }),
  { action: 'CREATE', resource: 'campaign' }
)
