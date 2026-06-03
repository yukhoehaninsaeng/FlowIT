import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/middleware/withAuth'

export const GET = withAuth(async (_req, { params }) => {
  const quote = await prisma.quote.findUnique({
    where: { id: params.id },
    include: {
      account: true,
      deal: true,
    },
  })
  if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ quote })
})

export const PATCH = withAuth(async (req, { params, session }) => {
  const body = await req.json()
  const { items, taxRate, ...rest } = body

  let extra: Record<string, unknown> = {}
  if (items) {
    const subtotal = (items as Array<{ total: number }>).reduce((s, i) => s + i.total, 0)
    const rate = taxRate ?? 10
    const taxAmount = subtotal * (rate / 100)
    extra = { items, subtotal, taxRate: rate, taxAmount, totalAmount: subtotal + taxAmount }
  }

  // approval
  if (rest.status === 'accepted' && !rest.approvedById) {
    extra.approvedById = session.user.id
    extra.approvedAt = new Date()
  }
  if (rest.status === 'sent' && !rest.sentAt) {
    extra.sentAt = new Date()
  }

  const quote = await prisma.quote.update({
    where: { id: params.id },
    data: { ...rest, ...extra },
    include: { account: true, deal: true },
  })
  return NextResponse.json({ quote })
})

// POST /api/quotes/:id — create new version
export const POST = withAuth(async (_req, { params, session }) => {
  const original = await prisma.quote.findUnique({ where: { id: params.id } })
  if (!original) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  function generateQuoteNo(): string {
    const now = new Date()
    const yymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    return `QT-${yymm}-${Math.floor(Math.random() * 9000) + 1000}`
  }

  const newVersion = await prisma.quote.create({
    data: {
      quoteNo: generateQuoteNo(),
      accountId: original.accountId,
      dealId: original.dealId,
      version: original.version + 1,
      parentId: original.id,
      status: 'draft',
      title: original.title,
      items: original.items as object,
      subtotal: original.subtotal,
      taxRate: original.taxRate,
      taxAmount: original.taxAmount,
      totalAmount: original.totalAmount,
      validUntil: original.validUntil,
      notes: original.notes,
      terms: original.terms,
      createdById: session.user.id,
    },
    include: { account: true, deal: true },
  })

  return NextResponse.json({ quote: newVersion }, { status: 201 })
})
