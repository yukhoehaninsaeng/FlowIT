import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/middleware/withAuth'

function generateQuoteNo(): string {
  const now = new Date()
  const yymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  const rand = Math.floor(Math.random() * 9000) + 1000
  return `QT-${yymm}-${rand}`
}

export const GET = withAuth(async (req) => {
  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('accountId')
  const dealId = searchParams.get('dealId')
  const status = searchParams.get('status')

  const quotes = await prisma.quote.findMany({
    where: {
      ...(accountId ? { accountId } : {}),
      ...(dealId ? { dealId } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      account: { select: { id: true, name: true } },
      deal: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return NextResponse.json({ quotes })
})

export const POST = withAuth(async (req, { session }) => {
  const body = await req.json()
  const { items, taxRate = 10, ...rest } = body

  const subtotal = (items as Array<{ total: number }>).reduce((s, i) => s + i.total, 0)
  const taxAmount = subtotal * (taxRate / 100)
  const totalAmount = subtotal + taxAmount

  const quote = await prisma.quote.create({
    data: {
      ...rest,
      quoteNo: generateQuoteNo(),
      items,
      subtotal,
      taxRate,
      taxAmount,
      totalAmount,
      createdById: session.user.id,
    },
    include: {
      account: { select: { id: true, name: true } },
      deal: { select: { id: true, title: true } },
    },
  })

  return NextResponse.json({ quote }, { status: 201 })
})
