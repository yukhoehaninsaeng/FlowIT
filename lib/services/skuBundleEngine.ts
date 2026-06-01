import { prisma } from '@/lib/db'

export async function expandBundleItem(orderId: string, orderItemId: string) {
  const item = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: { skuMaster: { include: { bundleItems: { include: { componentSku: true } } } } }
  })
  if (!item || !item.skuMaster.isBundle) return

  for (const bundle of item.skuMaster.bundleItems) {
    const componentQty = item.qty * bundle.qty
    const basePrice = Number(item.unitPrice)
    const componentPrice = bundle.isGift ? 0 : basePrice * Number(bundle.costRatio)

    await prisma.orderItem.create({
      data: {
        orderId,
        skuMasterId: bundle.componentSkuId,
        qty: componentQty,
        unitPrice: componentPrice,
        isBundleItem: true,
        parentItemId: orderItemId
      }
    })

    await prisma.inventory.updateMany({
      where: { skuMasterId: bundle.componentSkuId },
      data: { qtyAvailable: { decrement: componentQty } }
    })
  }
}
