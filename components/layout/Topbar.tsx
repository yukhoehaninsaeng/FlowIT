'use client'

import { useSession, signOut } from 'next-auth/react'
import { Bell, LogOut, ChevronDown } from 'lucide-react'
import { useState } from 'react'

interface TopbarProps {
  title: string
}

export function Topbar({ title }: TopbarProps) {
  const { data: session } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 fixed top-0 left-[220px] right-0 z-20">
      <h1 className="text-base font-semibold text-gray-900">{title}</h1>

      <div className="flex items-center gap-4">
        <button className="relative p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md">
          <Bell size={18} />
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
              {session?.user?.name?.charAt(0) ?? 'U'}
            </div>
            <span className="hidden sm:block">{session?.user?.name}</span>
            <ChevronDown size={14} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
              <div className="px-4 py-2 text-xs text-gray-500 border-b">
                {session?.user?.email}
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
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
