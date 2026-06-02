'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, AlertTriangle, DollarSign, Clock, CheckCircle, Loader2 } from 'lucide-react'

interface Payment {
  id: string
  amount: string
  method: string | null
  paidAt: string
}

interface Receivable {
  id: string
  invoiceNo: string
  status: string
  amount: string
  paidAmount: string
  balance: number
  dueDate: string
  overdueDays: number
  notes: string | null
  account: { id: string; name: string }
  deal: { id: string; title: string } | null
  payments: Payment[]
}

interface Stats {
  totalUnpaid: number
  overdueCount: number
  totalOverdue: number
  count: number
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  unpaid:  { label: '미납', color: 'bg-yellow-100 text-yellow-700' },
  partial: { label: '부분납입', color: 'bg-orange-100 text-orange-700' },
  paid:    { label: '납부완료', color: 'bg-green-100 text-green-700' },
  overdue: { label: '연체', color: 'bg-red-100 text-red-700' },
}

interface PaymentForm {
  receivableId: string
  amount: string
  method: string
  bankRef: string
  paidAt: string
}

export default function ReceivablesPage() {
  const [receivables, setReceivables] = useState<Receivable[]>([])
  const [stats, setStats] = useState<Stats>({ totalUnpaid: 0, overdueCount: 0, totalOverdue: 0, count: 0 })
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showPayment, setShowPayment] = useState<PaymentForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [newForm, setNewForm] = useState({
    accountId: '', amount: '', dueDate: '', notes: ''
  })

  const load = useCallback(async () => {
    const [rr, ar] = await Promise.all([
      fetch('/api/receivables').then(r => r.json()),
      fetch('/api/accounts').then(r => r.json()),
    ])
    setReceivables(rr.receivables ?? [])
    setStats(rr.stats ?? {})
    setAccounts(ar.accounts ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function createReceivable() {
    setSaving(true)
    try {
      await fetch('/api/receivables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: newForm.accountId,
          amount: Number(newForm.amount),
          dueDate: new Date(newForm.dueDate).toISOString(),
          notes: newForm.notes || null,
        }),
      })
      setShowNew(false)
      setNewForm({ accountId: '', amount: '', dueDate: '', notes: '' })
      await load()
    } finally { setSaving(false) }
  }

  async function recordPayment() {
    if (!showPayment) return
    setSaving(true)
    try {
      await fetch('/api/receivables/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receivableId: showPayment.receivableId,
          amount: Number(showPayment.amount),
          method: showPayment.method || null,
          bankRef: showPayment.bankRef || null,
          paidAt: showPayment.paidAt || new Date().toISOString(),
        }),
      })
      setShowPayment(null)
      await load()
    } finally { setSaving(false) }
  }

  const filtered = receivables.filter(r => {
    const effectiveStatus = r.overdueDays > 0 && r.status !== 'paid' ? 'overdue' : r.status
    return !statusFilter || effectiveStatus === statusFilter
  })

  return (
    <>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <DollarSign size={14} className="text-blue-500" /> 총 미수금
              </div>
              <div className="text-2xl font-bold text-gray-900">
                ₩{Math.round(stats.totalUnpaid).toLocaleString()}
              </div>
            </div>
            <div className="bg-red-50 rounded-lg border border-red-200 p-4">
              <div className="flex items-center gap-2 text-xs text-red-600 mb-1">
                <AlertTriangle size={14} /> 연체 금액
              </div>
              <div className="text-2xl font-bold text-red-600">
                ₩{Math.round(stats.totalOverdue).toLocaleString()}
              </div>
              <div className="text-xs text-red-400">{stats.overdueCount}건 연체 중</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <Clock size={14} /> 청구 건수
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.count}</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <CheckCircle size={14} className="text-green-500" /> 납부율
              </div>
              <div className="text-2xl font-bold text-green-600">
                {stats.count > 0
                  ? `${Math.round((receivables.filter(r => r.status === 'paid').length / stats.count) * 100)}%`
                  : '—'}
              </div>
            </div>
          </div>

          {/* Filter + Actions */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {['', 'unpaid', 'partial', 'overdue', 'paid'].map(s => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${statusFilter === s ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}>
                  {s === '' ? '전체' : STATUS_CONFIG[s]?.label ?? s}
                </button>
              ))}
            </div>
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
              <Plus size={14} /> 청구서 등록
            </button>
          </div>

          {/* New form */}
          {showNew && (
            <div className="bg-white rounded-lg border border-blue-200 p-5 mb-4 shadow-sm">
              <h3 className="text-sm font-semibold mb-4">청구서 등록</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">거래처 *</label>
                  <select value={newForm.accountId} onChange={e => setNewForm(p => ({ ...p, accountId: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white">
                    <option value="">선택</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">청구금액 *</label>
                  <input type="number" value={newForm.amount} onChange={e => setNewForm(p => ({ ...p, amount: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">입금 예정일 *</label>
                  <input type="date" value={newForm.dueDate} onChange={e => setNewForm(p => ({ ...p, dueDate: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">비고</label>
                  <input value={newForm.notes} onChange={e => setNewForm(p => ({ ...p, notes: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={createReceivable} disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50">
                  {saving && <Loader2 size={14} className="animate-spin" />} 등록
                </button>
                <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-gray-600">취소</button>
              </div>
            </div>
          )}

          {/* Payment modal */}
          {showPayment && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                <h3 className="text-sm font-semibold mb-4">입금 내역 등록</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">입금액 *</label>
                    <input type="number" value={showPayment.amount}
                      onChange={e => setShowPayment(p => p ? ({ ...p, amount: e.target.value }) : null)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">결제 수단</label>
                    <select value={showPayment.method}
                      onChange={e => setShowPayment(p => p ? ({ ...p, method: e.target.value }) : null)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white">
                      <option value="">선택</option>
                      <option value="bank">계좌이체</option>
                      <option value="card">카드</option>
                      <option value="cash">현금</option>
                      <option value="check">수표</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">입금일</label>
                    <input type="date" value={showPayment.paidAt}
                      onChange={e => setShowPayment(p => p ? ({ ...p, paidAt: e.target.value }) : null)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">은행 참조번호</label>
                    <input value={showPayment.bankRef}
                      onChange={e => setShowPayment(p => p ? ({ ...p, bankRef: e.target.value }) : null)}
                      placeholder="입금 메모 또는 이체 번호"
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                </div>
                <div className="flex gap-2 mt-5">
                  <button onClick={recordPayment} disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50">
                    {saving && <Loader2 size={14} className="animate-spin" />} 입금 등록
                  </button>
                  <button onClick={() => setShowPayment(null)} className="px-4 py-2 text-sm text-gray-600">취소</button>
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">청구번호</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">거래처</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">상태</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">청구액</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">미납액</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">입금 예정일</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">연체</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">입금 등록</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={8} className="py-12 text-center text-gray-400">로딩 중...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <DollarSign size={32} className="mx-auto mb-2 text-gray-300" />
                      <p className="text-sm text-gray-400">청구 내역이 없습니다</p>
                    </td>
                  </tr>
                ) : filtered.map(r => {
                  const isOverdue = r.overdueDays > 0 && r.status !== 'paid'
                  const effectiveStatus = isOverdue ? 'overdue' : r.status
                  const cfg = STATUS_CONFIG[effectiveStatus]
                  return (
                    <tr key={r.id} className={`hover:bg-gray-50 ${isOverdue ? 'bg-red-50/40' : ''}`}>
                      <td className="px-4 py-3 font-mono text-xs text-blue-600">{r.invoiceNo}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{r.account.name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${cfg?.color}`}>{cfg?.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700">₩{Number(r.amount).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {r.status === 'paid' ? (
                          <span className="text-green-600">₩0</span>
                        ) : (
                          <span className={isOverdue ? 'text-red-600' : ''}>₩{Math.round(r.balance).toLocaleString()}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {new Date(r.dueDate).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isOverdue ? (
                          <span className="text-xs font-medium text-red-600">D+{r.overdueDays}</span>
                        ) : r.status !== 'paid' ? (
                          <span className="text-xs text-gray-400">
                            D-{Math.floor((new Date(r.dueDate).getTime() - Date.now()) / 86400000)}
                          </span>
                        ) : (
                          <CheckCircle size={14} className="text-green-500 mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r.status !== 'paid' && (
                          <button
                            onClick={() => setShowPayment({
                              receivableId: r.id,
                              amount: String(r.balance),
                              method: 'bank',
                              bankRef: '',
                              paidAt: new Date().toISOString().slice(0, 10),
                            })}
                            className="px-2.5 py-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 rounded"
                          >
                            입금 등록
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
    </>
  )
}
