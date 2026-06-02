import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/middleware/withAuth'
import { getGmailAuthUrl } from '@/lib/services/gmailSync'

// GET — list connected email accounts
export const GET = withAuth(async () => {
  const syncs = await prisma.emailSync.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      provider: true,
      emailAddress: true,
      displayName: true,
      lastSyncAt: true,
      isActive: true,
      createdAt: true,
    },
  })
  return NextResponse.json({ syncs })
}, ['admin', 'super_admin'])

// POST — initiate Gmail OAuth
export const POST = withAuth(async (req) => {
  const { provider } = await req.json() as { provider: string }
  if (provider === 'gmail') {
    const url = getGmailAuthUrl()
    return NextResponse.json({ authUrl: url })
  }
  return NextResponse.json({ error: 'Unsupported provider' }, { status: 400 })
}, ['admin', 'super_admin'])

// DELETE — disconnect email sync
export const DELETE = withAuth(async (req) => {
  const { id } = await req.json() as { id: string }
  await prisma.emailSync.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ ok: true })
}, ['admin', 'super_admin'])
