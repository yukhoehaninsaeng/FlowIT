'use client'

import { useState, useEffect } from 'react'
import { formatKRW } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
const PERIODS = [
  { label: '이번달', value: 'monthly' },
  { label: '분기', value: 'quarterly' },
  { label: '연도', value: 'yearly' }
]

export default function BiPage() {
  const [period, setPeriod] = useState('monthly')
  const [activeTab, setActiveTab] = useState('sales')
  const [salesData, setSalesData] = useState<{ byChannel: { channel: string; _sum: { totalAmount: string }; _count: { id: number } }[] } | null>(null)
  const [customerData, setCustomerData] = useState<{ total: number; active: number; vip: number; churnRisk: number; avgLtv: string } | null>(null)
  const [marketingData, setMarketingData] = useState<{ totalSent: number; openRate: number; conversionRate: number; revenue: string } | null>(null)
  const [scmData, setScmData] = useState<{ expiringSkus: { name: string; lotExpiry: string; inventory: { qtyAvailable: number }[] }[] } | null>(null)

  useEffect(() => {
    fetch(`/api/bi?type=sales&period=${period}`).then(r => r.json()).then(d => setSalesData(d.data))
    fetch(`/api/bi?type=customers`).then(r => r.json()).then(d => setCustomerData(d.data))
    fetch(`/api/bi?type=marketing&period=${period}`).then(r => r.json()).then(d => setMarketingData(d.data))
    fetch(`/api/bi?type=scm`).then(r => r.json()).then(d => setScmData(d.data))
  }, [period])

  const totalRevenue = salesData?.byChannel?.reduce((s, c) => s + Number(c._sum.totalAmount ?? 0), 0) ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">BI 대시보드</h1>
        <div className="flex items-center gap-2">
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                period === p.value ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {['sales', 'customers', 'marketing', 'scm'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              activeTab === tab ? 'bg-white shadow-sm text-gray-900 font-medium' : 'text-gray-500'
            }`}
          >
            {tab === 'sales' ? '매출' : tab === 'customers' ? '고객' : tab === 'marketing' ? '마케팅' : 'SCM'}
          </button>
        ))}
      </div>

      {activeTab === 'sales' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <KpiCard label="총 매출" value={formatKRW(totalRevenue)} />
            <KpiCard label="총 주문 수" value={(salesData?.byChannel?.reduce((s, c) => s + c._count.id, 0) ?? 0).toLocaleString()} />
            <KpiCard label="채널 수" value={String(salesData?.byChannel?.length ?? 0)} />
          </div>
          {salesData?.byChannel && salesData.byChannel.length > 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">채널별 매출</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={salesData.byChannel}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="channel" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${(Number(v) / 1000000).toFixed(0)}M`} />
                  <Tooltip formatter={(v: unknown) => formatKRW(Number(v))} />
                  <Bar dataKey="_sum.totalAmount" radius={[4, 4, 0, 0]}>
                    {salesData.byChannel.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState message="매출 데이터가 없습니다" />
          )}
        </div>
      )}

      {activeTab === 'customers' && customerData && (
        <div className="grid grid-cols-2 gap-6">
          <div className="grid grid-cols-2 gap-4">
            <KpiCard label="전체 고객" value={(customerData.total ?? 0).toLocaleString()} />
            <KpiCard label="활성 고객" value={(customerData.active ?? 0).toLocaleString()} />
            <KpiCard label="VIP" value={(customerData.vip ?? 0).toLocaleString()} />
            <KpiCard label="이탈 위험" value={(customerData.churnRisk ?? 0).toLocaleString()} />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">평균 LTV</h3>
            <p className="text-3xl font-bold text-blue-700">{formatKRW(Number(customerData.avgLtv ?? 0))}</p>
          </div>
        </div>
      )}

      {activeTab === 'marketing' && marketingData && (
        <div className="grid grid-cols-4 gap-4">
          <KpiCard label="총 발송 수" value={(marketingData.totalSent ?? 0).toLocaleString()} />
          <KpiCard label="오픈율" value={`${((marketingData.openRate ?? 0) * 100).toFixed(1)}%`} />
          <KpiCard label="전환율" value={`${((marketingData.conversionRate ?? 0) * 100).toFixed(1)}%`} />
          <KpiCard label="기여 매출" value={formatKRW(Number(marketingData.revenue ?? 0))} />
        </div>
      )}

      {activeTab === 'scm' && scmData && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">유통기한 임박 SKU (60일 이내)</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">상품명</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">유통기한</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500">잔여 재고</th>
              </tr>
            </thead>
            <tbody>
              {scmData.expiringSkus.map((sku, i) => {
                const totalQty = sku.inventory.reduce((s, inv) => s + inv.qtyAvailable, 0)
                const days = Math.ceil((new Date(sku.lotExpiry).getTime() - Date.now()) / 86400000)
                return (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="px-4 py-3 text-gray-900">{sku.name}</td>
                    <td className="px-4 py-3">
                      <span className={days <= 7 ? 'text-red-600 font-medium' : days <= 30 ? 'text-orange-600' : 'text-gray-500'}>
                        {new Date(sku.lotExpiry).toLocaleDateString('ko-KR')} (D-{days})
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{totalQty.toLocaleString()}</td>
                  </tr>
                )
              })}
              {scmData.expiringSkus.length === 0 && (
                <tr><td colSpan={3} className="text-center py-8 text-gray-400 text-sm">유통기한 임박 SKU가 없습니다</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return <div className="flex items-center justify-center h-40 text-sm text-gray-400">{message}</div>
}
