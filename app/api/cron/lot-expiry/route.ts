import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

// Vercel Cron: 매일 09:00 KST
export const POST = async () => {
  const now = new Date()
  const d60 = new Date(now.getTime() + 60 * 86400000)

  const expiringSkus = await prisma.skuMaster.findMany({
    where: { lotExpiry: { lte: d60, gte: now }, isActive: true },
    include: { inventory: true }
  })

  if (expiringSkus.length === 0) return NextResponse.json({ data: { count: 0 } })

  const rows = expiringSkus.map(sku => {
    const days = Math.ceil((sku.lotExpiry!.getTime() - now.getTime()) / 86400000)
    const tag = days <= 7 ? 'D-7' : days <= 30 ? 'D-30' : 'D-60'
    const totalQty = sku.inventory.reduce((s, i) => s + i.qtyAvailable, 0)
    return `<tr><td>${tag}</td><td>${sku.name}</td><td>${sku.skuCode}</td><td>${sku.lotExpiry!.toISOString().split('T')[0]}</td><td>${totalQty}</td></tr>`
  }).join('')

  const admins = await prisma.user.findMany({
    where: { role: { in: ['SUPER_ADMIN', 'ADMIN'] }, isActive: true },
    select: { email: true }
  })

  for (const admin of admins) {
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? 'noreply@flowit.kr',
      to: admin.email,
      subject: `[FlowIT] 유통기한 임박 SKU ${expiringSkus.length}건`,
      html: `<table border="1"><tr><th>구분</th><th>상품명</th><th>SKU코드</th><th>유통기한</th><th>잔여재고</th></tr>${rows}</table>`
    }).catch(console.error)
  }

  return NextResponse.json({ data: { count: expiringSkus.length } })
}
