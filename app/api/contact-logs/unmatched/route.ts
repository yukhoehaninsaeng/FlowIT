import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/middleware/withAuth'

// GET — emails not yet matched to any account
export const GET = withAuth(async (req) => {
  const { searchParams } = new URL(req.url)
  const take = parseInt(searchParams.get('take') ?? '50')

  const logs = await prisma.contactLog.findMany({
    where: { accountId: null, type: 'email' },
    orderBy: { occurredAt: 'desc' },
    take,
  })

  return NextResponse.json({ logs, count: logs.length })
})

// PATCH — assign an unmatched email to an account
export const PATCH = withAuth(async (req) => {
  const { logId, accountId, dealId } = await req.json() as {
    logId: string
    accountId?: string
    dealId?: string
  }

  const log = await prisma.contactLog.update({
    where: { id: logId },
    data: {
      ...(accountId ? { accountId } : {}),
      ...(dealId ? { dealId } : {}),
    },
  })

  // sync domain to account for future auto-matching
  if (accountId && log.fromEmail) {
    const { syncAccountEmailDomain } = await import('@/lib/services/emailDomainMatcher')
    await syncAccountEmailDomain(accountId, log.fromEmail)
  }

  return NextResponse.json({ log })
})
