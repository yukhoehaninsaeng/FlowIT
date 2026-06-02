import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/middleware/withAuth'
import { syncAccountEmailDomain } from '@/lib/services/emailDomainMatcher'

export const GET = withAuth(async (req) => {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')

  const accounts = await prisma.account.findMany({
    where: q ? {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { contactEmail: { contains: q, mode: 'insensitive' } },
        { emailDomain: { contains: q, mode: 'insensitive' } },
      ]
    } : {},
    include: {
      _count: { select: { deals: true, contactLogs: true, receivables: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return NextResponse.json({ accounts })
})

export const POST = withAuth(async (req, { session }) => {
  const body = await req.json()

  const account = await prisma.account.create({ data: body })

  // auto-sync email domain
  if (account.contactEmail) {
    await syncAccountEmailDomain(account.id, account.contactEmail)
  }

  return NextResponse.json({ account }, { status: 201 })
})
