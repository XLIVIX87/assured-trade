import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/guards'
import { apiHandler } from '@/lib/api/handler'
import { apiSuccess } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { logAudit } from '@/lib/audit'
import { issueUpdateSchema } from '@/lib/validation/schemas'

type RouteContext = { params: Promise<{ id: string }> }

// PATCH /api/issues/:id — Update issue (Ops only)
export const PATCH = apiHandler(async (req: NextRequest, ctx?: RouteContext) => {
  const auth = await requireAuth()
  const { id } = await ctx!.params
  const { role } = auth.membership

  if (role !== 'OPS') {
    throw Errors.forbidden('Only Ops can update issues')
  }

  const issue = await prisma.issue.findUnique({
    where: { id },
    include: {
      tradeCase: { select: { id: true, referenceCode: true } },
    },
  })

  if (!issue) {
    throw Errors.notFound('Issue not found')
  }

  const body = await req.json()
  const data = issueUpdateSchema.parse(body)

  const updateData: Record<string, unknown> = {}

  if (data.status !== undefined) {
    updateData.status = data.status
    if (data.status === 'RESOLVED' || data.status === 'CLOSED') {
      updateData.resolvedAt = new Date()
    }
  }

  if (data.resolutionNotes !== undefined) {
    updateData.resolutionNotes = data.resolutionNotes
  }

  if (data.ownerUserId !== undefined) {
    updateData.ownerUserId = data.ownerUserId
  }

  const before = {
    status: issue.status,
    ownerUserId: issue.ownerUserId,
    resolutionNotes: issue.resolutionNotes,
  }

  const updated = await prisma.issue.update({
    where: { id },
    data: updateData,
    include: {
      tradeCase: { select: { id: true, referenceCode: true } },
      owner: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  })

  await logAudit({
    actorUserId: auth.user.id,
    actorOrganizationId: auth.membership.organizationId,
    entityType: 'Issue',
    entityId: id,
    action: 'ISSUE_UPDATED',
    before: before,
    after: { status: updated.status, ownerUserId: updated.ownerUserId },
    tradeCaseId: issue.tradeCaseId,
  })

  return apiSuccess(updated)
})
