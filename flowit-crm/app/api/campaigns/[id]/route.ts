import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { withAuditLog } from '@/lib/middleware/withAuditLog'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().optional(),
  messageA: z.string().optional(),
  messageB: z.string().optional(),
  scheduledAt: z.string().datetime().optional(),
  status: z.enum(['DRAFT', 'SCHEDULED', 'PAUSED']).optional()
})

export const GET = withAuth(async (req, { params }) => {
  const campaign = await prisma.campaign.findUnique({
    where: { id: params?.id },
    include: {
      createdBy: { select: { name: true } },
      _count: { select: { sends: true } },
      sends: {
        select: {
          status: true, openedAt: true, clickedAt: true,
          convertedAt: true, revenueAttr: true
        }
      }
    }
  })
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const stats = {
    total: campaign.sends.length,
    opened: campaign.sends.filter(s => s.openedAt).length,
    clicked: campaign.sends.filter(s => s.clickedAt).length,
    converted: campaign.sends.filter(s => s.convertedAt).length,
    revenue: campaign.sends.reduce((sum, s) => sum + Number(s.revenueAttr), 0)
  }

  return NextResponse.json({ data: { ...campaign, sends: undefined, stats } })
})

export const PATCH = withAuditLog(
  withAuth(async (req, { params }) => {
    const body = updateSchema.safeParse(await req.json())
    if (!body.success) {
      return NextResponse.json({ error: 'Validation failed', details: body.error.flatten() }, { status: 400 })
    }
    const campaign = await prisma.campaign.update({
      where: { id: params?.id },
      data: {
        ...body.data,
        scheduledAt: body.data.scheduledAt ? new Date(body.data.scheduledAt) : undefined
      }
    })
    return NextResponse.json({ data: campaign })
  }),
  { action: 'UPDATE', resource: 'campaign', getResourceId: (req) => req.nextUrl.pathname.split('/').at(-2) }
)
