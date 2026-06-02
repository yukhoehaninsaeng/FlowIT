import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/middleware/withAuth'

export const GET = withAuth(async (req) => {
  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period')
  const status = searchParams.get('status')

  const settlements = await prisma.settlement.findMany({
    where: {
      ...(period ? { period } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: [{ period: 'desc' }, { createdAt: 'desc' }],
    take: 200,
  })

  return NextResponse.json({ settlements })
})

export const POST = withAuth(async (req) => {
  const body = await req.json()
  const settlement = await prisma.settlement.create({ data: body })
  return NextResponse.json({ settlement }, { status: 201 })
})
