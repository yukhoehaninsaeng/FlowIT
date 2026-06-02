'use client'

import { useEffect, useState } from 'react'
import type { ModuleCategory } from '@/lib/modules/registry'

export interface ActiveModule {
  key: string
  label: string
  href: string
  category: ModuleCategory
  isEnabled: boolean
  displayOrder: number
}

let cache: ActiveModule[] | null = null
let cacheTime = 0
const CACHE_TTL = 60_000

export function useModules() {
  const [modules, setModules] = useState<ActiveModule[]>(cache ?? [])
  const [loading, setLoading] = useState(!cache)

  useEffect(() => {
    if (cache && Date.now() - cacheTime < CACHE_TTL) {
      setModules(cache)
      setLoading(false)
      return
    }
    fetch('/api/admin/modules')
      .then(r => r.ok ? r.json() : { modules: [] })
      .then(d => {
        cache = d.modules ?? []
        cacheTime = Date.now()
        setModules(cache!)
      })
      .finally(() => setLoading(false))
  }, [])

  function invalidate() {
    cache = null
    cacheTime = 0
  }

  return { modules: modules.filter(m => m.isEnabled).sort((a, b) => a.displayOrder - b.displayOrder), loading, invalidate }
}
