import { prisma } from '@/lib/db'


const PAID_STATUSES = ['PAID', 'SHIPPED', 'DELIVERED']
const CHUNK_SIZE = 1000

function calcR(daysSinceLastPurchase: number): number {
  if (daysSinceLastPurchase <= 30) return 5
  if (daysSinceLastPurchase <= 60) return 4
  if (daysSinceLastPurchase <= 90) return 3
  if (daysSinceLastPurchase <= 180) return 2
  return 1
}

function calcF(count: number): number {
  if (count >= 5) return 5
  if (count === 4) return 4
  if (count === 3) return 3
  if (count === 2) return 2
  return 1
}

function calcM(amount: number): number {
  if (amount >= 500000) return 5
  if (amount >= 300000) return 4
  if (amount >= 150000) return 3
  if (amount >= 50000) return 2
  return 1
}

function determineSegment(r: number, f: number, m: number, total: number, createdAt: Date): string {
  const daysSinceCreation = Math.floor((Date.now() - createdAt.getTime()) / 86400000)
  if (daysSinceCreation < 30 && f <= 2) return 'new'
  if (total >= 13) return 'vip'
  if (r === 1 && f <= 2) return 'churn_risk'
  if (f >= 5 && r >= 3) return 'loyal'
  return 'normal'
}

export async function runRfmBatch() {
  const since = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
  const customerIds = await prisma.customer.findMany({
    where: { isActive: true },
    select: { id: true, createdAt: true }
  })

  for (let i = 0; i < customerIds.length; i += CHUNK_SIZE) {
    const chunk = customerIds.slice(i, i + CHUNK_SIZE)
    await Promise.all(chunk.map(async ({ id, createdAt }) => {
      const orders = await prisma.order.findMany({
        where: { customerId: id, status: { in: PAID_STATUSES }, orderedAt: { gte: since } },
        select: { orderedAt: true, totalAmount: true }
      })

      if (orders.length === 0) return

      const lastPurchase = orders.reduce((a, b) => a.orderedAt > b.orderedAt ? a : b)
      const daysSince = Math.floor((Date.now() - lastPurchase.orderedAt.getTime()) / 86400000)
      const totalSpend = orders.reduce((sum, o) => sum + Number(o.totalAmount), 0)

      const r = calcR(daysSince)
      const f = calcF(orders.length)
      const m = calcM(totalSpend)
      const total = r + f + m
      const segment = determineSegment(r, f, m, total, createdAt)

      await prisma.customer.update({
        where: { id },
        data: {
          rfmScore: { r, f, m, total },
          segment,
          ltv: totalSpend
        }
      })
    }))
  }
}
