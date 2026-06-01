import { NextResponse } from 'next/server'
import { runVocAnalysis } from '@/lib/services/vocAnalyzer'

// Vercel Cron: 매일 02:00 KST
export const POST = async () => {
  try {
    await runVocAnalysis()
    return NextResponse.json({ data: { message: 'VOC analysis completed' } })
  } catch (err) {
    console.error('VOC analysis failed:', err)
    return NextResponse.json({ error: 'VOC analysis failed' }, { status: 500 })
  }
}
