import { prisma } from '@/lib/db'
import { extractDomain, matchAccountsByDomains } from './emailDomainMatcher'

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

export function getGmailAuthUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/email-sync/callback`,
    response_type: 'code',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent',
    ...(state ? { state } : {}),
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export async function exchangeCodeForTokens(code: string) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/email-sync/callback`,
      grant_type: 'authorization_code',
    }),
  })
  return res.json() as Promise<{
    access_token: string
    refresh_token?: string
    expires_in: number
    token_type: string
  }>
}

export async function refreshAccessToken(syncId: string): Promise<string> {
  const sync = await prisma.emailSync.findUnique({ where: { id: syncId } })
  if (!sync?.refreshToken) throw new Error('No refresh token')

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: sync.refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json() as { access_token: string; expires_in: number }

  await prisma.emailSync.update({
    where: { id: syncId },
    data: {
      accessToken: data.access_token,
      tokenExpiry: new Date(Date.now() + data.expires_in * 1000),
    },
  })
  return data.access_token
}

async function getValidToken(sync: { id: string; accessToken: string | null; tokenExpiry: Date | null }): Promise<string> {
  if (sync.accessToken && sync.tokenExpiry && sync.tokenExpiry > new Date()) {
    return sync.accessToken
  }
  return refreshAccessToken(sync.id)
}

interface GmailMessage {
  id: string
  threadId: string
  snippet: string
  payload: {
    headers: Array<{ name: string; value: string }>
    body?: { data?: string }
    parts?: Array<{ mimeType: string; body: { data?: string } }>
  }
  internalDate: string
}

function getHeader(msg: GmailMessage, name: string): string {
  return msg.payload.headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''
}

function decodeBase64(data: string): string {
  try {
    return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
  } catch { return '' }
}

function extractBody(msg: GmailMessage): string {
  const part = msg.payload.parts?.find(p => p.mimeType === 'text/plain')
  if (part?.body?.data) return decodeBase64(part.body.data).slice(0, 2000)
  if (msg.payload.body?.data) return decodeBase64(msg.payload.body.data).slice(0, 2000)
  return msg.snippet
}

function parseEmails(raw: string): string[] {
  return raw.split(/,|;/).map(s => {
    const m = s.match(/<(.+?)>/)
    return (m?.[1] ?? s).trim().toLowerCase()
  }).filter(Boolean)
}

export async function syncEmailsForAccount(syncId: string, maxMessages = 50) {
  const sync = await prisma.emailSync.findUnique({ where: { id: syncId } })
  if (!sync || !sync.isActive) return { synced: 0 }

  const token = await getValidToken(sync)
  const headers = { Authorization: `Bearer ${token}` }

  // incremental sync using historyId, else fetch recent messages
  let messageIds: string[] = []

  if (sync.historyId) {
    const histRes = await fetch(
      `${GMAIL_API}/users/me/history?startHistoryId=${sync.historyId}&historyTypes=messageAdded`,
      { headers }
    )
    const histData = await histRes.json() as { history?: Array<{ messagesAdded?: Array<{ message: { id: string } }> }>; historyId?: string }

    if (histData.historyId) {
      await prisma.emailSync.update({ where: { id: syncId }, data: { historyId: histData.historyId } })
    }
    messageIds = (histData.history ?? [])
      .flatMap(h => h.messagesAdded ?? [])
      .map(m => m.message.id)
  } else {
    const listRes = await fetch(
      `${GMAIL_API}/users/me/messages?maxResults=${maxMessages}&q=in:anywhere`,
      { headers }
    )
    const listData = await listRes.json() as { messages?: Array<{ id: string }>; historyId?: string }
    messageIds = (listData.messages ?? []).map(m => m.id)

    if (listData.historyId) {
      await prisma.emailSync.update({ where: { id: syncId }, data: { historyId: listData.historyId } })
    }
  }

  let synced = 0

  for (const msgId of messageIds.slice(0, maxMessages)) {
    // skip already synced
    const exists = await prisma.contactLog.findFirst({ where: { externalId: msgId } })
    if (exists) continue

    const msgRes = await fetch(
      `${GMAIL_API}/users/me/messages/${msgId}?format=full`,
      { headers }
    )
    if (!msgRes.ok) continue
    const msg: GmailMessage = await msgRes.json()

    const from = getHeader(msg, 'from')
    const to = parseEmails(getHeader(msg, 'to'))
    const cc = parseEmails(getHeader(msg, 'cc'))
    const subject = getHeader(msg, 'subject')
    const date = new Date(parseInt(msg.internalDate))
    const body = extractBody(msg)

    const fromEmail = parseEmails(from)[0] ?? ''
    const allEmails = [fromEmail, ...to, ...cc].filter(Boolean)
    const allDomains = allEmails
      .map(e => extractDomain(e))
      .filter((d): d is string => d !== null)

    const matches = await matchAccountsByDomains([...new Set(allDomains)])
    const primaryMatch = matches[0] ?? null

    // direction: inbound if from external, outbound if from our email
    const direction = fromEmail === sync.emailAddress ? 'outbound' : 'inbound'

    await prisma.contactLog.create({
      data: {
        accountId: primaryMatch?.accountId ?? null,
        type: 'email',
        direction,
        subject,
        summary: body,
        fromEmail,
        toEmails: to,
        ccEmails: cc,
        externalId: msgId,
        threadId: msg.threadId,
        occurredAt: date,
        createdById: sync.createdById ?? null,
      },
    })
    synced++
  }

  await prisma.emailSync.update({
    where: { id: syncId },
    data: { lastSyncAt: new Date() },
  })

  return { synced }
}
