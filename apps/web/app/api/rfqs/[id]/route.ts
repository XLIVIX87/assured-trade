import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/guards'
import { apiHandler } from '@/lib/api/handler'
import { apiSuccess } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { logAudit } from '@/lib/audit'
import { rfqUpdateSchema } from '@/lib/validation/schemas'

type RouteContext = { params: Promise<{ id: string }> }

// GET /api/rfqs/:id — Get RFQ detail
export const GET = apiHandler(async (req: NextRequest, ctx?: RouteContext) => {
  const auth = await requireAuth()
  const { id } = await ctx!.params
  const { role, organizationId } = auth.membership

  if (role === 'SUPPLIER') {
    throw Errors.forbidden('Suppliers cannot access RFQs')
  }

  const rfq = await prisma.rfq.findUnique({
    where: { id },
    include: {
      buyerOrganization: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      attachments: true,
      quotes: {
        select: { id: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!rfq) {
    throw Errors.notFound('RFQ not found')
  }

  // Buyer can only see own org
  if (role === 'BUYER' && rfq.buyerOrganizationId !== organizationId) {
    throw Errors.forbidden('Access denied to this RFQ')
  }

  return apiSuccess(rfq)
})

// PATCH /api/rfqs/:id — Update draft RFQ
export const PATCH = apiHandler(async (req: NextRequest, ctx?: RouteContext) => {
  const auth = await requireAuth()
  const { id } = await ctx!.params
  const { role, organizationId } = auth.membership

  if (role === 'SUPPLIER') {
    throw Errors.forbidden('Suppliers cannot update RFQs')
  }

  const rfq = await prisma.rfq.findUnique({ where: { id } })

  if (!rfq) {
    throw Errors.notFound('RFQ not found')
  }

  // Buyer can only update own org's draft RFQs
  if (role === 'BUYER') {
    if (rfq.buyerOrganizationId !== organizationId) {
      throw Errors.forbidden('Access denied to this RFQ')
    }
    if (rfq.status !== 'DRAFT') {
      throw Errors.conflict('Only draft RFQs can be edited by buyers')
    }
  }

  // Ops can update DRAFT or IN_REVIEW
  if (role === 'OPS' && !['DRAFT', 'SUBMITTED', 'IN_REVIEW'].includes(rfq.status)) {
    throw Errors.conflict(`Cannot update RFQ in ${rfq.status} status`)
  }

  const body = await req.json()
  const data = rfqUpdateSchema.parse(body)

  const before = { ...rfq }
  const updated = await prisma.rfq.update({
    where: { id },
    data: {
      ...(data.commodity !== undefined && { commodity: data.commodity }),
      ...(data.volume !== undefined && { volume: data.volume }),
      ...(data.unit !== undefined && { unit: data.unit }),
      ...(data.destination !== undefined && { destination: data.destination }),
      ...(data.incoterm !== undefined && { incoterm: data.incoterm }),
      ...(data.timeline !== undefined && { timeline: data.timeline }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
    include: {
      buyerOrganization: { select: { id: true, name: true } },
      attachments: true,
    },
  })

  await logAudit({
    actorUserId: auth.user.id,
    actorOrganizationId: organizationId,
    entityType: 'Rfq',
    entityId: rfq.id,
    action: 'RFQ_UPDATED',
    before: before,
    after: updated,
  })

  return apiSuccess(updated)
})
