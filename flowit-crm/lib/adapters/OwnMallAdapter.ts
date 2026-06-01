import type { ChannelAdapter, RawOrder } from './types'

export class OwnMallAdapter implements ChannelAdapter {
  private apiKey: string
  private endpoint: string

  constructor(endpoint: string, apiKey: string) {
    this.endpoint = endpoint
    this.apiKey = apiKey
  }

  async fetchOrders(since: Date): Promise<RawOrder[]> {
    const res = await fetch(
      `${this.endpoint}/orders?since=${since.toISOString()}`,
      { headers: { Authorization: `Bearer ${this.apiKey}` } }
    )
    if (!res.ok) throw new Error(`OwnMall API error: ${res.status}`)
    const data = await res.json()
    return (data.orders ?? []).map((o: Record<string, unknown>) => this.normalize(o))
  }

  async fetchInventory(): Promise<{ channelSkuCode: string; qty: number }[]> {
    const res = await fetch(`${this.endpoint}/inventory`, {
      headers: { Authorization: `Bearer ${this.apiKey}` }
    })
    if (!res.ok) throw new Error(`OwnMall inventory API error: ${res.status}`)
    const data = await res.json()
    return data.items ?? []
  }

  private normalize(o: Record<string, unknown>): RawOrder {
    return {
      channelOrderId: String(o.id),
      channel: 'OWN_MALL',
      customerEmail: o.customer_email as string | undefined,
      customerPhone: o.customer_phone as string | undefined,
      customerName: o.customer_name as string | undefined,
      totalAmount: Number(o.total_amount),
      discountAmount: Number(o.discount_amount ?? 0),
      status: String(o.status),
      orderedAt: String(o.ordered_at),
      shippingAddress: o.shipping_address as string | undefined,
      items: ((o.items as Record<string, unknown>[]) ?? []).map((i) => ({
        channelSkuCode: String(i.sku_code),
        channelSkuName: String(i.sku_name),
        qty: Number(i.qty),
        unitPrice: Number(i.unit_price),
        lotNumber: i.lot_number as string | undefined
      }))
    }
  }
}
