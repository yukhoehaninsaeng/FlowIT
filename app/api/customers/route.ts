import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { withAuditLog } from '@/lib/middleware/withAuditLog'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { maskEmail, maskPhone } from '@/lib/utils'

const createSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  name: z.string().optional(),
  gender: z.string().optional(),
  birthYear: z.number().int().optional(),
  skinType: z.string().optional()
})

export const GET = withAuth(async (req, { session }) => {
  const { searchParams } = req.nextUrl
  const cursor = searchParams.get('cursor') ?? undefined
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 100)
  const segment = searchParams.get('segment') ?? undefined
  const search = searchParams.get('search') ?? undefined
  const isViewer = session.user.role === 'VIEWER'

  const where = {
    ...(segment ? { segment } : {}),
    ...(search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search } }
      ]
    } : {})
  }

  const items = await prisma.customer.findMany({
    where,
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    orderBy: { ltv: 'desc' },
    select: {
      id: true, name: true, email: true, phone: true,
      segment: true, ltv: true, skinType: true,
      createdAt: true, updatedAt: true,
      orders: { select: { orderedAt: true }, orderBy: { orderedAt: 'desc' }, take: 1 }
    }
  })

  const hasMore = items.length > limit
  if (hasMore) items.pop()

  const masked = items.map(c => ({
    ...c,
    email: isViewer && c.email ? maskEmail(c.email) : c.email,
    phone: isViewer && c.phone ? maskPhone(c.phone) : c.phone,
    lastOrderAt: c.orders[0]?.orderedAt ?? null,
    orders: undefined
  }))

  return NextResponse.json({
    data: masked,
    meta: { nextCursor: hasMore ? items[items.length - 1]?.id : null, hasMore }
  })
})

export const POST = withAuditLog(
  withAuth(async (req) => {
    const body = createSchema.safeParse(await req.json())
    if (!body.success) {
      return NextResponse.json({ error: 'Validation failed', details: body.error.flatten() }, { status: 400 })
    }
    const customer = await prisma.customer.create({ data: body.data })
    return NextResponse.json({ data: customer }, { status: 201 })
  }),
  { action: 'CREATE', resource: 'customer' }
)
