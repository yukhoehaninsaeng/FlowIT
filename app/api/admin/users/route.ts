import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { withAuditLog } from '@/lib/middleware/withAuditLog'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { UserRole } from '@prisma/client'
import { randomBytes } from 'crypto'
import { Resend } from 'resend'

function getResend() { return new Resend(process.env.RESEND_API_KEY) }

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(UserRole),
  groupId: z.string().optional()
})

export const GET = withAuth(async (req) => {
  const { searchParams } = req.nextUrl
  const cursor = searchParams.get('cursor') ?? undefined
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 100)

  const items = await prisma.user.findMany({
    take: limit + 1,
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, email: true, name: true, role: true,
      groupId: true, group: { select: { name: true } },
      isActive: true, lastLoginAt: true, createdAt: true
    }
  })

  const hasMore = items.length > limit
  if (hasMore) items.pop()

  return NextResponse.json({
    data: items,
    meta: { nextCursor: hasMore ? items[items.length - 1]?.id : null, hasMore }
  })
}, [UserRole.SUPER_ADMIN, UserRole.ADMIN])

export const POST = withAuditLog(
  withAuth(async (req) => {
    const body = inviteSchema.safeParse(await req.json())
    if (!body.success) {
      return NextResponse.json({ error: 'Validation failed', details: body.error.flatten() }, { status: 400 })
    }

    const token = randomBytes(32).toString('hex')
    const invite = await prisma.inviteToken.create({
      data: {
        token,
        email: body.data.email,
        role: body.data.role,
        groupId: body.data.groupId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    })

    const inviteUrl = `${process.env.AUTH_URL}/invite/${token}`
    await getResend().emails.send({
      from: process.env.EMAIL_FROM ?? 'noreply@flowit.kr',
      to: body.data.email,
      subject: 'FlowIT CRM 초대',
      html: `<p>초대 링크: <a href="${inviteUrl}">${inviteUrl}</a></p><p>7일 후 만료됩니다.</p>`
    })

    return NextResponse.json({ data: invite }, { status: 201 })
  }, [UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  { action: 'INVITE', resource: 'user' }
)
