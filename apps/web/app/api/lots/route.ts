import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/guards'
import { apiHandler } from '@/lib/api/handler'
import { apiSuccess } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { logAudit } from '@/lib/audit'
import { lotCreateSchema } from '@/lib/validation/schemas'

// POST /api/lots — Create lot (Supplier or Ops)
export const POST = apiHandler(async (req: NextRequest) => {
  const auth = await requireAuth()
  const { role, organizationId } = auth.membership

  if (role === 'BUYER') {
    throw Errors.forbidden('Buyers cannot create lots')
  }

  const body = await req.json()
  const data = lotCreateSchema.parse(body)

  // Supplier creates lots under their own org; Ops can specify a supplier org
  let supplierOrgId: string
  if (role === 'SUPPLIER') {
    supplierOrgId = organizationId
  } else {
    // Ops can specify which supplier org this lot belongs to
    supplierOrgId = data.supplierOrganizationId ?? organizationId
    if (data.supplierOrganizationId) {
      const org = await prisma.organization.findUnique({
        where: { id: data.supplierOrganizationId },
      })
      if (!org) {
        throw Errors.notFound('Supplier organization not found')
      }
    }
  }

  const lot = await prisma.lot.create({
    data: {
      supplierOrganizationId: supplierOrgId,
      createdByUserId: auth.user.id,
      commodity: data.commodity,
      origin: data.origin,
      grade: data.grade,
      batchNumber: data.batchNumber,
      availableQuantity: data.availableQuantity,
      unit: data.unit,
      storageNotes: data.storageNotes,
    },
    include: {
      supplierOrganization: { select: { id: true, name: true } },
    },
  })

  await logAudit({
    actorUserId: auth.user.id,
    actorOrganizationId: organizationId,
    entityType: 'Lot',
    entityId: lot.id,
    action: 'LOT_CREATED',
    after: lot,
  })

  return apiSuccess(lot, undefined, 201)
})
