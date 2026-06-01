import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

interface AuditOptions {
  action: string
  resource: string
  getResourceId?: (req: NextRequest) => string | undefined
  getPayload?: (req: NextRequest) => Promise<{ before?: unknown; after?: unknown }>
}

export function withAuditLog(
  handler: (req: NextRequest, ctx: { params?: Record<string, string>; session: { user: { id: string; role: string } } }) => Promise<NextResponse>,
  opts: AuditOptions
) {
  return async (req: NextRequest, ctx: { params?: Record<string, string>; session: { user: { id: string; role: string } } }) => {
    const response = await handler(req, ctx)

    if (response.ok && ctx.session?.user) {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
      const payload = opts.getPayload ? await opts.getPayload(req) : {}

      prisma.auditLog.create({
        data: {
          userId: ctx.session.user.id,
          action: opts.action,
          resource: opts.resource,
          resourceId: opts.getResourceId?.(req),
          ip,
          userAgent: req.headers.get('user-agent') ?? undefined,
          payloadBefore: payload.before ? (payload.before as object) : undefined,
          payloadAfter: payload.after ? (payload.after as object) : undefined
        }
      }).catch(console.error)
    }

    return response
  }
}
