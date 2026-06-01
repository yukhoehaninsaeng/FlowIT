import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { UserRole } from '@prisma/client'

type Session = { user: { id: string; role: string; email: string; name: string } }
type Handler = (
  req: NextRequest,
  ctx: { params?: Record<string, string>; session: Session }
) => Promise<NextResponse>

export function withAuth(handler: Handler, allowedRoles?: UserRole[]) {
  return async (req: NextRequest, ctx: { params?: Record<string, string> }) => {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (allowedRoles && !allowedRoles.includes(session.user.role as UserRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return handler(req, { ...ctx, session: session as Session })
  }
}
