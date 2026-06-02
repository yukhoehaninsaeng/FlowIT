import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { withAuditLog } from '@/lib/middleware/withAuditLog'
import { prisma } from '@/lib/db'
import { z } from 'zod'


const updateSchema = z.object({
  role: z.enum(['super_admin', 'admin', 'manager', 'member', 'viewer']).optional(),
  groupId: z.string().nullable().optional(),
  isActive: z.boolean().optional()
})

export const PATCH = withAuditLog(
  withAuth(async (req, { params }) => {
    const body = updateSchema.safeParse(await req.json())
    if (!body.success) {
      return NextResponse.json({ error: 'Validation failed', details: body.error.flatten() }, { status: 400 })
    }
    const user = await prisma.user.update({
      where: { id: params?.id },
      data: body.data,
      select: { id: true, email: true, name: true, role: true, isActive: true }
    })
    return NextResponse.json({ data: user })
  }, ['super_admin', 'admin']),
  { action: 'UPDATE', resource: 'user', getResourceId: (req) => req.nextUrl.pathname.split('/').at(-1) }
)

export const DELETE = withAuditLog(
  withAuth(async (req, { params, session }) => {
    if (params?.id === session.user.id) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })
    }
    await prisma.user.delete({ where: { id: params?.id } })
    return NextResponse.json({ data: { deleted: true } })
  }, ['super_admin']),
  { action: 'DELETE', resource: 'user', getResourceId: (req) => req.nextUrl.pathname.split('/').at(-1) }
)
