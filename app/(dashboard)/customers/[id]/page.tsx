'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { formatKRW } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface Customer {
  id: string; name: string | null; email: string | null; phone: string | null
  gender: string | null; birthYear: number | null; skinType: string | null
  segment: string; rfmScore: { r: number; f: number; m: number; total: number } | null
  ltv: string; identities: { channel: string; identifierType: string; identifierValue: string }[]
  events: { id: string; eventType: string; occurredAt: string; meta: object }[]
  orders: { id: string; channel: string; totalAmount: string; status: string; orderedAt: string; items: { skuMaster: { name: string }; qty: number }[] }[]
}

const TABS = ['구매 이력', '행동 이벤트', '캠페인 수신', 'VOC·리뷰']

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/customers" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">{customer.name ?? '(이름 없음)'}</h1>
        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
          customer.segment === 'vip' ? 'bg-yellow-100 text-yellow-800' :
          customer.segment === 'churn_risk' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
        }`}>{customer.segment}</span>
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
          <InfoRow label="LTV" value={formatKRW(Number(customer.ltv))} />
          {customer.rfmScore && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-1">RFM 점수</p>
              <div className="flex gap-2">
                <ScoreBadge label="R" value={customer.rfmScore.r} />
                <ScoreBadge label="F" value={customer.rfmScore.f} />
                <ScoreBadge label="M" value={customer.rfmScore.m} />
                <span className="text-xs text-gray-600 self-center">합계 {customer.rfmScore.total}</span>
              </div>
            </div>
          )}
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2">연결 채널</p>
            {customer.identities.map((id, i) => (
              <div key={i} className="text-xs text-gray-600">{id.channel} · {id.identifierType}</div>
            ))}
          </div>
        </div>

        {/* 탭 영역 */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-100">
            {TABS.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === i ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-4">
            {activeTab === 0 && (
              <div className="space-y-2">
                {customer.orders.map(order => (
                  <div key={order.id} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700">{order.channel}</span>
                      <span className="text-sm font-semibold text-gray-900">{formatKRW(Number(order.totalAmount))}</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(order.orderedAt).toLocaleDateString('ko-KR')} · {order.status}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {order.items.map(item => `${item.skuMaster.name} x${item.qty}`).join(', ')}
                    </div>
                  </div>
                ))}
                {customer.orders.length === 0 && <EmptyState message="구매 이력이 없습니다" />}
              </div>
            )}

            {activeTab === 1 && (
              <div className="space-y-2">
                {customer.events.map(event => (
                  <div key={event.id} className="flex items-start gap-3 py-2 border-b border-gray-50">
                    <span className="inline-flex px-2 py-0.5 text-xs rounded bg-blue-50 text-blue-700 whitespace-nowrap">{event.eventType}</span>
                    <span className="text-xs text-gray-400">{new Date(event.occurredAt).toLocaleString('ko-KR')}</span>
                  </div>
                ))}
                {customer.events.length === 0 && <EmptyState message="이벤트 내역이 없습니다" />}
              </div>
            )}

            {activeTab === 2 && <EmptyState message="캠페인 수신 내역이 없습니다" />}
            {activeTab === 3 && <EmptyState message="VOC 내역이 없습니다" />}
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
  return (
    <div className="flex flex-col items-center">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-sm font-bold text-blue-700">{value}</span>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return <div className="flex items-center justify-center h-32 text-sm text-gray-400">{message}</div>
}
