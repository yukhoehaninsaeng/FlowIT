import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'
import Papa from 'papaparse'

export const GET = withAuth(async (req) => {
  const { searchParams } = req.nextUrl
  const cursor = searchParams.get('cursor') ?? undefined
  const limit = Math.min(Number(searchParams.get('limit') ?? 50), 200)
  const userId = searchParams.get('userId') ?? undefined
  const action = searchParams.get('action') ?? undefined
  const resource = searchParams.get('resource') ?? undefined
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const format = searchParams.get('format')

  const where = {
    ...(userId ? { userId } : {}),
    ...(action ? { action } : {}),
    ...(resource ? { resource } : {}),
    ...(startDate || endDate ? {
      createdAt: {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate) } : {})
      }
    } : {})
  }

  if (format === 'csv') {
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    const logs = await prisma.auditLog.findMany({
      where: { ...where, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } } }
    })
    const csv = Papa.unparse(logs.map(l => ({
      id: l.id, user: l.user.name, email: l.user.email,
      action: l.action, resource: l.resource, resourceId: l.resourceId,
      ip: l.ip, createdAt: l.createdAt.toISOString()
    })))
    return new NextResponse(csv, {
      headers: { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="audit-logs.csv"' }
    })
  }

  const items = await prisma.auditLog.findMany({
    where,
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { name: true, email: true } } }
  })

  const hasMore = items.length > limit
  if (hasMore) items.pop()

  return NextResponse.json({
    data: items,
    meta: { nextCursor: hasMore ? items[items.length - 1]?.id : null, hasMore }
  })
}, [UserRole.SUPER_ADMIN, UserRole.ADMIN])
