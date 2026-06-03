import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/middleware/withAuth'

export const GET = withAuth(async () => {
  const movements = await prisma.stockMovement.findMany({
    where: { lotNumber: { not: null }, type: 'inbound' },
    include: { location: true },
    orderBy: { createdAt: 'desc' },
  })

  const skuIds = [...new Set(movements.map(m => m.skuMasterId).filter(Boolean))] as string[]
  const skus = await prisma.skuMaster.findMany({ where: { id: { in: skuIds } } })
  const skuMap = Object.fromEntries(skus.map(s => [s.id, s]))

  const now = Date.now()
  const WARN_DAYS = 60

  const lots = movements.map(m => {
    const sku = m.skuMasterId ? skuMap[m.skuMasterId] : null
    const expiry = m.lotExpiry ?? sku?.lotExpiry ?? null
    const daysLeft = expiry ? Math.floor((new Date(expiry).getTime() - now) / 86400000) : null
    const status =
      daysLeft === null ? 'no_expiry' :
      daysLeft < 0 ? 'expired' :
      daysLeft <= WARN_DAYS ? 'warning' : 'ok'

    return {
      id: m.id,
      skuCode: m.skuCode ?? sku?.skuCode ?? '',
      skuName: m.skuName ?? sku?.name ?? '',
      lotNumber: m.lotNumber!,
      qty: m.qty,
      lotExpiry: expiry?.toISOString() ?? null,
      daysLeft,
      status,
    }
  })

  return NextResponse.json({ lots })
})
