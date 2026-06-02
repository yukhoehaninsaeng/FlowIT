'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Settings, Loader2 } from 'lucide-react'
import { useUser } from '@/lib/hooks/useUser'
import { useModules } from '@/lib/hooks/useModules'
import { MODULE_REGISTRY, CATEGORY_LABELS, type ModuleCategory } from '@/lib/modules/registry'

const CATEGORY_ORDER: ModuleCategory[] = ['core', 'sales', 'marketing', 'logistics', 'analytics']

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

  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] bg-gray-900 text-white flex flex-col z-30">
      <div className="px-6 py-5 border-b border-gray-700">
        <span className="text-xl font-bold text-white">FlowIT</span>
        <span className="text-xs text-gray-400 ml-1">CRM</span>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={16} className="animate-spin text-gray-500" />
          </div>
        ) : (
          <>
            {/* 대시보드 항상 최상단 */}
            {dashboardModule && (
              <NavItem
                href={dashboardModule.href}
                label={dashboardModule.label}
                moduleKey={dashboardModule.key}
                active={isActive(dashboardModule.href)}
              />
            )}

            {/* 카테고리별 그룹 */}
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
                      <NavItem key={key} href={href} label={label} moduleKey={key} active={isActive(href)} />
                    ))}
                  </div>
                </div>
              )
            })}

            {/* 관리자 메뉴 */}
            {isAdmin && (
              <div className="pt-4">
                <p className="px-3 pb-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">관리자</p>
                <div className="space-y-0.5">
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
                </div>
              </div>
            )}
          </>
        )}
      </nav>
    </aside>
  )
}

function NavItem({ href, label, moduleKey, active }: { href: string; label: string; moduleKey: string; active: boolean }) {
  const def = MODULE_REGISTRY.find(m => m.key === moduleKey)
  const Icon = def?.icon
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
        active ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
      )}
    >
      {Icon && <Icon size={16} />}
      {label}
    </Link>
  )
}
