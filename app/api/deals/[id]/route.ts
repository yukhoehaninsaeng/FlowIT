import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { withAuditLog } from '@/lib/middleware/withAuditLog'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { DealStage } from '@prisma/client'

const updateSchema = z.object({
  title: z.string().optional(),
  stage: z.nativeEnum(DealStage).optional(),
  amount: z.number().int().positive().optional(),
  probability: z.number().int().min(0).max(100).optional(),
  assigneeId: z.string().optional(),
  expectedClose: z.string().datetime().optional(),
  notes: z.string().optional()
})

export const PATCH = withAuditLog(
  withAuth(async (req, { params }) => {
    const body = updateSchema.safeParse(await req.json())
    if (!body.success) {
      return NextResponse.json({ error: 'Validation failed', details: body.error.flatten() }, { status: 400 })
    }
    const deal = await prisma.deal.update({
      where: { id: params?.id },
      data: {
        ...body.data,
        expectedClose: body.data.expectedClose ? new Date(body.data.expectedClose) : undefined
      },
      include: { account: { select: { name: true } } }
    })
    return NextResponse.json({ data: deal })
  }),
  { action: 'UPDATE', resource: 'deal', getResourceId: (req) => req.nextUrl.pathname.split('/').at(-1) }
)
