import { NextResponse } from 'next/server'
import { runRfmBatch } from '@/lib/services/rfmCalculator'

// Vercel Cron: 매일 03:00 KST
// Authorization 헤더는 middleware.ts에서 검증
export const POST = async () => {
  try {
    await runRfmBatch()
    return NextResponse.json({ data: { message: 'RFM batch completed' } })
  } catch (err) {
    console.error('RFM cron failed:', err)
    return NextResponse.json({ error: 'RFM batch failed' }, { status: 500 })
  }
}
