import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

interface AuditOptions {
  action: string
  resource: string
  getResourceId?: (req: NextRequest) => string | undefined
  getPayload?: (req: NextRequest) => Promise<{ before?: unknown; after?: unknown }>
}

type RouteHandler = (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<NextResponse>

export function withAuditLog(handler: RouteHandler, opts: AuditOptions): RouteHandler {
  return async (req, ctx) => {
    const response = await handler(req, ctx)

    if (response.ok) {
      const session = await auth()
      if (session?.user) {
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
        const payload = opts.getPayload ? await opts.getPayload(req) : {}

        prisma.auditLog.create({
          data: {
            userId: session.user.id,
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
    }

    return response
  }
}
