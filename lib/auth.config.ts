import type { NextAuthConfig } from 'next-auth'

// Edge Runtime 안전 설정 (pg, bcryptjs, prisma import 없음)
// middleware.ts가 이 파일만 사용하므로 Edge에서 동작 가능
export const authConfig = {
  providers: [],
  pages: { signIn: '/login' },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as string
      return session
    },
    authorized({ auth: session }) {
      return !!session?.user
    }
  },
  session: { strategy: 'jwt' as const, maxAge: 60 * 60 * 24 * 7 }
} satisfies NextAuthConfig
