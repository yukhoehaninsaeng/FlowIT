import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/middleware/withAuth'

// Simple statistical forecast: uses last 3 months average + 10% seasonal adjustment
export const POST = withAuth(async () => {
  const skus = await prisma.skuMaster.findMany({
    where: { isActive: true },
    include: {
      orderItems: {
        where: {
          order: {
            orderedAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) }
          }
        },
        include: { order: true }
      }
    },
    take: 100,
  })

  const nextMonth = new Date()
  nextMonth.setMonth(nextMonth.getMonth() + 1)
  nextMonth.setDate(1)

  const upserts = skus.map(sku => {
    const totalQty = sku.orderItems.reduce((s, i) => s + i.qty, 0)
    const monthlyAvg = Math.ceil(totalQty / 3)
    const forecastQty = Math.max(1, monthlyAvg)
    const confidence = Math.min(0.95, 0.5 + (sku.orderItems.length / 100))

    return prisma.demandForecast.upsert({
      where: {
        // use a composite that works: find by skuMasterId + forecastDate
        id: `forecast-${sku.id}-${nextMonth.toISOString().slice(0, 7)}`,
      },
      update: { forecastQty, confidence: confidence.toString(), modelVersion: 'v1-avg' },
      create: {
        id: `forecast-${sku.id}-${nextMonth.toISOString().slice(0, 7)}`,
        skuMasterId: sku.id,
        skuCode: sku.skuCode,
        skuName: sku.name,
        forecastDate: nextMonth,
        forecastQty,
        confidence: confidence.toString(),
        modelVersion: 'v1-avg',
        factors: { method: 'moving_average_3m', dataPts: sku.orderItems.length },
      },
    })
  })

  await Promise.all(upserts)

  return NextResponse.json({ generated: skus.length })
})
