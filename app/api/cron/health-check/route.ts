import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Vercel Cron: 5분마다
// Vercel Hobby: 단일 Cron 제약으로 인해 Pro 플랜 전용
export const POST = async () => {
  const connections = await prisma.apiConnection.findMany()
  const results = []

  for (const conn of connections) {
    const start = Date.now()
    let status = 'connected'
    let errorMessage: string | undefined
    let latency = 0

    try {
      const res = await fetch(conn.endpoint, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
      latency = Date.now() - start
      if (res.ok) {
        status = latency >= 500 ? 'delayed' : 'connected'
      } else {
        status = 'error'
        errorMessage = `HTTP ${res.status}`
      }
    } catch (err) {
      latency = Date.now() - start
      status = 'error'
      errorMessage = String(err)
    }

    await prisma.apiConnection.update({
      where: { id: conn.id },
      data: { status, lastLatencyMs: latency, lastCheckedAt: new Date(), errorMessage: errorMessage ?? null }
    })

    results.push({ id: conn.id, name: conn.name, status, latency })
  }

  return NextResponse.json({ data: results })
}
