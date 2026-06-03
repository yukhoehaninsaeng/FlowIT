import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/middleware/withAuth'

export const GET = withAuth(async (req) => {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') // 'purchase' | 'sales'
  const status = searchParams.get('status')

  const orders = await prisma.purchaseOrder.findMany({
    where: {
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
    },
    include: { items: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return NextResponse.json({ orders })
})

export const POST = withAuth(async (req) => {
  const body = await req.json()
  const { items, ...rest } = body

  const orderNo = `PO-${Date.now()}`
  const order = await prisma.purchaseOrder.create({
    data: {
      ...rest,
      orderNo,
      items: items?.length
        ? { create: items }
        : undefined,
    },
    include: { items: true },
  })

  return NextResponse.json({ order }, { status: 201 })
})
