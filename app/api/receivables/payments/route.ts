import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/middleware/withAuth'

export const POST = withAuth(async (req, { session }) => {
  const { receivableId, amount, method, bankRef, notes, paidAt } = await req.json()

  const payment = await prisma.receivablePayment.create({
    data: {
      receivableId,
      amount,
      method,
      bankRef,
      notes,
      paidAt: paidAt ? new Date(paidAt) : new Date(),
      createdById: session.user.id,
    },
  })

  // update paid amount and status on receivable
  const receivable = await prisma.receivable.findUnique({
    where: { id: receivableId },
    include: { payments: true },
  })
  if (!receivable) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const totalPaid = receivable.payments.reduce((s, p) => s + Number(p.amount), 0)
  const total = Number(receivable.amount)
  const status =
    totalPaid >= total ? 'paid' :
    totalPaid > 0 ? 'partial' : 'unpaid'

  await prisma.receivable.update({
    where: { id: receivableId },
    data: { paidAmount: totalPaid, status },
  })

  return NextResponse.json({ payment, status }, { status: 201 })
})
