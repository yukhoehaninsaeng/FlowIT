'use client'

import { useEffect, useState, useCallback } from 'react'
import { Plus, Search, ArrowDownCircle, ArrowUpCircle, MoveRight, Warehouse, MapPin, X, Loader2 } from 'lucide-react'

interface Location {
  id: string; code: string; name: string; zone: string | null; capacity: number | null; isActive: boolean
}

interface Movement {
  id: string; type: string; skuCode: string | null; skuName: string | null
  locationCode: string | null; qty: number; lotNumber: string | null; notes: string | null; createdAt: string
}

const MOVE_TYPE: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  inbound:  { label: '입고',     icon: <ArrowDownCircle size={13} />, color: 'text-green-600' },
  outbound: { label: '출고',     icon: <ArrowUpCircle size={13} />,   color: 'text-red-600' },
  transfer: { label: '이동',     icon: <MoveRight size={13} />,       color: 'text-blue-600' },
  return:   { label: '반품입고', icon: <ArrowDownCircle size={13} />, color: 'text-orange-600' },
  adjust:   { label: '재고조정', icon: null,                           color: 'text-gray-600' },
}

const DEFAULT_LOC_FORM = { code: '', name: '', zone: '', capacity: '' }
const DEFAULT_MOVE_FORM = { type: 'inbound', locationId: '', skuCode: '', skuName: '', qty: '1', lotNumber: '', notes: '' }

