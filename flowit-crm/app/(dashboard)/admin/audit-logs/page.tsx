'use client'

import { useState, useEffect } from 'react'
import { Download } from 'lucide-react'

interface AuditLog {
  id: string; action: string; resource: string; resourceId: string | null
  ip: string; createdAt: string
  user: { name: string; email: string }
}

const RISK_ACTIONS = ['DELETE', 'EXPORT', 'INVITE']

const ACTION_COLOR: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  EXPORT: 'bg-orange-100 text-orange-700',
  INVITE: 'bg-purple-100 text-purple-700',
  LOGIN: 'bg-gray-100 text-gray-600',
  LOGOUT: 'bg-gray-100 text-gray-600',
  SEND: 'bg-yellow-100 text-yellow-700'
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [action, setAction] = useState('')
  const [resource, setResource] = useState('')

  useEffect(() => {
    const params = new URLSearchParams({ limit: '50' })
    if (action) params.set('action', action)
    if (resource) params.set('resource', resource)
    fetch(`/api/admin/audit-logs?${params}`).then(r => r.json()).then(d => setLogs(d.data ?? []))
  }, [action, resource])

  const exportCsv = () => {
    const params = new URLSearchParams({ format: 'csv', limit: '1000' })
    if (action) params.set('action', action)
    if (resource) params.set('resource', resource)
    window.open(`/api/admin/audit-logs?${params}`, '_blank')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">감사 로그</h1>
        <button
          onClick={exportCsv}
          className="flex items-center gap-2 border border-gray-300 text-gray-700 px-3 py-2 rounded-md text-sm hover:bg-gray-50"
        >
          <Download size={14} />
          CSV 내보내기
        </button>
      </div>

      <div className="flex items-center gap-3">
        <select
          value={action}
          onChange={e => setAction(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none"
        >
          <option value="">전체 액션</option>
          {['CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'INVITE', 'LOGIN', 'LOGOUT', 'SEND'].map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <select
          value={resource}
          onChange={e => setResource(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none"
        >
          <option value="">전체 리소스</option>
          {['customer', 'order', 'campaign', 'sku', 'user', 'api_connection', 'deal'].map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">시각</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">사용자</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">액션</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">리소스</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => {
              const isRisk = RISK_ACTIONS.includes(log.action)
              return (
                <tr key={log.id} className={`border-b border-gray-50 hover:bg-gray-50 ${isRisk ? 'bg-red-50/30' : ''}`}>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(log.createdAt).toLocaleString('ko-KR')}</td>
                  <td className="px-4 py-3 text-gray-700">{log.user?.name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${ACTION_COLOR[log.action] ?? 'bg-gray-100 text-gray-600'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{log.resource}{log.resourceId ? ` #${log.resourceId.slice(0, 8)}` : ''}</td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{log.ip}</td>
                </tr>
              )
            })}
            {logs.length === 0 && (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400 text-sm">감사 로그가 없습니다</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
