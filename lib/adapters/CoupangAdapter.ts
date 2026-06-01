import type { ChannelAdapter, RawOrder } from './types'

export class CoupangAdapter implements ChannelAdapter {
  private accessKey: string
  private secretKey: string
  private endpoint: string

  constructor(endpoint: string, accessKey: string, secretKey: string) {
    this.endpoint = endpoint
    this.accessKey = accessKey
    this.secretKey = secretKey
  }

  async fetchOrders(since: Date): Promise<RawOrder[]> {
    const res = await fetch(
      `${this.endpoint}/v2/providers/wing/apis/sale/v2/ordersheets?createdAtFrom=${since.toISOString()}`,
      { headers: { Authorization: `CEA algorithm=HmacSHA256, access-key=${this.accessKey}, signed-date=${Date.now()}, signature=${this.secretKey}` } }
    )
    if (!res.ok) throw new Error(`Coupang API error: ${res.status}`)
    const data = await res.json()
    return (data.data ?? []).map((o: Record<string, unknown>) => this.normalize(o))
  }

  async fetchInventory(): Promise<{ channelSkuCode: string; qty: number }[]> {
    return []
  }

  private normalize(o: Record<string, unknown>): RawOrder {
    const buyer = o.orderer as Record<string, unknown> ?? {}
    return {
      channelOrderId: String(o.orderId),
      channel: 'COUPANG',
      customerName: buyer.name as string | undefined,
      customerPhone: buyer.safeNumber as string | undefined,
      totalAmount: Number(o.totalPrice),
      discountAmount: Number(o.discountPrice ?? 0),
      status: String(o.status),
      orderedAt: String(o.paidAt),
      items: ((o.orderItems as Record<string, unknown>[]) ?? []).map((i) => ({
        channelSkuCode: String(i.sellerProductItemId),
        channelSkuName: String(i.sellerProductName),
        qty: Number(i.shippingCount),
        unitPrice: Number(i.unitPrice),
        lotNumber: undefined
      }))
    }
  }
}
