import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/middleware/withAuth'

export const GET = withAuth(async (req) => {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  const shipments = await prisma.shipment.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return NextResponse.json({ shipments })
})

export const POST = withAuth(async (req) => {
  const body = await req.json()
  const shipment = await prisma.shipment.create({ data: body })
  return NextResponse.json({ shipment }, { status: 201 })
})
