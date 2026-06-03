import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/middleware/withAuth'

export const GET = withAuth(async () => {
  const forecasts = await prisma.demandForecast.findMany({
    orderBy: [{ forecastDate: 'desc' }, { skuCode: 'asc' }],
    take: 500,
  })
  return NextResponse.json({ forecasts })
})
