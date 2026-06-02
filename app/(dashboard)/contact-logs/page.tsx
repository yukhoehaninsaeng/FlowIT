'use client'

import { useEffect, useState, useCallback } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import {
  Mail, Phone, MapPin, MessageSquare, Video, Plus,
  RefreshCw, Loader2, AlertCircle, Link2, ChevronDown
} from 'lucide-react'

interface ContactLog {
  id: string
  type: string
  direction: string | null
  subject: string | null
  summary: string | null
  fromEmail: string | null
  toEmails: string[]
  occurredAt: string
  nextAction: string | null
  nextActionDate: string | null
  account: { id: string; name: string } | null
  deal: { id: string; title: string } | null
}

interface Account {
  id: string
  name: string
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  email:  { icon: <Mail size={14} />, label: '이메일', color: 'text-blue-600 bg-blue-50' },
  call:   { icon: <Phone size={14} />, label: '전화', color: 'text-green-600 bg-green-50' },
  visit:  { icon: <MapPin size={14} />, label: '방문', color: 'text-orange-600 bg-orange-50' },
  kakao:  { icon: <MessageSquare size={14} />, label: '카카오', color: 'text-yellow-600 bg-yellow-50' },
  zoom:   { icon: <Video size={14} />, label: 'Zoom', color: 'text-purple-600 bg-purple-50' },
  manual: { icon: <Plus size={14} />, label: '메모', color: 'text-gray-600 bg-gray-100' },
}

