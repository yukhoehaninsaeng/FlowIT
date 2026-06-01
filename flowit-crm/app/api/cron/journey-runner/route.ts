import { NextResponse } from 'next/server'
import { runJourneyBatch } from '@/lib/services/journeyEngine'

// Vercel Cron: 1시간마다
export const POST = async () => {
  try {
    await runJourneyBatch()
    return NextResponse.json({ data: { message: 'Journey runner completed' } })
  } catch (err) {
    console.error('Journey runner failed:', err)
    return NextResponse.json({ error: 'Journey runner failed' }, { status: 500 })
  }
}
