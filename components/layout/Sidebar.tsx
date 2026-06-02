'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, TrendingUp, Package, Megaphone,
  GitBranch, Star, MessageSquare, BarChart3, Settings
} from 'lucide-react'
import { useUser } from '@/lib/hooks/useUser'

const navItems = [
  { href: '/', label: '대시보드', icon: LayoutDashboard },
  { href: '/customers', label: '고객', icon: Users },
  { href: '/sales', label: '영업 파이프라인', icon: TrendingUp },
  { href: '/inventory', label: '재고·SKU', icon: Package },
  { href: '/campaigns', label: '캠페인', icon: Megaphone },
  { href: '/journeys', label: '여정 자동화', icon: GitBranch },
  { href: '/influencers', label: '인플루언서', icon: Star },
  { href: '/voc', label: 'VOC·리뷰', icon: MessageSquare },
  { href: '/bi', label: 'BI 대시보드', icon: BarChart3 }
]

const adminItems = [
  { href: '/admin/users', label: '계정 관리', icon: Settings },
  { href: '/admin/api-connections', label: 'API 연결', icon: Settings },
  { href: '/admin/audit-logs', label: '감사 로그', icon: Settings }
]

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useUser()
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'

  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] bg-gray-900 text-white flex flex-col z-30">
      <div className="px-6 py-5 border-b border-gray-700">
        <span className="text-xl font-bold text-white">FlowIT</span>
        <span className="text-xs text-gray-400 ml-1">CRM</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
              pathname === href
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}

        {isAdmin && (
          <>
            <div className="pt-4 pb-2 px-3 text-xs text-gray-500 font-medium uppercase tracking-wider">
              관리자
            </div>
            {adminItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  pathname.startsWith(href)
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                )}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
          </>
        )}
      </nav>
    </aside>
  )
}
