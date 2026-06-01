import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/withAuth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

const updateSchema = z.object({
  name: z.string().optional(),
  triggerType: z.string().optional(),
  triggerConfig: z.record(z.string(), z.unknown()).optional(),
  steps: z.array(z.unknown()).optional(),
  isActive: z.boolean().optional()
})

export const PATCH = withAuth(async (req, { params }) => {
  const body = updateSchema.safeParse(await req.json())
  if (!body.success) {
    return NextResponse.json({ error: 'Validation failed', details: body.error.flatten() }, { status: 400 })
  }
  const { triggerConfig, steps, ...rest } = body.data
  const journey = await prisma.journey.update({
    where: { id: params?.id },
    data: {
      ...rest,
      ...(triggerConfig !== undefined ? { triggerConfig: triggerConfig as Prisma.InputJsonObject } : {}),
      ...(steps !== undefined ? { steps: steps as Prisma.InputJsonArray } : {})
    }
  })
  return NextResponse.json({ data: journey })
})
