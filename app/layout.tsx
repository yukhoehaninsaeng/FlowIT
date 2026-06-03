import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FlowIT CRM',
  description: '화장품 브랜드 특화 통합 CRM 플랫폼'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  )
}
