'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { formatKRW } from '@/lib/utils'
import { ArrowLeft, Mail, MessageSquare, ShoppingBag, Activity } from 'lucide-react'
import Link from 'next/link'

interface CampaignSend {
  id: string
  status: string
  sentAt: string | null
  openedAt: string | null
  clickedAt: string | null
  convertedAt: string | null
  revenueAttr: string | null
  campaign: { id: string; name: string; type: string }
}

interface Customer {
  id: string; name: string | null; email: string | null; phone: string | null
  gender: string | null; birthYear: number | null; skinType: string | null
  segment: string; rfmScore: { r: number; f: number; m: number; total: number } | null
  ltv: string
  identities: { channel: string; identifierType: string; identifierValue: string }[]
  events: { id: string; eventType: string; occurredAt: string; meta: object }[]
  orders: {
    id: string; channel: string; totalAmount: string; status: string; orderedAt: string
    items: { skuMaster: { name: string }; qty: number }[]
  }[]
  campaignSends: CampaignSend[]
}

const SEGMENT_STYLE: Record<string, string> = {
  vip:        'bg-yellow-100 text-yellow-800',
  churn_risk: 'bg-red-100 text-red-700',
  loyal:      'bg-blue-100 text-blue-700',
  new:        'bg-green-100 text-green-700',
  normal:     'bg-gray-100 text-gray-600',
}

const CAMPAIGN_TYPE_LABEL: Record<string, string> = {
  email: '이메일', sms: 'SMS', kakao: '카카오', push: '푸시'
}

