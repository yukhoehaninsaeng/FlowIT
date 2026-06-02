import { prisma } from '@/lib/db'

// 무시할 공개 이메일 도메인 (매칭 제외)
const PUBLIC_DOMAINS = new Set([
  'gmail.com', 'googlemail.com',
  'naver.com', 'daum.net', 'hanmail.net', 'kakao.com',
  'outlook.com', 'hotmail.com', 'live.com',
  'yahoo.com', 'yahoo.co.kr',
  'icloud.com', 'me.com',
  'nate.com',
])

export function extractDomain(email: string): string | null {
  const match = email.toLowerCase().match(/@([^>]+)/)
  const domain = match?.[1]?.trim() ?? null
  if (!domain || PUBLIC_DOMAINS.has(domain)) return null
  return domain
}

export function extractAllDomains(emails: string[]): string[] {
  const domains = emails
    .map(e => extractDomain(e))
    .filter((d): d is string => d !== null)
  return [...new Set(domains)]
}

interface MatchResult {
  accountId: string
  accountName: string
  confidence: 'high' | 'medium'
}

export async function matchAccountsByDomains(domains: string[]): Promise<MatchResult[]> {
  if (!domains.length) return []

  // 1순위: emailDomain 필드에 직접 저장된 도메인
  const byStoredDomain = await prisma.account.findMany({
    where: { emailDomain: { in: domains } },
    select: { id: true, name: true, emailDomain: true },
  })

  const results: MatchResult[] = byStoredDomain.map(a => ({
    accountId: a.id,
    accountName: a.name,
    confidence: 'high' as const,
  }))

  const foundIds = new Set(results.map(r => r.accountId))

  // 2순위: contactEmail 필드의 도메인과 비교
  const byContactEmail = await prisma.account.findMany({
    where: {
      AND: [
        { id: { notIn: [...foundIds] } },
        { OR: domains.map(d => ({ contactEmail: { endsWith: `@${d}` } })) },
      ]
    },
    select: { id: true, name: true, contactEmail: true },
  })

  for (const a of byContactEmail) {
    if (!foundIds.has(a.id)) {
      results.push({ accountId: a.id, accountName: a.name, confidence: 'medium' })
      foundIds.add(a.id)
    }
  }

  return results
}

// 거래처의 emailDomain을 contactEmail에서 자동 추출·저장
export async function syncAccountEmailDomain(accountId: string, contactEmail: string) {
  const domain = extractDomain(contactEmail)
  if (!domain) return
  await prisma.account.update({
    where: { id: accountId },
    data: { emailDomain: domain },
  })
}
