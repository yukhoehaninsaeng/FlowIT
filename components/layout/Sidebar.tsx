'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Settings, Loader2, X } from 'lucide-react'
import { useUser } from '@/lib/hooks/useUser'
import { useModules } from '@/lib/hooks/useModules'
import { MODULE_REGISTRY, CATEGORY_LABELS, type ModuleCategory } from '@/lib/modules/registry'
import { useSidebar } from './SidebarContext'

const CATEGORY_ORDER: ModuleCategory[] = ['core', 'master', 'sales', 'marketing', 'logistics', 'analytics']

const CATEGORY_COLORS: Record<string, string> = {
  core: 'bg-blue-600',
  master: 'bg-purple-600',
  sales: 'bg-green-600',
  marketing: 'bg-orange-500',
  logistics: 'bg-cyan-600',
  analytics: 'bg-indigo-600',
}

const adminItems = [
  { href: '/admin/modules', label: '모듈 관리', icon: Settings },
  { href: '/admin/users', label: '계정 관리', icon: Settings },
  { href: '/admin/api-connections', label: 'API 연결', icon: Settings },
  { href: '/admin/audit-logs', label: '감사 로그', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useUser()
  const { modules, loading } = useModules()
  const { isOpen, close } = useSidebar()
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(href + '/')

  const dashboardModule = modules.find(m => m.key === 'dashboard')
  const otherModules = modules.filter(m => m.key !== 'dashboard')

  const grouped = CATEGORY_ORDER.reduce<Record<string, typeof otherModules>>((acc, cat) => {
    const items = otherModules.filter(m => {
      const def = MODULE_REGISTRY.find(d => d.key === m.key)
      return def?.category === cat
    })
    if (items.length) acc[cat] = items
    return acc
  }, {})

  const sidebarContent = (onClickItem?: () => void) => (
    <>
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={16} className="animate-spin text-gray-500" />
        </div>
      ) : (
        <>
          {dashboardModule && (
            <NavItem
              href={dashboardModule.href}
              label={dashboardModule.label}
              moduleKey={dashboardModule.key}
              active={isActive(dashboardModule.href)}
              onClick={onClickItem}
            />
          )}
          {CATEGORY_ORDER.map(cat => {
            const items = grouped[cat]
            if (!items?.length) return null
            return (
              <div key={cat} className="pt-4">
                <p className="px-3 pb-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                  {CATEGORY_LABELS[cat]}
                </p>
                <div className="space-y-0.5">
                  {items.map(({ key, href, label }) => (
                    <NavItem key={key} href={href} label={label} moduleKey={key} active={isActive(href)} onClick={onClickItem} />
                  ))}
                </div>
              </div>
            )
          })}
          {isAdmin && (
            <div className="pt-4">
              <p className="px-3 pb-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">관리자</p>
              <div className="space-y-0.5">
                {adminItems.map(({ href, label, icon: Icon }) => (
                  <Link key={href} href={href} onClick={onClickItem}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                      pathname.startsWith(href) ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    )}>
                    <Icon size={16} />
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  )

  return (
    <>
      {/* ── 데스크톱 사이드바 ── */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-[220px] bg-gray-900 text-white flex-col z-30">
        <div className="px-6 py-5 border-b border-gray-700">
          <span className="text-xl font-bold text-white">FlowIT</span>
          <span className="text-xs text-gray-400 ml-1">CRM</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {sidebarContent()}
        </nav>
      </aside>

      {/* ── 모바일 드로어 오버레이 ── */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* 배경 딤 */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />

          {/* 드로어 패널 */}
          <div className="relative w-full max-w-sm bg-gray-900 h-full flex flex-col overflow-hidden">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white">FlowIT</span>
                <span className="text-xs text-gray-400">CRM</span>
              </div>
              <button onClick={close} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* 메뉴 그리드 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-gray-500" /></div>
              ) : (
                <>
                  {/* 대시보드 */}
                  {dashboardModule && (() => {
                    const def = MODULE_REGISTRY.find(d => d.key === dashboardModule.key)
                    const Icon = def?.icon
                    return (
                      <Link href={dashboardModule.href} onClick={close}
                        className={cn(
                          'flex items-center gap-3 px-4 py-3 rounded-xl transition-colors',
                          isActive(dashboardModule.href) ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-100 hover:bg-gray-700'
                        )}>
                        {Icon && <div className="w-9 h-9 rounded-xl bg-blue-500/30 flex items-center justify-center flex-shrink-0">
                          <Icon size={18} className="text-blue-300" />
                        </div>}
                        <span className="text-sm font-medium">{dashboardModule.label}</span>
                      </Link>
                    )
                  })()}

                  {/* 카테고리별 그리드 */}
                  {CATEGORY_ORDER.map(cat => {
                    const items = grouped[cat]
                    if (!items?.length) return null
                    const color = CATEGORY_COLORS[cat] ?? 'bg-gray-600'
                    return (
                      <div key={cat}>
                        <p className="text-xs font-semibold text-gray-400 mb-3 tracking-wider uppercase">
                          {CATEGORY_LABELS[cat]}
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {items.map(({ key, href, label }) => {
                            const def = MODULE_REGISTRY.find(d => d.key === key)
                            const Icon = def?.icon
                            const active = isActive(href)
                            return (
                              <Link key={key} href={href} onClick={close}
                                className={cn(
                                  'flex flex-col items-center gap-2 p-3 rounded-2xl transition-all',
                                  active ? 'bg-blue-600/20 ring-1 ring-blue-500' : 'hover:bg-gray-800'
                                )}>
                                <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center', color)}>
                                  {Icon && <Icon size={20} className="text-white" />}
                                </div>
                                <span className="text-[11px] text-gray-300 text-center leading-tight font-medium">{label}</span>
                              </Link>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}

                  {/* 관리자 */}
                  {isAdmin && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 mb-3 tracking-wider uppercase">관리자</p>
                      <div className="grid grid-cols-3 gap-2">
                        {adminItems.map(({ href, label, icon: Icon }) => (
                          <Link key={href} href={href} onClick={close}
                            className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-gray-800 transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-gray-600 flex items-center justify-center">
                              <Icon size={20} className="text-white" />
                            </div>
                            <span className="text-[11px] text-gray-300 text-center leading-tight font-medium">{label}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function NavItem({ href, label, moduleKey, active, onClick }: {
  href: string; label: string; moduleKey: string; active: boolean; onClick?: () => void
}) {
  const def = MODULE_REGISTRY.find(m => m.key === moduleKey)
  const Icon = def?.icon
  return (
    <Link href={href} onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
        active ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
      )}>
      {Icon && <Icon size={16} />}
      {label}
    </Link>
  )
}
