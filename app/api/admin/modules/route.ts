import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/middleware/withAuth'
import { MODULE_REGISTRY, INDUSTRY_PRESETS } from '@/lib/modules/registry'

async function getOrCreateWorkspace() {
  try {
    let workspace = await prisma.workspace.findFirst({ orderBy: { createdAt: 'asc' } })
    if (!workspace) {
      workspace = await prisma.workspace.create({
        data: { name: 'Default', slug: 'default', industry: 'general' }
      })
    }
    return workspace
  } catch {
    return null
  }
}

// GET /api/admin/modules
export const GET = withAuth(async () => {
  const workspace = await getOrCreateWorkspace()

  // DB에 테이블이 없으면 defaultEnabled 기반으로 반환
  if (!workspace) {
    const modules = MODULE_REGISTRY.map((def, idx) => ({
      key: def.key,
      label: def.label,
      href: def.href,
      category: def.category,
      description: def.description,
      isEnabled: def.defaultEnabled,
      displayOrder: idx,
      config: null,
    }))
    return NextResponse.json({ modules, workspaceId: null, industry: 'general', dbReady: false })
  }

  const saved = await prisma.workspaceModule.findMany({
    where: { workspaceId: workspace.id }
  }).catch(() => [])

  const savedMap = Object.fromEntries(saved.map(m => [m.moduleKey, m]))

  const modules = MODULE_REGISTRY.map((def, idx) => {
    const s = savedMap[def.key]
    return {
      key: def.key,
      label: def.label,
      href: def.href,
      category: def.category,
      description: def.description,
      isEnabled: s ? s.isEnabled : def.defaultEnabled,
      displayOrder: s ? s.displayOrder : idx,
      config: s?.config ?? null,
    }
  })

  return NextResponse.json({ modules, workspaceId: workspace.id, industry: workspace.industry, dbReady: true })
}, ['admin', 'super_admin'])

// PUT /api/admin/modules — bulk update
export const PUT = withAuth(async (req) => {
  const body = await req.json()
  const { updates } = body as { updates: { key: string; isEnabled: boolean; displayOrder?: number }[] }

  const workspace = await getOrCreateWorkspace()
  if (!workspace) {
    return NextResponse.json({ error: 'DB 테이블이 없습니다. Supabase에서 SQL을 먼저 실행하세요.', dbReady: false }, { status: 503 })
  }

  await Promise.all(
    updates.map((u, idx) =>
      prisma.workspaceModule.upsert({
        where: { workspaceId_moduleKey: { workspaceId: workspace.id, moduleKey: u.key } },
        update: { isEnabled: u.isEnabled, displayOrder: u.displayOrder ?? idx },
        create: {
          workspaceId: workspace.id,
          moduleKey: u.key,
          isEnabled: u.isEnabled,
          displayOrder: u.displayOrder ?? idx,
        },
      })
    )
  )

  return NextResponse.json({ ok: true })
}, ['admin', 'super_admin'])

// PATCH /api/admin/modules — apply industry preset
export const PATCH = withAuth(async (req) => {
  const { industry } = await req.json() as { industry: string }
  const preset = INDUSTRY_PRESETS[industry]
  if (!preset) return NextResponse.json({ error: '알 수 없는 업종입니다.' }, { status: 400 })

  const workspace = await getOrCreateWorkspace()
  if (!workspace) {
    return NextResponse.json({ error: 'DB 테이블이 없습니다. Supabase에서 SQL을 먼저 실행하세요.', dbReady: false }, { status: 503 })
  }

  await prisma.workspace.update({ where: { id: workspace.id }, data: { industry } })

  await Promise.all(
    MODULE_REGISTRY.map((def, idx) =>
      prisma.workspaceModule.upsert({
        where: { workspaceId_moduleKey: { workspaceId: workspace.id, moduleKey: def.key } },
        update: {
          isEnabled: preset.includes(def.key),
          displayOrder: preset.indexOf(def.key) >= 0 ? preset.indexOf(def.key) : idx + 100,
        },
        create: {
          workspaceId: workspace.id,
          moduleKey: def.key,
          isEnabled: preset.includes(def.key),
          displayOrder: preset.indexOf(def.key) >= 0 ? preset.indexOf(def.key) : idx + 100,
        },
      })
    )
  )

  return NextResponse.json({ ok: true })
}, ['admin', 'super_admin'])

