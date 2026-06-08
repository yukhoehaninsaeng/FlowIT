import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { prisma } from '@/lib/db'

export const PATCH = withAuth(async (req, { params }) => {
  const body = await req.json()
  const { status } = body as { status: string }

  const ret = await prisma.return.findUnique({
    where: { id: params?.id },
    include: { items: true }
  })
  if (!ret) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // 재입고 트리거: Inventory 증가 + StockMovement 기록
  if (status === 'restocked' && ret.status !== 'restocked') {
    let channel = 'default'
    if (ret.orderId) {
      const order = await prisma.order.findUnique({
        where: { id: ret.orderId },
        select: { channel: true }
      })
      if (order) channel = order.channel
    }

    for (const item of ret.items) {
      if (!item.skuMasterId) continue

      await prisma.inventory.upsert({
        where: { skuMasterId_channel: { skuMasterId: item.skuMasterId, channel } },
        update: { qtyAvailable: { increment: item.qty } },
        create: {
          skuMasterId: item.skuMasterId,
          channel,
          qtyAvailable: item.qty,
          qtyReserved: 0,
        }
      })

      await prisma.stockMovement.create({
        data: {
          type: 'return',
          skuMasterId: item.skuMasterId,
          skuName: item.skuName,
          qty: item.qty,
          lotNumber: item.lotNumber,
          referenceType: 'return',
          referenceId: ret.id,
          notes: `반품 재입고: ${ret.returnNo}`,
        }
      })
    }
  }

  const updated = await prisma.return.update({
    where: { id: params?.id },
    data: {
      status,
      ...(status === 'received' ? { receivedAt: new Date() } : {}),
      ...(['restocked', 'refunded', 'rejected'].includes(status) ? { resolvedAt: new Date() } : {}),
    },
    include: { items: true }
  })

  return NextResponse.json({ return: updated })
})
