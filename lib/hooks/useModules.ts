'use client'

import { useEffect, useState } from 'react'
import { MODULE_REGISTRY, type ModuleCategory } from '@/lib/modules/registry'

export interface ActiveModule {
  key: string
  label: string
  href: string
  category: ModuleCategory
  isEnabled: boolean
  displayOrder: number
}

// 기본값: defaultEnabled 기반 (DB 없을 때 fallback)
const DEFAULTS: ActiveModule[] = MODULE_REGISTRY.map((def, idx) => ({
  key: def.key,
  label: def.label,
  href: def.href,
  category: def.category,
  isEnabled: def.defaultEnabled,
  displayOrder: idx,
}))

let cache: ActiveModule[] | null = null
let cacheTime = 0
const CACHE_TTL = 30_000  // 30초로 단축 (변경 반영 빠르게)

export function invalidateModuleCache() {
  cache = null
  cacheTime = 0
}

export function useModules() {
  const [modules, setModules] = useState<ActiveModule[]>(cache ?? DEFAULTS)
  const [loading, setLoading] = useState(!cache)

  useEffect(() => {
    if (cache && Date.now() - cacheTime < CACHE_TTL) {
      setModules(cache)
      setLoading(false)
      return
    }
    fetch('/api/admin/modules')
      .then(r => r.json())
      .then(d => {
        const list: ActiveModule[] = d.modules ?? DEFAULTS
        cache = list
        cacheTime = Date.now()
        setModules(list)
      })
      .catch(() => {
        // API 실패 시 기본값 유지
        setModules(DEFAULTS)
      })
      .finally(() => setLoading(false))
  }, [])

  return {
    modules: modules.filter(m => m.isEnabled).sort((a, b) => a.displayOrder - b.displayOrder),
    loading,
  }
}
