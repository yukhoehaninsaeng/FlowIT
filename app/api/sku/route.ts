import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { withAuditLog } from '@/lib/middleware/withAuditLog'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { UserRole } from '@prisma/client'

const createSchema = z.object({
  skuCode: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  subCategory: z.string().optional(),
  ingredients: z.array(z.string()).default([]),
  unitCost: z.number().int().positive(),
  sellingPrice: z.number().int().positive(),
  lotExpiry: z.string().datetime().optional(),
  isBundle: z.boolean().default(false)
})

export const GET = withAuth(async (req) => {
  const { searchParams } = req.nextUrl
  const cursor = searchParams.get('cursor') ?? undefined
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 100)
  const category = searchParams.get('category') ?? undefined
  const search = searchParams.get('search') ?? undefined

  const where = {
    isActive: true,
    ...(category ? { category } : {}),
    ...(search ? { OR: [
      { name: { contains: search, mode: 'insensitive' as const } },
      { skuCode: { contains: search, mode: 'insensitive' as const } }
    ]} : {})
  }

  const items = await prisma.skuMaster.findMany({
    where,
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    orderBy: { createdAt: 'desc' }
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
    const sku = await prisma.skuMaster.create({
      data: {
        ...body.data,
        lotExpiry: body.data.lotExpiry ? new Date(body.data.lotExpiry) : undefined
      }
    })
    return NextResponse.json({ data: sku }, { status: 201 })
  }, [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]),
  { action: 'CREATE', resource: 'sku' }
)
