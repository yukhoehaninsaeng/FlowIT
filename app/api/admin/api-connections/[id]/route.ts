import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { withAuditLog } from '@/lib/middleware/withAuditLog'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { UserRole } from '@prisma/client'
import { encrypt } from '@/lib/crypto'

const updateSchema = z.object({
  name: z.string().optional(),
  endpoint: z.string().url().optional(),
  token: z.string().optional(),
  refreshToken: z.string().optional()
})

export const PATCH = withAuditLog(
  withAuth(async (req, { params }) => {
    const body = updateSchema.safeParse(await req.json())
    if (!body.success) {
      return NextResponse.json({ error: 'Validation failed', details: body.error.flatten() }, { status: 400 })
    }
    const { token, refreshToken, ...rest } = body.data
    const conn = await prisma.apiConnection.update({
      where: { id: params?.id },
      data: {
        ...rest,
        ...(token ? { tokenEncrypted: encrypt(token) } : {}),
        ...(refreshToken ? { refreshToken: encrypt(refreshToken) } : {})
      }
    })
    return NextResponse.json({ data: { ...conn, tokenEncrypted: undefined, refreshToken: undefined } })
  }, [UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  { action: 'UPDATE', resource: 'api_connection', getResourceId: (req) => req.nextUrl.pathname.split('/').at(-1) }
)

export const DELETE = withAuditLog(
  withAuth(async (req, { params }) => {
    await prisma.apiConnection.delete({ where: { id: params?.id } })
    return NextResponse.json({ data: { deleted: true } })
  }, [UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  { action: 'DELETE', resource: 'api_connection', getResourceId: (req) => req.nextUrl.pathname.split('/').at(-1) }
)