export default function WarehousePage() {
  const [tab, setTab] = useState<'locations' | 'movements'>('locations')
  const [locations, setLocations] = useState<Location[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const [showLocModal, setShowLocModal] = useState(false)
  const [locForm, setLocForm] = useState(DEFAULT_LOC_FORM)
  const [locSaving, setLocSaving] = useState(false)
  const [locError, setLocError] = useState('')

  const [showMoveModal, setShowMoveModal] = useState(false)
  const [moveForm, setMoveForm] = useState(DEFAULT_MOVE_FORM)
  const [moveSaving, setMoveSaving] = useState(false)
  const [moveError, setMoveError] = useState('')

  const loadLocations = useCallback(() =>
    fetch('/api/warehouse/locations').then(r => r.ok ? r.json() : { locations: [] })
      .then(d => setLocations(d.locations ?? [])), [])

  const loadMovements = useCallback(() =>
    fetch('/api/warehouse/movements').then(r => r.ok ? r.json() : { movements: [] })
      .then(d => setMovements(d.movements ?? [])), [])

  useEffect(() => {
    setLoading(true)
    Promise.all([loadLocations(), loadMovements()]).finally(() => setLoading(false))
  }, [loadLocations, loadMovements])

  async function handleCreateLocation() {
    if (!locForm.code.trim()) { setLocError('창고 코드를 입력하세요.'); return }
    if (!locForm.name.trim()) { setLocError('창고명을 입력하세요.'); return }
    setLocSaving(true); setLocError('')
    try {
      const r = await fetch('/api/warehouse/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: locForm.code.trim(),
          name: locForm.name.trim(),
          zone: locForm.zone.trim() || null,
          capacity: locForm.capacity ? Number(locForm.capacity) : null,
        }),
      })
      if (!r.ok) { const d = await r.json(); setLocError(d.error ?? '등록 실패'); return }
      setShowLocModal(false); setLocForm(DEFAULT_LOC_FORM); loadLocations()
    } finally { setLocSaving(false) }
  }

  async function handleCreateMovement() {
    if (!moveForm.skuCode.trim()) { setMoveError('SKU 코드를 입력하세요.'); return }
    if (!moveForm.qty || Number(moveForm.qty) <= 0) { setMoveError('수량을 입력하세요.'); return }
    setMoveSaving(true); setMoveError('')
    try {
      const r = await fetch('/api/warehouse/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: moveForm.type,
          locationId: moveForm.locationId || null,
          skuCode: moveForm.skuCode.trim(),
          skuName: moveForm.skuName.trim() || null,
          qty: Number(moveForm.qty),
          lotNumber: moveForm.lotNumber.trim() || null,
          notes: moveForm.notes.trim() || null,
        }),
      })
      if (!r.ok) { const d = await r.json(); setMoveError(d.error ?? '등록 실패'); return }
      setShowMoveModal(false); setMoveForm(DEFAULT_MOVE_FORM); loadMovements()
    } finally { setMoveSaving(false) }
  }

  const filteredMovements = movements.filter(m =>
    (!typeFilter || m.type === typeFilter) &&
    ((m.skuCode ?? '').toLowerCase().includes(search.toLowerCase()) ||
     (m.skuName ?? '').toLowerCase().includes(search.toLowerCase()) ||
     (m.lotNumber ?? '').toLowerCase().includes(search.toLowerCase()))
  )
  const filteredLocations = locations.filter(l =>
    l.code.toLowerCase().includes(search.toLowerCase()) ||
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    (l.zone ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {([['locations', '창고 목록'], ['movements', '입출고 내역']] as const).map(([t, label]) => (
            <button key={t} onClick={() => { setTab(t); setSearch('') }}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}>
              {label}
            </button>
          ))}
        </div>
        {tab === 'locations' ? (
          <button onClick={() => { setShowLocModal(true); setLocError('') }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
            <Plus size={14} /> 창고 등록
          </button>
        ) : (
          <button onClick={() => { setShowMoveModal(true); setMoveError('') }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
            <Plus size={14} /> 입출고 등록
          </button>
        )}
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={tab === 'locations' ? '코드, 창고명, 구역 검색...' : 'SKU, 상품명, LOT 검색...'}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
        </div>
        {tab === 'movements' && (
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-md bg-white">
            <option value="">전체 유형</option>
            {Object.entries(MOVE_TYPE).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
          </select>
        )}
      </div>

      {tab === 'locations' ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">창고 코드</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">창고명</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">구역</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">용량</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? <tr><td colSpan={4} className="py-12 text-center text-gray-400">로딩 중...</td></tr>
              : filteredLocations.length === 0 ? (
                <tr><td colSpan={4} className="py-12 text-center">
                  <MapPin size={32} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-400">등록된 창고가 없습니다</p>
                  <button onClick={() => setShowLocModal(true)} className="mt-2 text-sm text-blue-600">창고 등록하기</button>
                </td></tr>
              ) : filteredLocations.map(l => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-blue-600">{l.code}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{l.name}</td>
                  <td className="px-4 py-3 text-gray-600">{l.zone ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{l.capacity != null ? l.capacity.toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">유형</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">SKU</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">LOT 번호</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">위치</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">수량</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">비고</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">일시</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? <tr><td colSpan={7} className="py-12 text-center text-gray-400">로딩 중...</td></tr>
              : filteredMovements.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center">
                  <Warehouse size={32} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-400">입출고 내역이 없습니다</p>
                  <button onClick={() => setShowMoveModal(true)} className="mt-2 text-sm text-blue-600">입출고 등록하기</button>
                </td></tr>
              ) : filteredMovements.map(m => {
                const cfg = MOVE_TYPE[m.type] ?? { label: m.type, icon: null, color: 'text-gray-600' }
                return (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1 font-medium ${cfg.color}`}>{cfg.icon}{cfg.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs text-gray-500">{m.skuCode}</div>
                      <div className="text-gray-700">{m.skuName}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{m.lotNumber ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{m.locationCode ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {m.type === 'outbound' ? `-${m.qty}` : `+${m.qty}`}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{m.notes ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(m.createdAt).toLocaleString('ko-KR')}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showLocModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900">창고 등록</h2>
              <button onClick={() => setShowLocModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-3">
              {locError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-md">{locError}</p>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">창고 코드 *</label>
                  <input value={locForm.code} onChange={e => setLocForm(p => ({ ...p, code: e.target.value }))}
                    placeholder="WH-A1"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">창고명 *</label>
                  <input value={locForm.name} onChange={e => setLocForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="1번 창고"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">구역 (Zone)</label>
                  <input value={locForm.zone} onChange={e => setLocForm(p => ({ ...p, zone: e.target.value }))}
                    placeholder="A"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">용량 (팔레트)</label>
                  <input type="number" min={0} value={locForm.capacity} onChange={e => setLocForm(p => ({ ...p, capacity: e.target.value }))}
                    placeholder="100"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-gray-200">
              <button onClick={handleCreateLocation} disabled={locSaving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
                {locSaving && <Loader2 size={13} className="animate-spin" />} 등록
              </button>
              <button onClick={() => setShowLocModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">취소</button>
            </div>
          </div>
        </div>
      )}

      {showMoveModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900">입출고 등록</h2>
              <button onClick={() => setShowMoveModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="px-6 py-5 space-y-3">
              {moveError && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-md">{moveError}</p>}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">유형 *</label>
                  <select value={moveForm.type} onChange={e => setMoveForm(p => ({ ...p, type: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white">
                    {Object.entries(MOVE_TYPE).map(([v, c]) => <option key={v} value={v}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">창고 위치</label>
                  <select value={moveForm.locationId} onChange={e => setMoveForm(p => ({ ...p, locationId: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md bg-white">
                    <option value="">선택 안함</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.code} — {l.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">SKU 코드 *</label>
                  <input value={moveForm.skuCode} onChange={e => setMoveForm(p => ({ ...p, skuCode: e.target.value }))}
                    placeholder="SKU-001"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">수량 *</label>
                  <input type="number" min={1} value={moveForm.qty} onChange={e => setMoveForm(p => ({ ...p, qty: e.target.value }))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-right" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">상품명</label>
                  <input value={moveForm.skuName} onChange={e => setMoveForm(p => ({ ...p, skuName: e.target.value }))}
                    placeholder="상품명 (선택)"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">LOT 번호</label>
                  <input value={moveForm.lotNumber} onChange={e => setMoveForm(p => ({ ...p, lotNumber: e.target.value }))}
                    placeholder="LOT-20240101"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">비고</label>
                  <input value={moveForm.notes} onChange={e => setMoveForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder="특이사항"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4 border-t border-gray-200">
              <button onClick={handleCreateMovement} disabled={moveSaving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50">
                {moveSaving && <Loader2 size={13} className="animate-spin" />} 등록
              </button>
              <button onClick={() => setShowMoveModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
