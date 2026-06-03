import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/middleware/withAuth'

function generateInvoiceNo(): string {
  const now = new Date()
  const yymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  return `INV-${yymm}-${Math.floor(Math.random() * 9000) + 1000}`
}

export const GET = withAuth(async (req) => {
  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('accountId')
  const status = searchParams.get('status')

  const now = new Date()

  const receivables = await prisma.receivable.findMany({
    where: {
      ...(accountId ? { accountId } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      account: { select: { id: true, name: true } },
      deal: { select: { id: true, title: true } },
      payments: { orderBy: { paidAt: 'desc' } },
    },
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    take: 200,
  })

  // auto-compute overdue status
  const enriched = receivables.map(r => {
    const overdueDays = r.status !== 'paid'
      ? Math.max(0, Math.floor((now.getTime() - r.dueDate.getTime()) / 86400000))
      : 0
    const balance = Number(r.amount) - Number(r.paidAmount)
    return { ...r, overdueDays, balance }
  })

  // summary stats
  const stats = {
    totalUnpaid: enriched.filter(r => r.status !== 'paid').reduce((s, r) => s + r.balance, 0),
    overdueCount: enriched.filter(r => r.overdueDays > 0 && r.status !== 'paid').length,
    totalOverdue: enriched.filter(r => r.overdueDays > 0 && r.status !== 'paid').reduce((s, r) => s + r.balance, 0),
    count: enriched.length,
  }

  return NextResponse.json({ receivables: enriched, stats })
})

export const POST = withAuth(async (req, { session }) => {
  const body = await req.json()

  const receivable = await prisma.receivable.create({
    data: {
      ...body,
      invoiceNo: generateInvoiceNo(),
      paidAmount: 0,
      status: 'unpaid',
      createdById: session.user.id,
    },
    include: {
      account: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json({ receivable }, { status: 201 })
})
