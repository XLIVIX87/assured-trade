import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/guards'
import { apiHandler } from '@/lib/api/handler'
import { apiSuccess } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { logAudit } from '@/lib/audit'
import { tradeCaseUpdateSchema } from '@/lib/validation/schemas'

type RouteContext = { params: Promise<{ id: string }> }

// GET /api/tradecases/:id — Trade case detail
export const GET = apiHandler(async (req: NextRequest, ctx?: RouteContext) => {
  const auth = await requireAuth()
  const { id } = await ctx!.params
  const { role, organizationId } = auth.membership

  const tradeCase = await prisma.tradeCase.findUnique({
    where: { id },
    include: {
      buyerOrganization: { select: { id: true, name: true } },
      assignedOps: { select: { id: true, name: true, email: true } },
      quote: {
        select: {
          id: true,
          status: true,
          serviceFeeAmount: true,
          currency: true,
          leadTimeDays: true,
        },
      },
      rfq: {
        select: {
          id: true,
          commodity: true,
          volume: true,
          unit: true,
          destination: true,
          incoterm: true,
        },
      },
      milestones: { orderBy: { sequence: 'asc' } },
      documents: {
        include: {
          uploadedBy: { select: { id: true, name: true } },
          reviews: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      },
      inspections: {
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { id: true, name: true } },
          lot: { select: { id: true, batchNumber: true, commodity: true } },
        },
      },
      issues: {
        orderBy: { createdAt: 'desc' },
        include: {
          owner: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
      },
      lotAllocations: {
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
      },
      closeoutPacks: {
        orderBy: { generatedAt: 'desc' },
        take: 1,
      },
    },
  })

  if (!tradeCase) {
    throw Errors.notFound('Trade case not found')
  }

  // RBAC: Buyer sees own org only
  if (role === 'BUYER' && tradeCase.buyerOrganizationId !== organizationId) {
    throw Errors.forbidden('Access denied to this trade case')
  }

  // RBAC: Supplier sees only assigned cases
  if (role === 'SUPPLIER') {
    const hasAllocation = tradeCase.lotAllocations.some(
      (a) => a.supplierOrganizationId === organizationId
    )
    if (!hasAllocation) {
      throw Errors.forbidden('Access denied to this trade case')
    }
  }

  return apiSuccess(tradeCase)
})

// PATCH /api/tradecases/:id — Update case metadata (Ops only)
export const PATCH = apiHandler(async (req: NextRequest, ctx?: RouteContext) => {
  const auth = await requireAuth()
  const { id } = await ctx!.params
  const { role } = auth.membership

  if (role !== 'OPS') {
    throw Errors.forbidden('Only Ops can update trade case metadata')
  }

  const tradeCase = await prisma.tradeCase.findUnique({ where: { id } })
  if (!tradeCase) {
    throw Errors.notFound('Trade case not found')
  }

  const body = await req.json()
  const data = tradeCaseUpdateSchema.parse(body)

  const before = { ...tradeCase }
  const updated = await prisma.tradeCase.update({
    where: { id },
    data: {
      ...(data.status !== undefined && { status: data.status }),
      ...(data.routeSummary !== undefined && { routeSummary: data.routeSummary }),
      ...(data.expectedShipDate !== undefined && {
        expectedShipDate: new Date(data.expectedShipDate),
      }),
      ...(data.assignedOpsUserId !== undefined && {
        assignedOpsUserId: data.assignedOpsUserId,
      }),
    },
    include: {
      buyerOrganization: { select: { id: true, name: true } },
      assignedOps: { select: { id: true, name: true } },
    },
  })

  await logAudit({
    actorUserId: auth.user.id,
    actorOrganizationId: auth.membership.organizationId,
    entityType: 'TradeCase',
    entityId: id,
    action: 'TRADE_CASE_UPDATED',
    before: before,
    after: updated,
    tradeCaseId: id,
  })

  return apiSuccess(updated)
})
