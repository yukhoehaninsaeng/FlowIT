import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'

export const POST = withAuth(async (req, { params }) => {
  const conn = await prisma.apiConnection.findUnique({ where: { id: params?.id } })
  if (!conn) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const start = Date.now()
  let status = 'connected'
  let errorMessage: string | undefined

  try {
    const res = await fetch(conn.endpoint, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
    const latency = Date.now() - start
    if (res.ok) {
      status = latency >= 500 ? 'delayed' : 'connected'
    } else {
      status = 'error'
      errorMessage = `HTTP ${res.status}`
    }

    await prisma.apiConnection.update({
      where: { id: params?.id },
      data: { status, lastLatencyMs: latency, lastCheckedAt: new Date(), errorMessage: errorMessage ?? null }
    })

    return NextResponse.json({ data: { status, latencyMs: latency } })
  } catch (err) {
    await prisma.apiConnection.update({
      where: { id: params?.id },
      data: { status: 'error', lastCheckedAt: new Date(), errorMessage: String(err) }
    })
    return NextResponse.json({ data: { status: 'error', error: String(err) } })
  }
}, [UserRole.SUPER_ADMIN, UserRole.ADMIN])
