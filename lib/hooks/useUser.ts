'use client'

import { useEffect, useState } from 'react'

export interface CurrentUser {
  id: string
  email: string
  name: string
  role: string
}

export function useUser() {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : { user: null })
      .then(d => setUser(d.user))
      .finally(() => setLoading(false))
  }, [])

  return { user, loading }
}
