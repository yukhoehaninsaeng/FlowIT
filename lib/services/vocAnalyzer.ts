import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/db'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const BATCH_SIZE = 500

interface VocAnalysis {
  sentiment: 'positive' | 'neutral' | 'negative'
  tags: string[]
}

export async function runVocAnalysis() {
  const reviews = await prisma.vocReview.findMany({
    where: { analyzedAt: null },
    take: BATCH_SIZE,
    select: { id: true, content: true, skuMasterId: true }
  })

  for (const review of reviews) {
    try {
      const result = await analyzeReview(review.content ?? '')
      await prisma.vocReview.update({
        where: { id: review.id },
        data: { sentiment: result.sentiment, tags: result.tags, analyzedAt: new Date() }
      })
    } catch (err) {
      console.error(`VOC analysis failed for review ${review.id}:`, err)
    }
  }

  await detectAnomalies()
}

async function analyzeReview(content: string): Promise<VocAnalysis> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    system: '화장품 리뷰를 분석하라. 응답은 반드시 JSON만 출력하라. 형식: {"sentiment": "positive|neutral|negative", "tags": ["태그1", "태그2"]}',
    messages: [{ role: 'user', content: `리뷰: ${content}` }]
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : '{}'
  const parsed = JSON.parse(text.trim()) as VocAnalysis
  return { sentiment: parsed.sentiment ?? 'neutral', tags: Array.isArray(parsed.tags) ? parsed.tags : [] }
}

async function detectAnomalies() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const skuReviews = await prisma.vocReview.groupBy({
    by: ['skuMasterId'],
    where: { ingestedAt: { gte: since }, analyzedAt: { not: null } },
    _count: { id: true }
  })

  for (const { skuMasterId, _count } of skuReviews) {
    const negCount = await prisma.vocReview.count({
      where: { skuMasterId, sentiment: 'negative', ingestedAt: { gte: since } }
    })
    const negRatio = negCount / _count.id

    if (negRatio > 0.15 || negCount >= 10) {
      await prisma.vocReview.updateMany({
        where: { skuMasterId, ingestedAt: { gte: since }, sentiment: 'negative' },
        data: { isAlert: true }
      })
      await sendAlert(skuMasterId, negCount, negRatio)
    }
  }
}

async function sendAlert(skuMasterId: string, negCount: number, negRatio: number) {
  const url = process.env.SLACK_WEBHOOK_URL
  if (!url) return
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `⚠️ VOC 이상 징후: SKU ${skuMasterId} - 부정 리뷰 ${negCount}건 (비율 ${(negRatio * 100).toFixed(1)}%)`
    })
  }).catch(console.error)
}
