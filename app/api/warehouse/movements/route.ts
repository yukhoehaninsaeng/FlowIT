import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/middleware/withAuth'

export const GET = withAuth(async (req) => {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')

  const movements = await prisma.stockMovement.findMany({
    where: type ? { type } : {},
    include: { location: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return NextResponse.json({
    movements: movements.map(m => ({
      ...m,
      locationCode: m.location?.code ?? null,
    }))
  })
})

export const POST = withAuth(async (req) => {
  const body = await req.json()
  const movement = await prisma.stockMovement.create({ data: body })
  return NextResponse.json({ movement }, { status: 201 })
})
