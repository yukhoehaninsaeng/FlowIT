import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/middleware/withAuth'
import { syncEmailsForAccount } from '@/lib/services/gmailSync'

// POST — manually trigger email sync
export const POST = withAuth(async (req) => {
  const body = await req.json().catch(() => ({})) as { syncId?: string }

  const syncs = body.syncId
    ? await prisma.emailSync.findMany({ where: { id: body.syncId, isActive: true } })
    : await prisma.emailSync.findMany({ where: { isActive: true } })

  let total = 0
  for (const sync of syncs) {
    const { synced } = await syncEmailsForAccount(sync.id)
    total += synced
  }

  return NextResponse.json({ synced: total })
}, ['admin', 'super_admin'])
