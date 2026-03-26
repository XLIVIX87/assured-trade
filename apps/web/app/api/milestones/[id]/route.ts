import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/guards'
import { apiHandler } from '@/lib/api/handler'
import { apiSuccess } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { logAudit } from '@/lib/audit'
import { createNotification } from '@/lib/notifications'
import { milestoneUpdateSchema } from '@/lib/validation/schemas'

type RouteContext = { params: Promise<{ id: string }> }

// PATCH /api/milestones/:id — Update milestone (Ops only)
export const PATCH = apiHandler(async (req: NextRequest, ctx?: RouteContext) => {
  const auth = await requireAuth()
  const { id } = await ctx!.params
  const { role } = auth.membership

  if (role !== 'OPS') {
    throw Errors.forbidden('Only Ops can update milestones')
  }

  const milestone = await prisma.milestone.findUnique({
    where: { id },
    include: {
      tradeCase: {
        select: {
          id: true,
          referenceCode: true,
          buyerOrganizationId: true,
        },
      },
    },
  })

  if (!milestone) {
    throw Errors.notFound('Milestone not found')
  }

  const body = await req.json()
  const data = milestoneUpdateSchema.parse(body)

  // Build update data
  const updateData: Record<string, unknown> = {}

  if (data.status !== undefined) {
    // Validate state transitions
    const validTransitions: Record<string, string[]> = {
      NOT_STARTED: ['IN_PROGRESS', 'BLOCKED', 'DONE'],
      IN_PROGRESS: ['DONE', 'BLOCKED', 'OVERDUE'],
      BLOCKED: ['IN_PROGRESS', 'DONE', 'NOT_STARTED'],
      OVERDUE: ['IN_PROGRESS', 'DONE', 'BLOCKED'],
      DONE: [], // Cannot go back from DONE without special handling
    }

    const allowed = validTransitions[milestone.status] ?? []
    if (!allowed.includes(data.status)) {
      throw Errors.conflict(
        `Cannot transition milestone from ${milestone.status} to ${data.status}`
      )
    }

    updateData.status = data.status

    if (data.status === 'DONE') {
      updateData.completedAt = new Date()
    }

    if (data.status === 'BLOCKED' && data.blockedReason) {
      updateData.blockedReason = data.blockedReason
    }

    // Clear blocked reason when unblocking
    if (data.status !== 'BLOCKED' && milestone.status === 'BLOCKED') {
      updateData.blockedReason = null
    }
  }

  if (data.ownerUserId !== undefined) {
    updateData.ownerUserId = data.ownerUserId
  }

  if (data.dueDate !== undefined) {
    updateData.dueDate = new Date(data.dueDate)
  }

  if (data.blockedReason !== undefined && data.status === undefined) {
    updateData.blockedReason = data.blockedReason
  }

  const before = { status: milestone.status, ownerUserId: milestone.ownerUserId }
  const updated = await prisma.milestone.update({
    where: { id },
    data: updateData,
    include: {
      owner: { select: { id: true, name: true } },
      tradeCase: { select: { id: true, referenceCode: true } },
    },
  })

  await logAudit({
    actorUserId: auth.user.id,
    actorOrganizationId: auth.membership.organizationId,
    entityType: 'Milestone',
    entityId: id,
    action: 'MILESTONE_UPDATED',
    before: before,
    after: { status: updated.status, ownerUserId: updated.ownerUserId },
    tradeCaseId: milestone.tradeCaseId,
  })

  // Notify buyer if status changed
  if (data.status !== undefined) {
    const buyerMembers = await prisma.membership.findMany({
      where: {
        organizationId: milestone.tradeCase.buyerOrganizationId,
        role: 'BUYER',
        status: 'ACTIVE',
      },
      select: { userId: true },
    })

    await Promise.all(
      buyerMembers.map((m) =>
        createNotification({
          recipientUserId: m.userId,
          organizationId: milestone.tradeCase.buyerOrganizationId,
          tradeCaseId: milestone.tradeCaseId,
          type: 'MILESTONE_UPDATED',
          title: 'Milestone updated',
          body: `Milestone "${milestone.name}" for case ${milestone.tradeCase.referenceCode} is now ${data.status}.`,
        })
      )
    )
  }

  return apiSuccess(updated)
})
