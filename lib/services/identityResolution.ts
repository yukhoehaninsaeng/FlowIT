import { prisma } from '@/lib/db'
import { Channel } from '@prisma/client'
import { normalizeEmail, normalizePhone } from '@/lib/utils'

interface IdentityInput {
  channel: Channel
  channelUserId: string
  email?: string
  phone?: string
  name?: string
  address?: string
}

export async function resolveCustomerId(input: IdentityInput): Promise<string> {
  const { channel, channelUserId, email, phone, name, address } = input

  // 1. 기존 channel identity로 조회
  const existingIdentity = await prisma.customerIdentity.findUnique({
    where: { channel_channelUserId: { channel, channelUserId } }
  })
  if (existingIdentity) return existingIdentity.customerId

  // 2. 이메일 exact match
  if (email) {
    const normalized = normalizeEmail(email)
    const byEmail = await prisma.customerIdentity.findFirst({
      where: { identifierType: 'email', identifierValue: normalized }
    })
    if (byEmail) {
      await linkIdentity(byEmail.customerId, channel, channelUserId, 'email', normalized)
      return byEmail.customerId
    }
  }

  // 3. 전화번호 exact match
  if (phone) {
    const normalized = normalizePhone(phone)
    const byPhone = await prisma.customerIdentity.findFirst({
      where: { identifierType: 'phone', identifierValue: normalized }
    })
    if (byPhone) {
      await linkIdentity(byPhone.customerId, channel, channelUserId, 'phone', normalized)
      return byPhone.customerId
    }
  }

  // 4. 이름 + 주소 조합 (confidenceScore=0.75)
  if (name && address) {
    const byNameAddr = await prisma.customerIdentity.findFirst({
      where: {
        identifierType: 'address',
        identifierValue: address,
        customer: { name }
      }
    })
    if (byNameAddr) {
      await linkIdentity(byNameAddr.customerId, channel, channelUserId, 'address', address, 0.75)
      return byNameAddr.customerId
    }
  }

  // 5. 신규 고객 생성
  const customer = await prisma.customer.create({
    data: {
      email: email ? normalizeEmail(email) : undefined,
      phone: phone ? normalizePhone(phone) : undefined,
      name,
      identities: {
        create: [
          { channel, channelUserId, identifierType: 'channel_id', identifierValue: channelUserId },
          ...(email ? [{ channel, channelUserId: `email:${normalizeEmail(email)}`, identifierType: 'email', identifierValue: normalizeEmail(email) }] : []),
          ...(phone ? [{ channel, channelUserId: `phone:${normalizePhone(phone)}`, identifierType: 'phone', identifierValue: normalizePhone(phone) }] : [])
        ]
      }
    }
  })
  return customer.id
}

async function linkIdentity(
  customerId: string,
  channel: Channel,
  channelUserId: string,
  type: string,
  value: string,
  confidenceScore = 1.0
) {
  await prisma.customerIdentity.upsert({
    where: { channel_channelUserId: { channel, channelUserId } },
    create: { customerId, channel, channelUserId, identifierType: type, identifierValue: value, confidenceScore },
    update: {}
  })
}
