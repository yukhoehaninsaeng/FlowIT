import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db'

export async function auth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
    select: { id: true, email: true, name: true, role: true }
  })
  if (!dbUser) return null

  return {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role as string
    }
  }
}
