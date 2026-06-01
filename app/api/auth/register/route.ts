import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { hash } from 'bcryptjs'

const schema = z.object({
  token: z.string().min(1),
  name: z.string().min(2),
  password: z.string().min(8)
})

export const POST = async (req: NextRequest) => {
  const body = schema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
  }

  const invite = await prisma.inviteToken.findUnique({ where: { token: body.data.token } })
  if (!invite || invite.usedAt || invite.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email: invite.email } })
  if (existing) {
    return NextResponse.json({ error: 'User already exists' }, { status: 400 })
  }

  const passwordHash = await hash(body.data.password, 12)
  await prisma.$transaction([
    prisma.user.create({
      data: {
        email: invite.email,
        name: body.data.name,
        passwordHash,
        role: invite.role,
        groupId: invite.groupId ?? undefined
      }
    }),
    prisma.inviteToken.update({
      where: { token: body.data.token },
      data: { usedAt: new Date() }
    })
  ])

  return NextResponse.json({ data: { registered: true } }, { status: 201 })
}
