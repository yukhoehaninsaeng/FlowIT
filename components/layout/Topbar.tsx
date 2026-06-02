'use client'

import { Bell, LogOut, ChevronDown, Menu } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { useSidebar } from './SidebarContext'

interface TopbarProps {
  title: string
}

export function Topbar({ title }: TopbarProps) {
  const { user } = useUser()
  const router = useRouter()
  const { toggle } = useSidebar()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 fixed top-0 left-0 lg:left-[220px] right-0 z-20">
      <div className="flex items-center gap-3">
        {/* 모바일 햄버거 */}
        <button
          onClick={toggle}
          className="lg:hidden p-2 -ml-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md"
          aria-label="메뉴 열기"
        >
          <Menu size={20} />
        </button>

        {/* 타이틀: 모바일에서는 FlowIT 브랜드명, 데스크톱에선 페이지 제목 */}
        <div className="flex items-center gap-1.5 lg:hidden">
          <span className="text-base font-bold text-gray-900">FlowIT</span>
          <span className="text-xs text-gray-400">CRM</span>
        </div>
        <h1 className="hidden lg:block text-base font-semibold text-gray-900">{title}</h1>
      </div>

      <div className="flex items-center gap-2 lg:gap-4">
        <button className="relative p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md">
          <Bell size={18} />
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
              {user?.name?.charAt(0) ?? 'U'}
            </div>
            <span className="hidden sm:block text-sm">{user?.name}</span>
            <ChevronDown size={14} className="hidden sm:block" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
              <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100">
                {user?.email}
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <LogOut size={14} />
                로그아웃
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