export default function CustomerDetailPage() {
  const { id } = useParams()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [activeTab, setActiveTab] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/customers/${id}`)
      .then(r => r.json())
      .then(d => { setCustomer(d.data); setLoading(false) })
  }, [id])

  if (loading) return <div className="p-8 text-gray-400 text-sm">로딩 중...</div>
  if (!customer) return <div className="p-8 text-gray-400 text-sm">고객을 찾을 수 없습니다</div>

  const totalSpend = customer.orders.reduce((s, o) => s + Number(o.totalAmount), 0)
  const openedCount = customer.campaignSends.filter(s => s.openedAt).length
  const convertedCount = customer.campaignSends.filter(s => s.convertedAt).length

  const TABS = [
    { label: '구매 이력', icon: ShoppingBag, count: customer.orders.length },
    { label: '행동 이벤트', icon: Activity, count: customer.events.length },
    { label: '캠페인 수신', icon: Mail, count: customer.campaignSends.length },
    { label: '채널 연결', icon: MessageSquare, count: customer.identities.length },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/customers" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">{customer.name ?? '(이름 없음)'}</h1>
        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${SEGMENT_STYLE[customer.segment] ?? 'bg-gray-100 text-gray-600'}`}>
          {customer.segment}
        </span>
      </div>

      {/* KPI 요약 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">누적 구매액 (LTV)</p>
          <p className="text-xl font-bold text-blue-700">{formatKRW(Number(customer.ltv))}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">구매 횟수</p>
          <p className="text-xl font-bold text-gray-900">{customer.orders.length}회</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">캠페인 수신</p>
          <p className="text-xl font-bold text-gray-900">{customer.campaignSends.length}건</p>
          <p className="text-xs text-gray-400 mt-0.5">오픈 {openedCount} / 전환 {convertedCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">RFM 합계</p>
          {customer.rfmScore ? (
            <>
              <p className="text-xl font-bold text-gray-900">{customer.rfmScore.total}점</p>
              <p className="text-xs text-gray-400 mt-0.5">R{customer.rfmScore.r} F{customer.rfmScore.f} M{customer.rfmScore.m}</p>
            </>
          ) : <p className="text-xl font-bold text-gray-400">—</p>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* 기본 정보 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">기본 정보</h2>
          <InfoRow label="이메일" value={customer.email ?? '-'} />
          <InfoRow label="전화번호" value={customer.phone ?? '-'} />
          <InfoRow label="성별" value={customer.gender ?? '-'} />
          <InfoRow label="출생연도" value={customer.birthYear ? String(customer.birthYear) : '-'} />
          <InfoRow label="피부타입" value={customer.skinType ?? '-'} />

          {customer.rfmScore && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1.5">RFM 점수</p>
              <div className="flex gap-3">
                <ScoreBadge label="R" value={customer.rfmScore.r} />
                <ScoreBadge label="F" value={customer.rfmScore.f} />
                <ScoreBadge label="M" value={customer.rfmScore.m} />
              </div>
            </div>
          )}
        </div>

        {/* 탭 영역 */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-100 overflow-x-auto">
            {TABS.map((tab, i) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.label}
                  onClick={() => setActiveTab(i)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === i
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon size={13} />
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`ml-0.5 px-1.5 py-0.5 text-xs rounded-full ${
                      activeTab === i ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="p-4 overflow-y-auto max-h-[480px]">
            {/* 구매 이력 */}
            {activeTab === 0 && (
              <div className="space-y-2">
                {customer.orders.map(order => (
                  <div key={order.id} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{order.channel}</span>
                      <span className="text-sm font-semibold text-gray-900">{formatKRW(Number(order.totalAmount))}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                      <span>{new Date(order.orderedAt).toLocaleDateString('ko-KR')}</span>
                      <span>·</span>
                      <span className={order.status === 'DELIVERED' ? 'text-green-600' : 'text-orange-500'}>{order.status}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {order.items.map(item => `${item.skuMaster.name} ×${item.qty}`).join(', ')}
                    </div>
                  </div>
                ))}
                {customer.orders.length === 0 && <EmptyState message="구매 이력이 없습니다" />}
              </div>
            )}

            {/* 행동 이벤트 */}
            {activeTab === 1 && (
              <div className="space-y-1">
                {customer.events.map(event => (
                  <div key={event.id} className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0">
                    <span className="inline-flex px-2 py-0.5 text-xs rounded bg-blue-50 text-blue-700 whitespace-nowrap mt-0.5">{event.eventType}</span>
                    <span className="text-xs text-gray-400">{new Date(event.occurredAt).toLocaleString('ko-KR')}</span>
                  </div>
                ))}
                {customer.events.length === 0 && <EmptyState message="이벤트 내역이 없습니다" />}
              </div>
            )}

            {/* 캠페인 수신 */}
            {activeTab === 2 && (
              <div className="space-y-2">
                {customer.campaignSends.map(send => (
                  <div key={send.id} className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{send.campaign.name}</p>
                        <span className="text-xs text-gray-400">{CAMPAIGN_TYPE_LABEL[send.campaign.type] ?? send.campaign.type}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        send.convertedAt ? 'bg-green-100 text-green-700' :
                        send.clickedAt ? 'bg-blue-100 text-blue-700' :
                        send.openedAt ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {send.convertedAt ? '전환' : send.clickedAt ? '클릭' : send.openedAt ? '오픈' : '발송'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                      {send.sentAt && <span>발송: {new Date(send.sentAt).toLocaleDateString('ko-KR')}</span>}
                      {send.openedAt && <span className="text-yellow-600">오픈 ✓</span>}
                      {send.clickedAt && <span className="text-blue-600">클릭 ✓</span>}
                      {send.convertedAt && <span className="text-green-600">전환 ✓</span>}
                      {send.revenueAttr && Number(send.revenueAttr) > 0 && (
                        <span className="text-green-700 font-medium">기여 {formatKRW(Number(send.revenueAttr))}</span>
                      )}
                    </div>
                  </div>
                ))}
                {customer.campaignSends.length === 0 && <EmptyState message="캠페인 수신 내역이 없습니다" />}
              </div>
            )}

            {/* 채널 연결 */}
            {activeTab === 3 && (
              <div className="space-y-2">
                {customer.identities.map((identity, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                    <div>
                      <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded">{identity.channel}</span>
                      <span className="text-xs text-gray-400 ml-2">{identity.identifierType}</span>
                    </div>
                    <span className="text-xs text-gray-600 font-mono truncate max-w-[200px]">{identity.identifierValue}</span>
                  </div>
                ))}
                {customer.identities.length === 0 && <EmptyState message="연결된 채널이 없습니다" />}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs text-gray-800 font-medium">{value}</span>
    </div>
  )
}

function ScoreBadge({ label, value }: { label: string; value: number }) {
  const color = value >= 4 ? 'bg-green-100 text-green-700' : value >= 3 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
  return (
    <div className={`flex flex-col items-center px-2.5 py-1.5 rounded-lg ${color}`}>
      <span className="text-xs font-medium">{label}</span>
      <span className="text-base font-bold">{value}</span>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return <div className="flex items-center justify-center h-32 text-sm text-gray-400">{message}</div>
}
