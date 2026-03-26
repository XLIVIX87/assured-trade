import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/guards'
import { apiHandler } from '@/lib/api/handler'
import { apiSuccess } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { logAudit } from '@/lib/audit'
import { assignSupplierSchema } from '@/lib/validation/schemas'

type RouteContext = { params: Promise<{ id: string }> }

// POST /api/tradecases/:id/assign-supplier — Assign supplier org to case (Ops only)
export const POST = apiHandler(async (req: NextRequest, ctx?: RouteContext) => {
  const auth = await requireAuth()
  const { id } = await ctx!.params
  const { role } = auth.membership

  if (role !== 'OPS') {
    throw Errors.forbidden('Only Ops can assign suppliers')
  }

  const tradeCase = await prisma.tradeCase.findUnique({ where: { id } })
  if (!tradeCase) {
    throw Errors.notFound('Trade case not found')
  }

  const body = await req.json()
  const data = assignSupplierSchema.parse(body)

  // Verify the supplier org exists and has SUPPLIER members
  const supplierOrg = await prisma.organization.findUnique({
    where: { id: data.supplierOrgId },
    include: {
      memberships: {
        where: { role: 'SUPPLIER', status: 'ACTIVE' },
        select: { userId: true },
        take: 1,
      },
    },
  })

  if (!supplierOrg) {
    throw Errors.notFound('Supplier organization not found')
  }

  if (supplierOrg.memberships.length === 0) {
    throw Errors.validation('Organization has no active supplier members')
  }

  // Update the milestone for supplier assignment if it exists
  await prisma.milestone.updateMany({
    where: {
      tradeCaseId: id,
      templateKey: 'supplier_assigned',
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
    entityType: 'TradeCase',
    entityId: id,
    action: 'SUPPLIER_ASSIGNED',
    after: { supplierOrgId: data.supplierOrgId, notes: data.notes },
    tradeCaseId: id,
  })

  return apiSuccess({
    tradeCaseId: id,
    supplierOrganization: {
      id: supplierOrg.id,
      name: supplierOrg.name,
    },
    notes: data.notes,
  })
})
