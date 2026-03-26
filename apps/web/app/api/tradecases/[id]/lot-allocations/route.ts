import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/guards'
import { apiHandler } from '@/lib/api/handler'
import { apiSuccess } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { logAudit } from '@/lib/audit'
import { lotAllocationSchema } from '@/lib/validation/schemas'

type RouteContext = { params: Promise<{ id: string }> }

// POST /api/tradecases/:id/lot-allocations — Allocate lot to case (Ops only)
export const POST = apiHandler(async (req: NextRequest, ctx?: RouteContext) => {
  const auth = await requireAuth()
  const { id } = await ctx!.params
  const { role } = auth.membership

  if (role !== 'OPS') {
    throw Errors.forbidden('Only Ops can allocate lots')
  }

  const tradeCase = await prisma.tradeCase.findUnique({ where: { id } })
  if (!tradeCase) {
    throw Errors.notFound('Trade case not found')
  }

  if (tradeCase.status !== 'ACTIVE') {
    throw Errors.conflict(`Cannot allocate lots to a ${tradeCase.status} case`)
  }

  const body = await req.json()
  const data = lotAllocationSchema.parse(body)

  // Verify lot exists
  const lot = await prisma.lot.findUnique({
    where: { id: data.lotId },
    include: {
      supplierOrganization: { select: { id: true, name: true } },
    },
  })

  if (!lot) {
    throw Errors.notFound('Lot not found')
  }

  // Check available quantity
  const existingAllocations = await prisma.lotAllocation.aggregate({
    where: { lotId: data.lotId },
    _sum: { quantityAllocated: true },
  })

  const alreadyAllocated = existingAllocations._sum.quantityAllocated ?? 0
  const remaining = lot.availableQuantity - alreadyAllocated

  if (data.quantityAllocated > remaining) {
    throw Errors.conflict(
      `Insufficient lot quantity. Available: ${remaining} ${lot.unit}, requested: ${data.quantityAllocated}`
    )
  }

  // Check for duplicate allocation of same lot to same case
  const existingAllocation = await prisma.lotAllocation.findUnique({
    where: {
      tradeCaseId_lotId: {
        tradeCaseId: id,
        lotId: data.lotId,
      },
    },
  })

  if (existingAllocation) {
    throw Errors.conflict('This lot is already allocated to this trade case')
  }

  const allocation = await prisma.lotAllocation.create({
    data: {
      tradeCaseId: id,
      lotId: data.lotId,
      supplierOrganizationId: lot.supplierOrganizationId,
      quantityAllocated: data.quantityAllocated,
      unit: lot.unit,
      notes: data.notes,
    },
    include: {
      lot: {
        select: {
          id: true,
          commodity: true,
          origin: true,
          grade: true,
          batchNumber: true,
        },
      },
      supplierOrganization: { select: { id: true, name: true } },
    },
  })

  // Update lot_allocated milestone if it exists
  await prisma.milestone.updateMany({
    where: {
      tradeCaseId: id,
      templateKey: 'lot_allocated',
      status: 'NOT_STARTED',
    },
    data: {
      status: 'DONE',
      completedAt: new Date(),
    },
  })

  await logAudit({
    actorUserId: auth.user.id,
    actorOrganizationId: auth.membership.organizationId,
    entityType: 'LotAllocation',
    entityId: allocation.id,
    action: 'LOT_ALLOCATED',
    after: allocation,
    tradeCaseId: id,
  })

  return apiSuccess(allocation, undefined, 201)
})