export default function ContactLogsPage() {
  const [logs, setLogs] = useState<ContactLog[]>([])
  const [unmatched, setUnmatched] = useState<ContactLog[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [tab, setTab] = useState<'timeline' | 'unmatched'>('timeline')
  const [showNewLog, setShowNewLog] = useState(false)
  const [form, setForm] = useState({
    type: 'call', subject: '', summary: '', accountId: '', nextAction: '', nextActionDate: ''
  })

  const loadLogs = useCallback(async () => {
    const [logsRes, unmatchedRes, accountsRes] = await Promise.all([
      fetch('/api/contact-logs?unmatched=false').then(r => r.json()),
      fetch('/api/contact-logs/unmatched').then(r => r.json()),
      fetch('/api/accounts').then(r => r.json()),
    ])
    setLogs(logsRes.logs ?? [])
    setUnmatched(unmatchedRes.logs ?? [])
    setAccounts(accountsRes.accounts ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { loadLogs() }, [loadLogs])

  async function syncEmails() {
    setSyncing(true)
    try {
      const r = await fetch('/api/email-sync/sync', { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } })
      const d = await r.json()
      if (d.synced > 0) await loadLogs()
      alert(`${d.synced}개 이메일 동기화 완료`)
    } finally { setSyncing(false) }
  }

  async function assignUnmatched(logId: string, accountId: string) {
    await fetch('/api/contact-logs/unmatched', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logId, accountId }),
    })
    await loadLogs()
  }

  async function createLog() {
    await fetch('/api/contact-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        accountId: form.accountId || null,
        nextActionDate: form.nextActionDate || null,
        occurredAt: new Date().toISOString(),
      }),
    })
    setShowNewLog(false)
    setForm({ type: 'call', subject: '', summary: '', accountId: '', nextAction: '', nextActionDate: '' })
    await loadLogs()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Topbar title="상담 이력" />
      <main className="pt-14 pl-[220px]">
        <div className="p-6 max-w-5xl">

          {/* Header actions */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setTab('timeline')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'timeline' ? 'bg-white shadow text-gray-900' : 'text-gray-600'}`}
              >
                전체 이력
              </button>
              <button
                onClick={() => setTab('unmatched')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'unmatched' ? 'bg-white shadow text-gray-900' : 'text-gray-600'}`}
              >
                미매칭 이메일
                {unmatched.length > 0 && (
                  <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-600 rounded-full font-bold">{unmatched.length}</span>
                )}
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={syncEmails}
                disabled={syncing}
                className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-md bg-white hover:bg-gray-50"
              >
                {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                이메일 동기화
              </button>
              <button
                onClick={() => setShowNewLog(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                <Plus size={14} /> 이력 등록
              </button>
            </div>
          </div>

          {/* New log form */}
          {showNewLog && (
            <div className="bg-white rounded-lg border border-blue-200 p-5 mb-6 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">상담 이력 등록</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">유형</label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white">
                    {Object.entries(TYPE_CONFIG).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">거래처</label>
                  <select value={form.accountId} onChange={e => setForm(p => ({ ...p, accountId: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white">
                    <option value="">선택 안함</option>
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 block mb-1">제목</label>
                  <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                    placeholder="상담 제목 또는 내용 요약"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-500 block mb-1">상담 내용</label>
                  <textarea value={form.summary} onChange={e => setForm(p => ({ ...p, summary: e.target.value }))}
                    rows={3} placeholder="상담 내용을 자세히 기록하세요"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">다음 할 일</label>
                  <input value={form.nextAction} onChange={e => setForm(p => ({ ...p, nextAction: e.target.value }))}
                    placeholder="예: 샘플 발송, 견적서 제출"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">예정일</label>
                  <input type="date" value={form.nextActionDate} onChange={e => setForm(p => ({ ...p, nextActionDate: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={createLog} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">저장</button>
                <button onClick={() => setShowNewLog(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">취소</button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-gray-400" /></div>
          ) : tab === 'timeline' ? (
            <TimelineView logs={logs} />
          ) : (
            <UnmatchedView logs={unmatched} accounts={accounts} onAssign={assignUnmatched} />
          )}
        </div>
      </main>
    </div>
  )
}

function TimelineView({ logs }: { logs: ContactLog[] }) {
  if (!logs.length) return (
    <div className="text-center py-16 text-gray-400">
      <Mail size={32} className="mx-auto mb-2 text-gray-300" />
      <p>상담 이력이 없습니다</p>
    </div>
  )

  // group by date
  const grouped: Record<string, ContactLog[]> = {}
  for (const log of logs) {
    const date = new Date(log.occurredAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
    if (!grouped[date]) grouped[date] = []
    grouped[date].push(log)
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([date, items]) => (
        <div key={date}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase">{date}</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <div className="space-y-2">
            {items.map(log => <LogCard key={log.id} log={log} />)}
          </div>
        </div>
      ))}
    </div>
  )
}

function LogCard({ log }: { log: ContactLog }) {
  const cfg = TYPE_CONFIG[log.type] ?? TYPE_CONFIG.manual
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${cfg.color}`}>
          {cfg.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-900">{log.subject || cfg.label}</span>
            {log.account && (
              <span className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded-full">{log.account.name}</span>
            )}
            {log.deal && (
              <span className="px-2 py-0.5 text-xs bg-purple-50 text-purple-700 rounded-full">{log.deal.title}</span>
            )}
            {log.direction && (
              <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full">
                {log.direction === 'inbound' ? '수신' : '발신'}
              </span>
            )}
          </div>
          {log.fromEmail && (
            <div className="text-xs text-gray-400 mt-0.5">
              From: {log.fromEmail}
              {log.toEmails?.length > 0 && ` → ${log.toEmails.join(', ')}`}
            </div>
          )}
          {log.summary && (
            <div className={`text-xs text-gray-600 mt-1.5 leading-relaxed ${!expanded && 'line-clamp-2'}`}>
              {log.summary}
            </div>
          )}
          {log.summary && log.summary.length > 120 && (
            <button onClick={() => setExpanded(p => !p)} className="text-xs text-blue-600 mt-1">
              {expanded ? '접기' : '펼치기'}
            </button>
          )}
          {log.nextAction && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-orange-600">
              <AlertCircle size={11} />
              다음: {log.nextAction}
              {log.nextActionDate && (
                <span className="text-gray-500">({new Date(log.nextActionDate).toLocaleDateString('ko-KR')})</span>
              )}
            </div>
          )}
        </div>
        <div className="text-xs text-gray-400 flex-shrink-0">
          {new Date(log.occurredAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  )
}

function UnmatchedView({
  logs, accounts, onAssign
}: { logs: ContactLog[]; accounts: Account[]; onAssign: (logId: string, accountId: string) => Promise<void> }) {
  const [assigning, setAssigning] = useState<string | null>(null)

  if (!logs.length) return (
    <div className="text-center py-16">
      <AlertCircle size={32} className="mx-auto mb-2 text-green-400" />
      <p className="text-sm text-gray-500">미매칭 이메일이 없습니다</p>
    </div>
  )

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        거래처 도메인이 등록되지 않아 자동 매칭되지 않은 이메일입니다. 거래처를 지정하면 이후 같은 도메인 이메일은 자동으로 매칭됩니다.
      </p>
      {logs.map(log => (
        <div key={log.id} className="bg-white rounded-lg border border-orange-200 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Mail size={14} className="text-blue-500" />
                <span className="text-sm font-medium text-gray-900 truncate">{log.subject || '(제목 없음)'}</span>
              </div>
              <div className="text-xs text-gray-500">
                From: <span className="font-mono text-blue-600">{log.fromEmail}</span>
                {' · '}
                {new Date(log.occurredAt).toLocaleDateString('ko-KR')}
              </div>
              {log.summary && <div className="text-xs text-gray-500 mt-1.5 line-clamp-2">{log.summary}</div>}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <select
                disabled={assigning === log.id}
                onChange={async e => {
                  if (!e.target.value) return
                  setAssigning(log.id)
                  await onAssign(log.id, e.target.value)
                  setAssigning(null)
                }}
                className="px-2 py-1.5 text-xs border border-gray-200 rounded-md bg-white"
              >
                <option value="">거래처 선택...</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              {assigning === log.id && <Loader2 size={14} className="animate-spin text-gray-400" />}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
