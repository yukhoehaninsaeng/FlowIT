import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/middleware/withAuth'

export const GET = withAuth(async (req) => {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  const returns = await prisma.return.findMany({
    where: status ? { status } : {},
    include: { items: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return NextResponse.json({
    returns: returns.map(r => ({
      ...r,
      itemCount: r.items.length,
    }))
  })
})

export const POST = withAuth(async (req) => {
  const body = await req.json()
  const { items, ...rest } = body

  const returnNo = `RET-${Date.now()}`
  const ret = await prisma.return.create({
    data: {
      ...rest,
      returnNo,
      items: items?.length ? { create: items } : undefined,
    },
    include: { items: true },
  })

  return NextResponse.json({ return: ret }, { status: 201 })
})
