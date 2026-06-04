'use client'

import { useState, useEffect } from 'react'
import { Plus, RefreshCw, Trash2, X, Loader2, Link2, Eye, EyeOff } from 'lucide-react'

interface ApiConnection {
  id: string; name: string; channel: string; endpoint: string; authType: string
  status: string; lastLatencyMs: number | null; lastCheckedAt: string | null; errorMessage: string | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  connected: { label: '연결됨',  color: 'bg-green-100 text-green-700' },
  delayed:   { label: '지연',    color: 'bg-yellow-100 text-yellow-700' },
  error:     { label: '오류',    color: 'bg-red-100 text-red-700' },
  unknown:   { label: '미확인',  color: 'bg-gray-100 text-gray-500' },
}

const AUTH_TYPES = [
  { value: 'api_key', label: 'API Key' },
  { value: 'oauth2',  label: 'OAuth 2.0' },
  { value: 'basic',   label: 'Basic Auth' },
]

const CHANNEL_PRESETS = [
  '카카오', '네이버', '인스타그램', '페이스북', '구글', '슬랙', '노션',
  'Shopify', 'WooCommerce', 'Stripe', 'Twilio', '기타',
]

const DEFAULT_FORM = { name: '', channel: '', endpoint: '', authType: 'api_key', token: '' }

