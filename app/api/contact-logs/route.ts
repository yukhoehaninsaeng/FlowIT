import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/middleware/withAuth'
import { syncAccountEmailDomain } from '@/lib/services/emailDomainMatcher'

export const GET = withAuth(async (req) => {
  const { searchParams } = new URL(req.url)
  const accountId = searchParams.get('accountId')
  const dealId = searchParams.get('dealId')
  const type = searchParams.get('type')
  const unmatched = searchParams.get('unmatched') === 'true'

  const logs = await prisma.contactLog.findMany({
    where: {
      ...(accountId ? { accountId } : {}),
      ...(dealId ? { dealId } : {}),
      ...(type ? { type } : {}),
      ...(unmatched ? { accountId: null } : {}),
    },
    include: {
      account: { select: { id: true, name: true } },
      deal: { select: { id: true, title: true } },
    },
    orderBy: { occurredAt: 'desc' },
    take: 200,
  })

  return NextResponse.json({ logs })
})

export const POST = withAuth(async (req, { session }) => {
  const body = await req.json()
  const log = await prisma.contactLog.create({
    data: {
      ...body,
      createdById: session.user.id,
    },
    include: {
      account: { select: { id: true, name: true } },
    },
  })
  return NextResponse.json({ log }, { status: 201 })
})
