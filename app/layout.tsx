import type { Metadata } from 'next'
import './globals.css'
import { SessionProvider } from 'next-auth/react'
import { auth } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'FlowIT CRM',
  description: '화장품 브랜드 특화 통합 CRM 플랫폼'
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  return (
    <html lang="ko">
      <body className="antialiased font-sans">
        <SessionProvider session={session}>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
