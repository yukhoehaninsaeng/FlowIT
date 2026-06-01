'use client'

import { useState, useEffect } from 'react'
import { Plus, RefreshCw, Trash2 } from 'lucide-react'

interface ApiConnection {
  id: string; name: string; channel: string; endpoint: string; authType: string
  status: string; lastLatencyMs: number | null; lastCheckedAt: string | null; errorMessage: string | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  connected: { label: '연결됨', color: 'bg-green-100 text-green-700' },
  delayed: { label: '지연', color: 'bg-yellow-100 text-yellow-700' },
  error: { label: '오류', color: 'bg-red-100 text-red-700' },
  unknown: { label: '미확인', color: 'bg-gray-100 text-gray-500' }
}

export default function ApiConnectionsPage() {
  const [connections, setConnections] = useState<ApiConnection[]>([])
  const [testing, setTesting] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/api-connections').then(r => r.json()).then(d => setConnections(d.data ?? []))
  }, [])

  const testConnection = async (id: string) => {
    setTesting(id)
    const res = await fetch(`/api/admin/api-connections/${id}/test`, { method: 'POST' })
    const data = await res.json()
    setTesting(null)
    setConnections(prev => prev.map(c => c.id === id
      ? { ...c, status: data.data.status, lastLatencyMs: data.data.latencyMs, lastCheckedAt: new Date().toISOString() }
      : c
    ))
  }

  const deleteConnection = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return
    await fetch(`/api/admin/api-connections/${id}`, { method: 'DELETE' })
    setConnections(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">API 연결</h1>
        <button className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-700">
          <Plus size={14} />
          연결 추가
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {connections.map(conn => {
          const status = STATUS_CONFIG[conn.status] ?? STATUS_CONFIG.unknown
          return (
            <div key={conn.id} className={`bg-white rounded-xl border p-5 ${conn.status === 'error' ? 'border-red-200' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900">{conn.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{conn.channel} · {conn.authType}</p>
                </div>
                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${status.color}`}>{status.label}</span>
              </div>

              <p className="text-xs text-gray-500 font-mono truncate mb-3">{conn.endpoint}</p>

              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>
                  {conn.lastLatencyMs != null ? `${conn.lastLatencyMs}ms` : '-'}
                  {conn.lastCheckedAt && ` · ${new Date(conn.lastCheckedAt).toLocaleTimeString('ko-KR')}`}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => testConnection(conn.id)}
                    disabled={testing === conn.id}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700 disabled:opacity-50"
                  >
                    <RefreshCw size={12} className={testing === conn.id ? 'animate-spin' : ''} />
                    테스트
                  </button>
                  <button onClick={() => deleteConnection(conn.id)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {conn.errorMessage && (
                <div className="mt-2 bg-red-50 rounded-md p-2 text-xs text-red-600">{conn.errorMessage}</div>
              )}
            </div>
          )
        })}

        {connections.length === 0 && (
          <div className="col-span-2 flex items-center justify-center h-32 text-gray-400 text-sm bg-white rounded-xl border border-gray-200">
            API 연결이 없습니다
          </div>
        )}
      </div>
    </div>
  )
}
