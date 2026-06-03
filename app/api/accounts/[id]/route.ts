import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/middleware/withAuth'
import { syncAccountEmailDomain } from '@/lib/services/emailDomainMatcher'

export const GET = withAuth(async (_req, { params }) => {
  const account = await prisma.account.findUnique({
    where: { id: params.id },
    include: {
      deals: { orderBy: { createdAt: 'desc' } },
      contactLogs: { orderBy: { occurredAt: 'desc' }, take: 50 },
      quotes: { orderBy: { createdAt: 'desc' }, take: 20 },
      receivables: {
        include: { payments: true },
        orderBy: { dueDate: 'asc' },
      },
    },
  })
  if (!account) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ account })
})

export const PATCH = withAuth(async (req, { params }) => {
  const body = await req.json()
  const account = await prisma.account.update({
    where: { id: params.id },
    data: body,
  })
  if (body.contactEmail) {
    await syncAccountEmailDomain(account.id, body.contactEmail)
  }
  return NextResponse.json({ account })
})
