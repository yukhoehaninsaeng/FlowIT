'use client'

import { useEffect, useState } from 'react'
import { formatKRW } from '@/lib/utils'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, Users, CreditCard, Target, AlertCircle } from 'lucide-react'

interface KpiData {
  byChannel: { channel: string; _sum: { totalAmount: string }; _count: { id: number } }[]
}

interface CustomerKpi {
  total: number; active: number; vip: number; churnRisk: number; avgLtv: string | null
}

interface AuditLog {
  id: string; action: string; resource: string; user: { name: string }; createdAt: string
}

export default function DashboardPage() {
  const [salesData, setSalesData] = useState<KpiData | null>(null)
  const [customerData, setCustomerData] = useState<CustomerKpi | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])

  useEffect(() => {
    fetch('/api/bi?type=sales&period=monthly').then(r => r.json()).then(d => setSalesData(d.data))
    fetch('/api/bi?type=customers').then(r => r.json()).then(d => setCustomerData(d.data))
    fetch('/api/admin/audit-logs?limit=10').then(r => r.json()).then(d => setAuditLogs(d.data ?? []))
  }, [])

  const totalRevenue = salesData?.byChannel?.reduce((s, c) => s + Number(c._sum.totalAmount ?? 0), 0) ?? 0

  return (
    <div className="space-y-6">
      {/* KPI 카드 */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          label="이번달 총 매출"
          value={formatKRW(totalRevenue)}
          icon={<CreditCard size={20} className="text-blue-600" />}
          bg="bg-blue-50"
        />
        <KpiCard
          label="활성 고객 수"
          value={(customerData?.active ?? 0).toLocaleString()}
          icon={<Users size={20} className="text-green-600" />}
          bg="bg-green-50"
        />
        <KpiCard
          label="평균 LTV"
          value={formatKRW(Number(customerData?.avgLtv ?? 0))}
          icon={<TrendingUp size={20} className="text-purple-600" />}
          bg="bg-purple-50"
        />
        <KpiCard
          label="이탈 위험 고객"
          value={(customerData?.churnRisk ?? 0).toLocaleString()}
          icon={<AlertCircle size={20} className="text-red-600" />}
          bg="bg-red-50"
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* 채널별 매출 차트 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">채널별 매출</h2>
          {salesData?.byChannel && salesData.byChannel.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={salesData.byChannel}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="channel" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${(v / 1000000).toFixed(0)}M`} />
                <Tooltip formatter={(v: unknown) => formatKRW(Number(v))} />
                <Bar dataKey="_sum.totalAmount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="매출 데이터가 없습니다" />
          )}
        </div>

        {/* 고객 세그먼트 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">고객 세그먼트</h2>
          <div className="grid grid-cols-2 gap-3">
            <SegmentCard label="VIP" count={customerData?.vip ?? 0} color="text-yellow-600 bg-yellow-50" />
            <SegmentCard label="이탈 위험" count={customerData?.churnRisk ?? 0} color="text-red-600 bg-red-50" />
            <SegmentCard label="전체 활성" count={customerData?.active ?? 0} color="text-blue-600 bg-blue-50" />
            <SegmentCard label="전체 고객" count={customerData?.total ?? 0} color="text-gray-600 bg-gray-50" />
          </div>
        </div>
      </div>

      {/* 최근 활동 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">최근 활동</h2>
        {auditLogs.length > 0 ? (
          <div className="space-y-2">
            {auditLogs.map(log => (
              <div key={log.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-blue-50 text-blue-700">{log.action}</span>
                  <span className="text-sm text-gray-700">{log.user?.name}</span>
                  <span className="text-xs text-gray-400">{log.resource}</span>
                </div>
                <span className="text-xs text-gray-400">{new Date(log.createdAt).toLocaleString('ko-KR')}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="활동 내역이 없습니다" />
        )}
      </div>
    </div>
  )
}

function KpiCard({ label, value, icon, bg }: { label: string; value: string; icon: React.ReactNode; bg: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-500">{label}</span>
        <div className={`${bg} p-2 rounded-lg`}>{icon}</div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function SegmentCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={`${color} rounded-lg p-4`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-1">{count.toLocaleString()}</p>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-32 text-sm text-gray-400">{message}</div>
  )
}
