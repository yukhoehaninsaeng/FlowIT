'use client'

import { useState, useEffect } from 'react'
import { UserPlus, Check, X } from 'lucide-react'

interface User {
  id: string; email: string; name: string; role: string; isActive: boolean
  lastLoginAt: string | null; group: { name: string } | null; createdAt: string
}

const ROLE_COLOR: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-700',
  ADMIN: 'bg-orange-100 text-orange-700',
  MANAGER: 'bg-blue-100 text-blue-700',
  MEMBER: 'bg-gray-100 text-gray-600',
  VIEWER: 'bg-green-100 text-green-700'
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'MEMBER' })
  const [inviting, setInviting] = useState(false)
  const [inviteSuccess, setInviteSuccess] = useState(false)

  useEffect(() => {
    fetch('/api/admin/users').then(r => r.json()).then(d => setUsers(d.data ?? []))
  }, [])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviting(true)
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inviteForm)
    })
    setInviting(false)
    if (res.ok) {
      setInviteSuccess(true)
      setShowInvite(false)
      setInviteForm({ email: '', role: 'MEMBER' })
      setTimeout(() => setInviteSuccess(false), 3000)
    }
  }

  const toggleActive = async (userId: string, isActive: boolean) => {
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive })
    })
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: !isActive } : u))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">계정 관리</h1>
        <div className="flex items-center gap-3">
          {inviteSuccess && (
            <span className="text-sm text-green-600 flex items-center gap-1"><Check size={14} />초대 이메일 발송 완료</span>
          )}
          <button
            onClick={() => setShowInvite(!showInvite)}
            className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-md text-sm hover:bg-blue-700"
          >
            <UserPlus size={14} />
            초대
          </button>
        </div>
      </div>

      {showInvite && (
        <form onSubmit={handleInvite} className="bg-white border border-gray-200 rounded-xl p-4 flex items-end gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">이메일</label>
            <input
              type="email"
              required
              value={inviteForm.email}
              onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="user@company.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">역할</label>
            <select
              value={inviteForm.role}
              onChange={e => setInviteForm(p => ({ ...p, role: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none"
            >
              {['VIEWER', 'MEMBER', 'MANAGER', 'ADMIN'].map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={inviting} className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50">
            {inviting ? '발송 중...' : '초대 발송'}
          </button>
          <button type="button" onClick={() => setShowInvite(false)} className="p-2 text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">이름</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">이메일</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">역할</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">그룹</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">최근 로그인</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">상태</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${ROLE_COLOR[u.role] ?? 'bg-gray-100 text-gray-600'}`}>{u.role}</span>
                </td>
                <td className="px-4 py-3 text-gray-500">{u.group?.name ?? '-'}</td>
                <td className="px-4 py-3 text-gray-500">
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('ko-KR') : '없음'}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(u.id, u.isActive)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full cursor-pointer ${
                      u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {u.isActive ? '활성' : '비활성'}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400 text-sm">계정이 없습니다</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
