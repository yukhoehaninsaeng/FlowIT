import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/middleware/withAuth'
import { MODULE_REGISTRY } from '@/lib/modules/registry'

// GET /api/admin/modules — list all modules with enabled state
export const GET = withAuth(async (_req) => {
  // For now use a single shared workspace (single-tenant mode)
  // In multi-tenant mode, workspaceId comes from session
  let workspace = await prisma.workspace.findFirst({ orderBy: { createdAt: 'asc' } })
  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: { name: 'Default', slug: 'default', industry: 'general' }
    })
  }

  const saved = await prisma.workspaceModule.findMany({
    where: { workspaceId: workspace.id }
  })
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

  return NextResponse.json({ modules, workspaceId: workspace.id, industry: workspace.industry })
}, ['admin', 'super_admin'])

// PUT /api/admin/modules — bulk update enabled state
export const PUT = withAuth(async (req) => {
  const body = await req.json()
  // body: { updates: { key: string; isEnabled: boolean; displayOrder?: number }[] }
  const { updates } = body as { updates: { key: string; isEnabled: boolean; displayOrder?: number }[] }

  let workspace = await prisma.workspace.findFirst({ orderBy: { createdAt: 'asc' } })
  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: { name: 'Default', slug: 'default', industry: 'general' }
    })
  }

  await Promise.all(
    updates.map((u, idx) =>
      prisma.workspaceModule.upsert({
        where: { workspaceId_moduleKey: { workspaceId: workspace!.id, moduleKey: u.key } },
        update: { isEnabled: u.isEnabled, displayOrder: u.displayOrder ?? idx },
        create: {
          workspaceId: workspace!.id,
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
  const { INDUSTRY_PRESETS } = await import('@/lib/modules/registry')
  const preset = INDUSTRY_PRESETS[industry]
  if (!preset) return NextResponse.json({ error: 'Unknown industry' }, { status: 400 })

  let workspace = await prisma.workspace.findFirst({ orderBy: { createdAt: 'asc' } })
  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: { name: 'Default', slug: 'default', industry }
    })
  } else {
    await prisma.workspace.update({ where: { id: workspace.id }, data: { industry } })
  }

  await Promise.all(
    MODULE_REGISTRY.map((def, idx) =>
      prisma.workspaceModule.upsert({
        where: { workspaceId_moduleKey: { workspaceId: workspace!.id, moduleKey: def.key } },
        update: { isEnabled: preset.includes(def.key), displayOrder: preset.indexOf(def.key) >= 0 ? preset.indexOf(def.key) : idx + 100 },
        create: {
          workspaceId: workspace!.id,
          moduleKey: def.key,
          isEnabled: preset.includes(def.key),
          displayOrder: preset.indexOf(def.key) >= 0 ? preset.indexOf(def.key) : idx + 100,
        },
      })
    )
  )

  return NextResponse.json({ ok: true })
}, ['admin', 'super_admin'])