export default function ApiConnectionsPage() {
  const [connections, setConnections] = useState<ApiConnection[]>([])
  const [testing, setTesting]         = useState<string | null>(null)
  const [showModal, setShowModal]     = useState(false)
  const [form, setForm]               = useState(DEFAULT_FORM)
  const [saving, setSaving]           = useState(false)
  const [saveError, setSaveError]     = useState('')
  const [showToken, setShowToken]     = useState(false)

  useEffect(() => {
    fetch('/api/admin/api-connections').then(r => r.json()).then(d => setConnections(d.data ?? []))
  }, [])

  async function handleAdd() {
    setSaving(true); setSaveError('')
    try {
      const res = await fetch('/api/admin/api-connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:     form.name.trim(),
          channel:  form.channel.trim(),
          endpoint: form.endpoint.trim(),
          authType: form.authType,
          token:    form.token.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setSaveError(data.error ?? '등록 실패'); return }

      const newConn: ApiConnection = data.data
      setConnections(prev => [newConn, ...prev])
      setShowModal(false)
      setForm(DEFAULT_FORM)

      // 등록 직후 자동 테스트
      setTesting(newConn.id)
      const testRes = await fetch(`/api/admin/api-connections/${newConn.id}/test`, { method: 'POST' })
      const testData = await testRes.json()
      setTesting(null)
      setConnections(prev => prev.map(c => c.id === newConn.id
        ? { ...c, status: testData.data?.status ?? 'unknown', lastLatencyMs: testData.data?.latencyMs ?? null, lastCheckedAt: new Date().toISOString() }
        : c
      ))
    } finally { setSaving(false) }
  }

  async function testConnection(id: string) {
    setTesting(id)
    const res  = await fetch(`/api/admin/api-connections/${id}/test`, { method: 'POST' })
    const data = await res.json()
    setTesting(null)
    setConnections(prev => prev.map(c => c.id === id
      ? { ...c, status: data.data?.status ?? 'error', lastLatencyMs: data.data?.latencyMs ?? null, lastCheckedAt: new Date().toISOString(), errorMessage: data.data?.error ?? null }
      : c
    ))
  }

  async function deleteConnection(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    await fetch(`/api/admin/api-connections/${id}`, { method: 'DELETE' })
    setConnections(prev => prev.filter(c => c.id !== id))
  }

  const formValid = form.name.trim() && form.channel.trim() && form.endpoint.trim()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">API 연결</h1>
        <button onClick={() => { setShowModal(true); setSaveError(''); setForm(DEFAULT_FORM) }}
          className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-700">
          <Plus size={14} /> 연결 추가
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {connections.map(conn => {
          const status = STATUS_CONFIG[conn.status] ?? STATUS_CONFIG.unknown
          return (
            <div key={conn.id} className={`bg-white rounded-xl border p-5 ${conn.status === 'error' ? 'border-red-200' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900">{conn.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{conn.channel} · {AUTH_TYPES.find(a => a.value === conn.authType)?.label ?? conn.authType}</p>
                </div>
                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${status.color}`}>{status.label}</span>
              </div>

              <p className="text-xs text-gray-500 font-mono truncate mb-3">{conn.endpoint}</p>

              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>
                  {conn.lastLatencyMs != null ? `${conn.lastLatencyMs}ms` : '-'}
                  {conn.lastCheckedAt && ` · ${new Date(conn.lastCheckedAt).toLocaleTimeString('ko-KR')}`}
                </span>
                <div className="flex items-center gap-3">
                  <button onClick={() => testConnection(conn.id)} disabled={testing === conn.id}
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700 disabled:opacity-50">
                    <RefreshCw size={12} className={testing === conn.id ? 'animate-spin' : ''} />
                    테스트
                  </button>
                  <button onClick={() => deleteConnection(conn.id)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {conn.errorMessage && (
                <div className="mt-2 bg-red-50 rounded-md p-2 text-xs text-red-600 break-all">{conn.errorMessage}</div>
              )}
            </div>
          )
        })}

        {connections.length === 0 && (
          <div className="col-span-2 flex flex-col items-center justify-center h-40 text-gray-400 text-sm bg-white rounded-xl border border-gray-200 gap-2">
            <Link2 size={28} className="text-gray-200" />
            등록된 API 연결이 없습니다
          </div>
        )}
      </div>

      {/* ── 연결 추가 모달 ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-900">API 연결 추가</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* 연결 이름 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">연결 이름 *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="예: 카카오 알림톡 API"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {/* 채널 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">채널 *</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {CHANNEL_PRESETS.map(ch => (
                    <button key={ch} type="button" onClick={() => setForm(f => ({ ...f, channel: ch }))}
                      className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${form.channel === ch ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-400'}`}>
                      {ch}
                    </button>
                  ))}
                </div>
                <input value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}
                  placeholder="직접 입력"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {/* 엔드포인트 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">엔드포인트 URL *</label>
                <input value={form.endpoint} onChange={e => setForm(f => ({ ...f, endpoint: e.target.value }))}
                  placeholder="https://api.example.com/v1"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              {/* 인증 방식 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">인증 방식</label>
                <div className="flex gap-2">
                  {AUTH_TYPES.map(at => (
                    <button key={at.value} type="button" onClick={() => setForm(f => ({ ...f, authType: at.value }))}
                      className={`flex-1 py-2 rounded-md text-xs font-medium border transition-colors ${form.authType === at.value ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-400'}`}>
                      {at.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* API 키 / 토큰 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {form.authType === 'api_key' ? 'API Key' : form.authType === 'basic' ? 'Password / Token' : 'Access Token'}
                  <span className="text-gray-400 font-normal ml-1">(선택)</span>
                </label>
                <div className="relative">
                  <input value={form.token} onChange={e => setForm(f => ({ ...f, token: e.target.value }))}
                    type={showToken ? 'text' : 'password'}
                    placeholder="암호화되어 저장됩니다"
                    className="w-full px-3 py-2 pr-9 text-sm border border-gray-200 rounded-md font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button type="button" onClick={() => setShowToken(v => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {saveError && <p className="text-xs text-red-600 bg-red-50 rounded-md px-3 py-2">{saveError}</p>}
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md">취소</button>
              <button onClick={handleAdd} disabled={!formValid || saving}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-40">
                {saving && <Loader2 size={13} className="animate-spin" />}
                {saving ? '저장 중...' : '저장 및 테스트'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
