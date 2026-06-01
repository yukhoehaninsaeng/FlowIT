import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { withAuditLog } from '@/lib/middleware/withAuditLog'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { UserRole, Channel } from '@prisma/client'
import { encrypt } from '@/lib/crypto'

const createSchema = z.object({
  name: z.string().min(1),
  channel: z.nativeEnum(Channel),
  endpoint: z.string().url(),
  authType: z.enum(['api_key', 'oauth2', 'basic']),
  token: z.string().optional(),
  refreshToken: z.string().optional(),
  tokenExpiresAt: z.string().datetime().optional()
})

export const GET = withAuth(async () => {
  const items = await prisma.apiConnection.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, name: true, channel: true, endpoint: true,
      authType: true, status: true, lastLatencyMs: true,
      lastCheckedAt: true, errorMessage: true, createdAt: true
    }
  })
  return NextResponse.json({ data: items })
}, [UserRole.SUPER_ADMIN, UserRole.ADMIN])

export const POST = withAuditLog(
  withAuth(async (req) => {
    const body = createSchema.safeParse(await req.json())
    if (!body.success) {
      return NextResponse.json({ error: 'Validation failed', details: body.error.flatten() }, { status: 400 })
    }
    const { token, refreshToken, ...rest } = body.data
    const conn = await prisma.apiConnection.create({
      data: {
        ...rest,
        tokenEncrypted: token ? encrypt(token) : undefined,
        refreshToken: refreshToken ? encrypt(refreshToken) : undefined,
        tokenExpiresAt: body.data.tokenExpiresAt ? new Date(body.data.tokenExpiresAt) : undefined
      }
    })
    return NextResponse.json({ data: { ...conn, tokenEncrypted: undefined, refreshToken: undefined } }, { status: 201 })
  }, [UserRole.SUPER_ADMIN, UserRole.ADMIN]),
  { action: 'CREATE', resource: 'api_connection' }
)
