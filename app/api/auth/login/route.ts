import { NextRequest, NextResponse } from 'next/server'
import { compare } from 'bcryptjs'
import { prisma } from '@/lib/db'
import { signSession } from '@/lib/session'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.isActive) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const valid = await compare(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const token = await signSession({ id: user.id, email: user.email, name: user.name, role: user.role })

    const cookieStore = await cookies()
    cookieStore.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    })

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })

    return NextResponse.json({ ok: true })
  } catch (e) {
    // 임시 디버깅: 실제 에러를 브라우저에서 바로 확인하기 위함
    const err = e as Error
    console.error('LOGIN_ERROR', err)
    return NextResponse.json(
      { error: 'debug', name: err.name, message: err.message },
      { status: 500 }
    )
  }
}
