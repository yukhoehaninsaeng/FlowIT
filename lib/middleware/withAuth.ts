import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'

type Session = { user: { id: string; role: string; email: string; name: string } }

// Inner handler receives resolved params + session (unchanged from Next.js 14 perspective).
// Outer returned function uses params: Promise<P> to satisfy Next.js 15 route handler types.
export function withAuth<P extends Record<string, string> = Record<string, string>>(
  handler: (req: NextRequest, ctx: { params: P; session: Session }) => Promise<NextResponse>,
  allowedRoles?: UserRole[]
) {
  return async (req: NextRequest, ctx: { params: Promise<P> }) => {
    const [session, params] = await Promise.all([auth(), ctx.params])
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (allowedRoles && !allowedRoles.includes(session.user.role as UserRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return handler(req, { params, session: session as Session })
  }
}
