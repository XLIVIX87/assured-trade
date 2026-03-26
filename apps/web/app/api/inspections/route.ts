import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/guards'
import { apiHandler } from '@/lib/api/handler'
import { apiSuccess } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { logAudit } from '@/lib/audit'
import { createNotification } from '@/lib/notifications'
import { inspectionCreateSchema } from '@/lib/validation/schemas'

// POST /api/inspections — Record inspection (Ops only)
export const POST = apiHandler(async (req: NextRequest) => {
  const auth = await requireAuth()
  const { role } = auth.membership

  if (role !== 'OPS') {
    throw Errors.forbidden('Only Ops can record inspections')
  }

  const body = await req.json()
  const data = inspectionCreateSchema.parse(body)

  // Verify trade case exists
  const tradeCase = await prisma.tradeCase.findUnique({
    where: { id: data.tradeCaseId },
    select: {
      id: true,
      referenceCode: true,
      buyerOrganizationId: true,
    },
  })

  if (!tradeCase) {
    throw Errors.notFound('Trade case not found')
  }

  // Verify lot exists if provided
  if (data.lotId) {
    const lot = await prisma.lot.findUnique({ where: { id: data.lotId } })
    if (!lot) {
      throw Errors.notFound('Lot not found')
    }
  }

  const inspection = await prisma.inspection.create({
    data: {
      tradeCaseId: data.tradeCaseId,
      lotId: data.lotId,
      provider: data.provider,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
      completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
      result: data.result,
      notes: data.notes,
      attachmentsJson: undefined,
      createdByUserId: auth.user.id,
    },
    include: {
      lot: { select: { id: true, batchNumber: true, commodity: true } },
      createdBy: { select: { id: true, name: true } },
    },
  })

  // If FAIL: block relevant milestone and create issue
  if (data.result === 'FAIL') {
    // Block the inspection-related milestone
    const inspectionMilestoneKey = data.lotId
      ? 'pre_shipment_inspection'
      : 'final_inspection'

    await prisma.milestone.updateMany({
      where: {
        tradeCaseId: data.tradeCaseId,
        templateKey: inspectionMilestoneKey,
        status: { notIn: ['DONE'] },
      },
      data: {
        status: 'BLOCKED',
        blockedReason: `Inspection failed: ${data.notes ?? 'See inspection details'}`,
      },
    })

    // Auto-create an issue
    await prisma.issue.create({
      data: {
        tradeCaseId: data.tradeCaseId,
        type: 'QUALITY',
        severity: 'HIGH',
        status: 'OPEN',
        description: `Inspection failed (provider: ${data.provider}). ${data.notes ?? ''}`.trim(),
        createdByUserId: auth.user.id,
      },
    })
  }

  // Mark inspection milestone as DONE if passed
  if (data.result === 'PASS') {
    const inspectionMilestoneKey = data.lotId
      ? 'pre_shipment_inspection'
      : 'final_inspection'

    await prisma.milestone.updateMany({
      where: {
        tradeCaseId: data.tradeCaseId,
        templateKey: inspectionMilestoneKey,
        status: { notIn: ['DONE'] },
      },
      data: {
        status: 'DONE',
        completedAt: new Date(),
      },
    })
  }

  await logAudit({
    actorUserId: auth.user.id,
    actorOrganizationId: auth.membership.organizationId,
    entityType: 'Inspection',
    entityId: inspection.id,
    action: 'INSPECTION_RECORDED',
    after: {
      result: data.result,
      provider: data.provider,
      tradeCaseId: data.tradeCaseId,
    },
    tradeCaseId: data.tradeCaseId,
  })

  // Notify buyer org
  const buyerMembers = await prisma.membership.findMany({
    where: {
      organizationId: tradeCase.buyerOrganizationId,
      role: 'BUYER',
      status: 'ACTIVE',
    },
    select: { userId: true },
  })

  await Promise.all(
    buyerMembers.map((m) =>
      createNotification({
        recipientUserId: m.userId,
        organizationId: tradeCase.buyerOrganizationId,
        tradeCaseId: data.tradeCaseId,
        type: 'INSPECTION_RECORDED',
        title: `Inspection ${data.result.toLowerCase()}`,
        body: `An inspection for case ${tradeCase.referenceCode} has been recorded with result: ${data.result}.`,
      })
    )
  )

  return apiSuccess(inspection, undefined, 201)
})
