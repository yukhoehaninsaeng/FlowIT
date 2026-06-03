import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { withAuditLog } from '@/lib/middleware/withAuditLog'
import { prisma } from '@/lib/db'
import { z } from 'zod'


const updateSchema = z.object({
  name: z.string().optional(),
  category: z.string().optional(),
  subCategory: z.string().optional(),
  unit: z.string().optional(),
  ingredients: z.array(z.string()).optional(),
  unitCost: z.number().nonnegative().optional(),
  sellingPrice: z.number().nonnegative().optional(),
  lotExpiry: z.string().datetime().optional(),
  isActive: z.boolean().optional()
})

export const GET = withAuth(async (req, { params }) => {
  const sku = await prisma.skuMaster.findUnique({
    where: { id: params?.id },
    include: { aliases: true, inventory: true, bundleItems: { include: { componentSku: true } } }
  })
  if (!sku) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ data: sku })
})

export const PATCH = withAuditLog(
  withAuth(async (req, { params }) => {
    const body = updateSchema.safeParse(await req.json())
    if (!body.success) {
      return NextResponse.json({ error: 'Validation failed', details: body.error.flatten() }, { status: 400 })
    }
    const sku = await prisma.skuMaster.update({
      where: { id: params?.id },
      data: {
        ...body.data,
        lotExpiry: body.data.lotExpiry ? new Date(body.data.lotExpiry) : undefined
      }
    })
    return NextResponse.json({ data: sku })
  }, ['super_admin', 'admin', 'manager']),
  { action: 'UPDATE', resource: 'sku', getResourceId: (req) => req.nextUrl.pathname.split('/').at(-1) }
)
