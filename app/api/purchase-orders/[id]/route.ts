import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { prisma } from '@/lib/db'

export const PATCH = withAuth(async (req, { params }) => {
  const body = await req.json()
  const { status, channel } = body as { status: string; channel?: string }

  const po = await prisma.purchaseOrder.findUnique({
    where: { id: params?.id },
    include: { items: true }
  })
  if (!po) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // 발주 입고 트리거: Inventory 증가 + StockMovement 기록
  if (status === 'completed' && po.status !== 'completed' && po.type === 'purchase') {
    const stockChannel = channel ?? 'default'

    for (const item of po.items) {
      if (!item.skuMasterId) continue

      await prisma.inventory.upsert({
        where: { skuMasterId_channel: { skuMasterId: item.skuMasterId, channel: stockChannel } },
        update: { qtyAvailable: { increment: item.qty } },
        create: {
          skuMasterId: item.skuMasterId,
          channel: stockChannel,
          qtyAvailable: item.qty,
          qtyReserved: 0,
        }
      })

      await prisma.stockMovement.create({
        data: {
          type: 'inbound',
          skuMasterId: item.skuMasterId,
          skuName: item.skuName,
          qty: item.qty,
          lotNumber: item.lotNumber,
          referenceType: 'purchase_order',
          referenceId: po.id,
          notes: `발주 입고 확정: ${po.orderNo}`,
        }
      })
    }
  }

  const updated = await prisma.purchaseOrder.update({
    where: { id: params?.id },
    data: { status },
    include: { items: true }
  })

  return NextResponse.json({ order: updated })
})
