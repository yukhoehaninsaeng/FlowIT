import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { exchangeCodeForTokens } from '@/lib/services/gmailSync'
import { auth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  if (!code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/admin/api-connections?error=no_code`)
  }

  try {
    const tokens = await exchangeCodeForTokens(code)

    // fetch user email from Google
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const profile = await profileRes.json() as { email: string; name?: string }

    const session = await auth()

    await prisma.emailSync.upsert({
      where: { emailAddress: profile.email },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? undefined,
        tokenExpiry: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000),
        isActive: true,
      },
      create: {
        provider: 'gmail',
        emailAddress: profile.email,
        displayName: profile.name,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiry: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000),
        createdById: session?.user?.id ?? null,
      },
    })

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin/api-connections?connected=gmail`
    )
  } catch (e) {
    console.error('Gmail OAuth callback error', e)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/admin/api-connections?error=oauth_failed`
    )
  }
}
