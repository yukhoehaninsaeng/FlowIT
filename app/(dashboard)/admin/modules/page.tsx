'use client'

import { useEffect, useState, useCallback } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { MODULE_REGISTRY, CATEGORY_LABELS, INDUSTRY_PRESETS, type ModuleCategory } from '@/lib/modules/registry'
import { ToggleLeft, ToggleRight, Loader2, CheckCircle, RefreshCw, AlertTriangle, Info } from 'lucide-react'

interface ModuleState {
  key: string
  label: string
  category: ModuleCategory
  description: string
  isEnabled: boolean
  displayOrder: number
}

const INDUSTRY_OPTIONS = [
  { value: 'cosmetics', label: '화장품·뷰티' },
  { value: 'logistics', label: '물류·유통' },
  { value: 'food', label: '식품·F&B' },
  { value: 'general', label: '일반' },
]

export default function ModulesPage() {
  const [modules, setModules] = useState<ModuleState[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [applyingPreset, setApplyingPreset] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [industry, setIndustry] = useState('general')
  const [dbReady, setDbReady] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/admin/modules')
      const d = await r.json()
      if (!r.ok) {
        setError(d.error ?? '모듈 목록을 불러오지 못했습니다.')
        return
      }
      setModules(d.modules ?? [])
      setIndustry(d.industry ?? 'general')
      setDbReady(d.dbReady !== false)
    } catch {
      setError('서버에 연결할 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function toggle(key: string) {
    setModules(prev => prev.map(m => m.key === key ? { ...m, isEnabled: !m.isEnabled } : m))
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const r = await fetch('/api/admin/modules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: modules.map((m, idx) => ({ key: m.key, isEnabled: m.isEnabled, displayOrder: idx }))
        })
      })
      const d = await r.json()
      if (!r.ok) {
        setError(d.error ?? '저장 실패')
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      // Sidebar 캐시 무효화: 모듈 캐시를 지우고 페이지 새로고침
      if (typeof window !== 'undefined') {
        // useModules 캐시는 모듈 레벨 변수라 reload로 초기화
        window.location.reload()
      }
    } finally {
      setSaving(false)
    }
  }

  async function applyPreset(ind: string) {
    setApplyingPreset(ind)
    setError(null)
    try {
      const r = await fetch('/api/admin/modules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ industry: ind })
      })
      const d = await r.json()
      if (!r.ok) {
        setError(d.error ?? '프리셋 적용 실패')
        return
      }
      setIndustry(ind)
      await load()  // DB에서 변경된 값 다시 로드
    } finally {
      setApplyingPreset(null)
    }
  }

  const categories = Array.from(new Set(MODULE_REGISTRY.map(m => m.category))) as ModuleCategory[]

  return (
    <div className="min-h-screen bg-gray-50">
      <Topbar title="모듈 관리" />
      <main className="pt-14 pl-[220px]">
        <div className="p-6 max-w-4xl">

          {/* DB 미준비 경고 */}
          {!dbReady && (
            <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-5">
              <AlertTriangle size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">DB 테이블이 준비되지 않았습니다</p>
                <p className="text-xs text-yellow-700 mt-1">
                  Supabase SQL 에디터에서 <code className="bg-yellow-100 px-1 rounded">workspaces</code>, <code className="bg-yellow-100 px-1 rounded">workspace_modules</code> 테이블을 생성해야 합니다.
                  테이블 생성 전까지는 변경사항이 저장되지 않습니다.
                </p>
              </div>
            </div>
          )}

          {/* 에러 메시지 */}
          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-4 mb-5">
              <AlertTriangle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* 업종 프리셋 */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">업종 프리셋 적용</h2>
            <p className="text-xs text-gray-500 mb-4">업종에 맞는 모듈 세트를 한 번에 활성화합니다.</p>
            <div className="flex flex-wrap gap-2">
              {INDUSTRY_OPTIONS.map(opt => {
                const isApplying = applyingPreset === opt.value
                const isActive = industry === opt.value && applyingPreset === null
                return (
                  <button
                    key={opt.value}
                    onClick={() => applyPreset(opt.value)}
                    disabled={applyingPreset !== null}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium border transition-colors disabled:opacity-60 ${
                      isActive
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {isApplying
                      ? <Loader2 size={13} className="animate-spin" />
                      : null}
                    {opt.label}
                    {INDUSTRY_PRESETS[opt.value] && (
                      <span className="text-xs opacity-60">({INDUSTRY_PRESETS[opt.value].length}개)</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 모듈 목록 */}
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-6">
              {categories.map(cat => {
                const catModules = modules.filter(m => {
                  const def = MODULE_REGISTRY.find(d => d.key === m.key)
                  return def?.category === cat
                })
                if (!catModules.length) return null
                return (
                  <div key={cat} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
                      <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        {CATEGORY_LABELS[cat]}
                      </h3>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {catModules.map(m => (
                        <div key={m.key} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50">
                          <div className="flex-1 min-w-0 mr-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">{m.label}</span>
                              {m.isEnabled && (
                                <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">활성</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{m.description}</p>
                          </div>
                          <button
                            onClick={() => toggle(m.key)}
                            className={`flex-shrink-0 transition-colors ${m.isEnabled ? 'text-blue-600' : 'text-gray-300'}`}
                          >
                            {m.isEnabled
                              ? <ToggleRight size={32} />
                              : <ToggleLeft size={32} />}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* 저장 버튼 */}
          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={save}
              disabled={saving || loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              변경사항 저장
            </button>
            {saved && (
              <span className="flex items-center gap-1 text-sm text-green-600">
                <CheckCircle size={14} /> 저장되었습니다
              </span>
            )}
            <button
              onClick={load}
              className="flex items-center gap-1 px-3 py-2.5 text-sm text-gray-500 hover:text-gray-700"
            >
              <RefreshCw size={14} /> 새로고침
            </button>
          </div>

        </div>
      </main>
    </div>
  )
}
