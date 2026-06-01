import { NextResponse } from 'next/server'
import { runVocAnalysis } from '@/lib/services/vocAnalyzer'
import { runRfmBatch } from '@/lib/services/rfmCalculator'
import { runJourneyBatch } from '@/lib/services/journeyEngine'
import { prisma } from '@/lib/db'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Vercel Hobby: 단일 일간 Cron (KST 03:00 = UTC 18:00 전일)
// Pro 플랜으로 업그레이드 시 vercel.json을 복수 Cron으로 분리한다.
export const POST = async () => {
  const results: Record<string, string> = {}

  // 1. VOC 분석 (빠른 API 호출 먼저)
  try {
    await runVocAnalysis()
    results.voc = 'ok'
  } catch (err) {
    results.voc = `error: ${err}`
    console.error('[cron/daily] voc-analyze failed:', err)
  }

  // 2. RFM 배치 (가장 무거운 작업)
  try {
    await runRfmBatch()
    results.rfm = 'ok'
  } catch (err) {
    results.rfm = `error: ${err}`
    console.error('[cron/daily] rfm failed:', err)
  }

  // 3. Journey 실행
  try {
    await runJourneyBatch()
    results.journey = 'ok'
  } catch (err) {
    results.journey = `error: ${err}`
    console.error('[cron/daily] journey-runner failed:', err)
  }

  // 4. 유통기한 알림
  try {
    await runLotExpiryCheck()
    results.lotExpiry = 'ok'
  } catch (err) {
    results.lotExpiry = `error: ${err}`
    console.error('[cron/daily] lot-expiry failed:', err)
  }

  // 5. API 헬스체크
  try {
    await runHealthCheck()
    results.healthCheck = 'ok'
  } catch (err) {
    results.healthCheck = `error: ${err}`
    console.error('[cron/daily] health-check failed:', err)
  }

  return NextResponse.json({ data: results })
}

async function runLotExpiryCheck() {
  const now = new Date()
  const d60 = new Date(now.getTime() + 60 * 86400000)

  const expiringSkus = await prisma.skuMaster.findMany({
    where: { lotExpiry: { lte: d60, gte: now }, isActive: true },
    include: { inventory: true }
  })

  if (expiringSkus.length === 0) return

  const rows = expiringSkus.map(sku => {
    const days = Math.ceil((sku.lotExpiry!.getTime() - now.getTime()) / 86400000)
    const tag = days <= 7 ? 'D-7' : days <= 30 ? 'D-30' : 'D-60'
    const totalQty = sku.inventory.reduce((s, i) => s + i.qtyAvailable, 0)
    return `<tr><td>${tag}</td><td>${sku.name}</td><td>${sku.skuCode}</td><td>${sku.lotExpiry!.toISOString().split('T')[0]}</td><td>${totalQty}</td></tr>`
  }).join('')

  const admins = await prisma.user.findMany({
    where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] }, isActive: true },
    select: { email: true }
  })

  for (const admin of admins) {
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? 'noreply@flowit.kr',
      to: admin.email,
      subject: `[FlowIT] 유통기한 임박 SKU ${expiringSkus.length}건`,
      html: `<table border="1"><tr><th>구분</th><th>상품명</th><th>SKU코드</th><th>유통기한</th><th>잔여재고</th></tr>${rows}</table>`
    }).catch(console.error)
  }
}

async function runHealthCheck() {
  const connections = await prisma.apiConnection.findMany()

  for (const conn of connections) {
    const start = Date.now()
    let status = 'connected'
    let errorMessage: string | undefined
    let latency = 0

    try {
      const res = await fetch(conn.endpoint, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
      latency = Date.now() - start
      status = res.ok ? (latency >= 500 ? 'delayed' : 'connected') : 'error'
      if (!res.ok) errorMessage = `HTTP ${res.status}`
    } catch (err) {
      latency = Date.now() - start
      status = 'error'
      errorMessage = String(err)
    }

    await prisma.apiConnection.update({
      where: { id: conn.id },
      data: { status, lastLatencyMs: latency, lastCheckedAt: new Date(), errorMessage: errorMessage ?? null }
    })
  }
}
