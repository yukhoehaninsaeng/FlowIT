import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { withAuditLog } from '@/lib/middleware/withAuditLog'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateSchema = z.object({
  title: z.string().optional(),
  stage: z.enum(['LEAD', 'MEETING', 'QUOTE', 'REVIEW', 'CLOSED']).optional(),
  amount: z.number().int().positive().optional(),
  probability: z.number().int().min(0).max(100).optional(),
  assigneeId: z.string().optional(),
  expectedClose: z.string().datetime().optional(),
  notes: z.string().optional()
})

function generateInvoiceNo(): string {
  const now = new Date()
  const yymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
  return `INV-${yymm}-${Math.floor(Math.random() * 9000) + 1000}`
}

export const PATCH = withAuditLog(
  withAuth(async (req, { params, session }) => {
    const body = updateSchema.safeParse(await req.json())
    if (!body.success) {
      return NextResponse.json({ error: 'Validation failed', details: body.error.flatten() }, { status: 400 })
    }

    // 변경 전 현재 stage 확인
    const before = await prisma.deal.findUnique({
      where: { id: params?.id },
      select: { stage: true, accountId: true, amount: true, expectedClose: true }
    })

    const deal = await prisma.deal.update({
      where: { id: params?.id },
      data: {
        ...body.data,
        expectedClose: body.data.expectedClose ? new Date(body.data.expectedClose) : undefined,
        ...(body.data.stage ? { stageChangedAt: new Date() } : {})
      },
      include: { account: { select: { id: true, name: true } } }
    })

    // Deal CLOSED 트리거: 미수금 자동 생성
    if (body.data.stage === 'CLOSED' && before?.stage !== 'CLOSED') {
      const existingReceivable = await prisma.receivable.findFirst({
        where: { dealId: deal.id }
      })
      if (!existingReceivable) {
        const now = new Date()
        const dueDate = deal.expectedClose ?? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
        await prisma.receivable.create({
          data: {
            invoiceNo: generateInvoiceNo(),
            accountId: deal.accountId,
            dealId: deal.id,
            amount: deal.amount,
            paidAmount: 0,
            dueDate,
            status: 'unpaid',
            createdById: session.user.id,
          }
        })
      }
    }

    return NextResponse.json({ data: deal })
  }),
  { action: 'UPDATE', resource: 'deal', getResourceId: (req) => req.nextUrl.pathname.split('/').at(-1) }
)
