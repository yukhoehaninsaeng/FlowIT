import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { withAuditLog } from '@/lib/middleware/withAuditLog'
import { prisma } from '@/lib/db'
import { UserRole } from '@prisma/client'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export const POST = withAuditLog(
  withAuth(async (req, { params }) => {
    const campaign = await prisma.campaign.findUnique({ where: { id: params?.id } })
    if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (campaign.status !== 'DRAFT' && campaign.status !== 'SCHEDULED') {
      return NextResponse.json({ error: 'Campaign already sent or in progress' }, { status: 400 })
    }

    await prisma.campaign.update({ where: { id: params?.id }, data: { status: 'SENDING' } })

    // 세그먼트 필터 기준으로 수신 대상 고객 조회
    const filter = campaign.segmentFilter as { segment?: string }
    const customers = await prisma.customer.findMany({
      where: { isActive: true, ...(filter.segment ? { segment: filter.segment } : {}) },
      select: { id: true, email: true, name: true }
    })

    // 이메일 발송 (Resend)
    const sends = []
    for (const customer of customers) {
      if (campaign.type === 'EMAIL' && customer.email) {
        const useA = !campaign.abEnabled || Math.random() * 100 < campaign.abRatioA
        const message = useA ? campaign.messageA : (campaign.messageB ?? campaign.messageA)
        try {
          await resend.emails.send({
            from: process.env.EMAIL_FROM ?? 'noreply@flowit.kr',
            to: customer.email,
            subject: campaign.name,
            html: message
          })
          sends.push({ campaignId: campaign.id, customerId: customer.id, variant: useA ? 'A' : 'B', status: 'sent' })
        } catch {
          sends.push({ campaignId: campaign.id, customerId: customer.id, variant: useA ? 'A' : 'B', status: 'bounced' })
        }
      } else {
        sends.push({ campaignId: campaign.id, customerId: customer.id, status: 'sent' })
      }
    }

    await prisma.campaignSend.createMany({ data: sends })
    await prisma.campaign.update({
      where: { id: params?.id },
      data: { status: 'DONE', sentAt: new Date() }
    })

    return NextResponse.json({ data: { sent: sends.length } })
  }, [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]),
  { action: 'SEND', resource: 'campaign', getResourceId: (req) => req.nextUrl.pathname.split('/').at(-2) }
)
