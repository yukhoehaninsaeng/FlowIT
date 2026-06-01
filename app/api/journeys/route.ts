import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

const createSchema = z.object({
  name: z.string().min(1),
  triggerType: z.string().min(1),
  triggerConfig: z.record(z.string(), z.unknown()).default({}),
  steps: z.array(z.unknown()).default([]),
  isActive: z.boolean().default(false)
})

export const GET = withAuth(async () => {
  const items = await prisma.journey.findMany({
    orderBy: { createdAt: 'desc' },
    include: { createdBy: { select: { name: true } }, _count: { select: { enrollments: true } } }
  })
  return NextResponse.json({ data: items })
})

export const POST = withAuth(async (req, { session }) => {
  const body = createSchema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Validation failed', details: body.error.flatten() }, { status: 400 })
  }
  const { triggerConfig, steps, ...rest } = body.data
  const journey = await prisma.journey.create({
    data: {
      ...rest,
      triggerConfig: triggerConfig as Prisma.InputJsonObject,
      steps: steps as Prisma.InputJsonArray,
      createdById: session.user.id
    }
  })
  return NextResponse.json({ data: journey }, { status: 201 })
})
