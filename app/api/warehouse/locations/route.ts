import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAuth } from '@/lib/middleware/withAuth'

export const GET = withAuth(async () => {
  const locations = await prisma.warehouseLocation.findMany({
    where: { isActive: true },
    orderBy: [{ zone: 'asc' }, { code: 'asc' }],
  })
  return NextResponse.json({ locations })
})

export const POST = withAuth(async (req) => {
  const body = await req.json()
  if (!body.code?.trim()) return NextResponse.json({ error: '창고 코드는 필수입니다' }, { status: 400 })
  if (!body.name?.trim()) return NextResponse.json({ error: '창고명은 필수입니다' }, { status: 400 })

  try {
    const location = await prisma.warehouseLocation.create({
      data: {
        code: body.code.trim(),
        name: body.name.trim(),
        zone: body.zone?.trim() || null,
        capacity: body.capacity ? Number(body.capacity) : null,
      },
    })
    return NextResponse.json({ location }, { status: 201 })
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'P2002') return NextResponse.json({ error: '이미 존재하는 창고 코드입니다' }, { status: 409 })
    throw e
  }
})
