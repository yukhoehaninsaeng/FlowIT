import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { withAuditLog } from '@/lib/middleware/withAuditLog'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateSchema = z.object({
  skinType: z.string().optional(),
  segment: z.string().optional(),
  name: z.string().optional(),
  gender: z.string().optional(),
  birthYear: z.number().int().optional()
})

export const GET = withAuth(async (req, { params }) => {
  const customer = await prisma.customer.findUnique({
    where: { id: params?.id },
    include: {
      identities: true,
      events: { orderBy: { occurredAt: 'desc' }, take: 20 },
      orders: { orderBy: { orderedAt: 'desc' }, take: 10, include: { items: { include: { skuMaster: { select: { name: true } } } } } }
    }
  })
  if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ data: customer })
})

export const PATCH = withAuditLog(
  withAuth(async (req, { params }) => {
    const body = updateSchema.safeParse(await req.json())
    if (!body.success) {
      return NextResponse.json({ error: 'Validation failed', details: body.error.flatten() }, { status: 400 })
    }
    const customer = await prisma.customer.update({
      where: { id: params?.id },
      data: body.data
    })
    return NextResponse.json({ data: customer })
  }),
  { action: 'UPDATE', resource: 'customer', getResourceId: (req) => req.nextUrl.pathname.split('/').at(-1) }
)
