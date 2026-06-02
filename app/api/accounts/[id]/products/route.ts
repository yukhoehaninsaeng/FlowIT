import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/middleware/withAuth'

export const GET = withAuth(async (_req, { params }) => {
  const { id } = await params
  const items = await prisma.accountProduct.findMany({
    where: { accountId: id },
    include: {
      skuMaster: {
        select: { id: true, skuCode: true, name: true, category: true, unit: true, unitCost: true, sellingPrice: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json({ data: items })
})

export const POST = withAuth(async (req, { params }) => {
  const { id } = await params
  const body = await req.json()
  const { skuMasterId, type = 'sell', customPrice, notes } = body

  if (!skuMasterId) return NextResponse.json({ error: 'skuMasterId is required' }, { status: 400 })

  const existing = await prisma.accountProduct.findUnique({
    where: { accountId_skuMasterId_type: { accountId: id, skuMasterId, type } },
  })

  if (existing) {
    const updated = await prisma.accountProduct.update({
      where: { id: existing.id },
      data: { customPrice: customPrice ?? null, notes: notes ?? null },
      include: { skuMaster: { select: { id: true, skuCode: true, name: true, category: true, unit: true, unitCost: true, sellingPrice: true } } },
    })
    return NextResponse.json({ data: updated })
  }

  const item = await prisma.accountProduct.create({
    data: { accountId: id, skuMasterId, type, customPrice: customPrice ?? null, notes: notes ?? null },
    include: { skuMaster: { select: { id: true, skuCode: true, name: true, category: true, unit: true, unitCost: true, sellingPrice: true } } },
  })
  return NextResponse.json({ data: item }, { status: 201 })
})

export const DELETE = withAuth(async (req, { params }) => {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  const mappingId = searchParams.get('mappingId')
  if (!mappingId) return NextResponse.json({ error: 'mappingId required' }, { status: 400 })

  await prisma.accountProduct.deleteMany({ where: { id: mappingId, accountId: id } })
  return NextResponse.json({ ok: true })
})
