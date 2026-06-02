import { prisma } from '@/lib/db'

interface JourneyStep {
  type: 'send_message' | 'delay' | 'condition'
  config: Record<string, unknown>
}

export async function runJourneyBatch() {
  const now = new Date()
  const enrollments = await prisma.journeyEnrollment.findMany({
    where: { status: 'active' },
    include: { journey: true }
  })

  for (const enrollment of enrollments) {
    try {
      const steps = (enrollment.journey.steps as unknown) as JourneyStep[]
      if (enrollment.currentStep >= steps.length) {
        await prisma.journeyEnrollment.update({
          where: { id: enrollment.id },
          data: { status: 'completed' }
        })
        continue
      }

      const step = steps[enrollment.currentStep]
      await executeStep(enrollment.id, enrollment.customerId, step, enrollment.currentStep, steps.length)
    } catch (err) {
      console.error(`Journey enrollment ${enrollment.id} failed:`, err)
    }
  }
}

async function executeStep(
  enrollmentId: string,
  customerId: string,
  step: JourneyStep,
  currentStep: number,
  totalSteps: number
) {
  if (step.type === 'send_message') {
    const campaignId = step.config.campaignId as string
    await prisma.campaignSend.create({
      data: { campaignId, customerId, status: 'sent' }
    })
    await advanceStep(enrollmentId, currentStep, totalSteps, null)
  } else if (step.type === 'delay') {
    await prisma.journeyEnrollment.update({
      where: { id: enrollmentId },
      data: { currentStep: currentStep + 1 }
    })
  } else if (step.type === 'condition') {
    const met = await evaluateCondition(customerId, step.config)
    const branch = met
      ? (step.config.true as JourneyStep[])
      : (step.config.false as JourneyStep[])

    if (branch && branch.length > 0) {
      await executeStep(enrollmentId, customerId, branch[0], 0, branch.length)
    } else {
      await advanceStep(enrollmentId, currentStep, totalSteps, null)
    }
  }
}

async function advanceStep(enrollmentId: string, currentStep: number, totalSteps: number, _nextRunAt: Date | null) {
  const nextStep = currentStep + 1
  await prisma.journeyEnrollment.update({
    where: { id: enrollmentId },
    data: {
      currentStep: nextStep,
      status: nextStep >= totalSteps ? 'completed' : 'active'
    }
  })
}

async function evaluateCondition(customerId: string, config: Record<string, unknown>): Promise<boolean> {
  const check = config.check as string
  const days = config.days as number
  const since = new Date(Date.now() - days * 86400000)

  if (check === 'purchased') {
    const count = await prisma.order.count({
      where: { customerId, orderedAt: { gte: since } }
    })
    return count > 0
  }
  if (check === 'opened_campaign') {
    const count = await prisma.campaignSend.count({
      where: { customerId, openedAt: { gte: since } }
    })
    return count > 0
  }
  if (check === 'is_segment') {
    const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { segment: true } })
    return customer?.segment === config.segment
  }
  return false
}
