export interface RawOrder {
  channelOrderId: string
  channel: string
  customerEmail?: string
  customerPhone?: string
  customerName?: string
  items: RawOrderItem[]
  totalAmount: number
  discountAmount: number
  status: string
  orderedAt: string
  shippingAddress?: string
}

export interface RawOrderItem {
  channelSkuCode: string
  channelSkuName: string
  qty: number
  unitPrice: number
  lotNumber?: string
}

export interface ChannelAdapter {
  fetchOrders(since: Date): Promise<RawOrder[]>
  fetchInventory(): Promise<{ channelSkuCode: string; qty: number }[]>
}
