import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { prisma } from '@/lib/db'

export const GET = withAuth(async (_req, { session }) => {
  const row = await prisma.userBiDashboard.findUnique({ where: { userId: session.user.id } })
  return NextResponse.json({ charts: row?.charts ?? [] })
})

export const PUT = withAuth(async (req, { session }) => {
  const { charts } = await req.json()
  await prisma.userBiDashboard.upsert({
    where:  { userId: session.user.id },
    create: { userId: session.user.id, charts },
    update: { charts },
  })
  return NextResponse.json({ ok: true })
})
