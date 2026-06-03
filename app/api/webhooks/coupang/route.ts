import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'


export const POST = async (req: NextRequest) => {
  const body = await req.json()

  await prisma.channelOrderRaw.create({
    data: { channel: 'COUPANG', rawJson: body }
  })

  return NextResponse.json({ received: true })
}
