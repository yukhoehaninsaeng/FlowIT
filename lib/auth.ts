import { cookies } from 'next/headers'
import { verifySession } from '@/lib/session'

export async function auth() {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return null
  try {
    const user = await verifySession(token)
    return { user }
  } catch {
    return null
  }
}
