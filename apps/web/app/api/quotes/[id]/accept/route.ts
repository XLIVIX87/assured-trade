import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/guards'
import { apiHandler } from '@/lib/api/handler'
import { apiSuccess } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { logAudit } from '@/lib/audit'
import { createNotification } from '@/lib/notifications'
import { checkRateLimit } from '@/lib/rate-limit'

type RouteContext = { params: Promise<{ id: string }> }

// Default milestone templates for new trade cases
const MILESTONE_TEMPLATES = {
  default: [
    { templateKey: 'supplier_assigned', name: 'Supplier Assigned', sequence: 1 },
    { templateKey: 'lot_allocated', name: 'Lot Allocated', sequence: 2 },
    { templateKey: 'pre_shipment_inspection', name: 'Pre-Shipment Inspection', sequence: 3 },
    { templateKey: 'documents_collected', name: 'Documents Collected', sequence: 4 },
    { templateKey: 'documents_reviewed', name: 'Documents Reviewed', sequence: 5 },
    { templateKey: 'shipment_booked', name: 'Shipment Booked', sequence: 6 },
    { templateKey: 'goods_shipped', name: 'Goods Shipped', sequence: 7 },
    { templateKey: 'arrival_confirmed', name: 'Arrival Confirmed', sequence: 8 },
    { templateKey: 'final_inspection', name: 'Final Inspection', sequence: 9 },
    { templateKey: 'closeout', name: 'Close-Out', sequence: 10 },
  ],
}

// Default document checklist for new trade cases
const DOCUMENT_CHECKLIST = {
  default: [
    { documentType: 'COO' as const, required: true },
    { documentType: 'COA' as const, required: true },
    { documentType: 'PHYTO' as const, required: true },
    { documentType: 'PACKING_LIST' as const, required: true },
    { documentType: 'BILL_OF_LADING' as const, required: true },
    { documentType: 'FUMIGATION_CERT' as const, required: false },
    { documentType: 'COMMERCIAL_INVOICE' as const, required: true },
  ],
}

// POST /api/quotes/:id/accept — Accept quote, create trade case (Buyer only, idempotent)
export const POST = apiHandler(async (req: NextRequest, ctx?: RouteContext) => {
  const auth = await requireAuth()
  const { id } = await ctx!.params
  const { role, organizationId } = auth.membership

  if (role !== 'BUYER') {
    throw Errors.forbidden('Only buyers can accept quotes')
  }

  // Rate limit: 20 quote acceptances per hour per user
  if (!checkRateLimit(`quote-accept:${auth.user.id}`, 20, 60 * 60 * 1000)) {
    throw Errors.rateLimited()
  }

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      rfq: {
        select: {
          id: true,
          commodity: true,
          volume: true,
          unit: true,
          buyerOrganizationId: true,
        },
      },
      tradeCase: true,
    },
  })

  if (!quote) {
    throw Errors.notFound('Quote not found')
  }

  // Org scoping: buyer can only accept quotes for their own RFQs
  if (quote.rfq.buyerOrganizationId !== organizationId) {
    throw Errors.forbidden('Access denied to this quote')
  }

  // Idempotent: if already accepted, return existing trade case
  if (quote.status === 'ACCEPTED' && quote.tradeCase) {
    const existingCase = await prisma.tradeCase.findUnique({
      where: { id: quote.tradeCase.id },
      include: {
        milestones: { orderBy: { sequence: 'asc' } },
        documents: true,
      },
    })

    return apiSuccess({
      quoteId: quote.id,
      quoteStatus: quote.status,
      tradeCase: {
        id: existingCase!.id,
        referenceCode: existingCase!.referenceCode,
        status: existingCase!.status,
        milestoneCount: existingCase!.milestones.length,
        documentChecklistCount: existingCase!.documents.length,
      },
    })
  }

  if (quote.status !== 'SENT') {
    throw Errors.conflict(`Cannot accept quote in ${quote.status} status. Only SENT quotes can be accepted.`)
  }

  // Check expiry
  if (new Date() > quote.expiresAt) {
    throw Errors.conflict('Quote has expired and can no longer be accepted')
  }

  // Generate reference code: AT-YYYY-XXXX
  const year = new Date().getFullYear()
  const lastCase = await prisma.tradeCase.findFirst({
    where: {
      referenceCode: { startsWith: `AT-${year}-` },
    },
    orderBy: { referenceCode: 'desc' },
    select: { referenceCode: true },
  })

  let nextNumber = 1
  if (lastCase) {
    const lastNum = parseInt(lastCase.referenceCode.split('-')[2], 10)
    nextNumber = lastNum + 1
  }
  const referenceCode = `AT-${year}-${String(nextNumber).padStart(4, '0')}`

  // Create trade case, milestones, and document checklist in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Update quote status
    await tx.quote.update({
      where: { id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      },
    })

    // Update RFQ status
    await tx.rfq.update({
      where: { id: quote.rfqId },
      data: { status: 'QUOTED' },
    })

    // Create trade case
    const tradeCase = await tx.tradeCase.create({
      data: {
        quoteId: quote.id,
        rfqId: quote.rfqId,
        buyerOrganizationId: organizationId,
        status: 'ACTIVE',
        referenceCode,
        commodity: quote.rfq.commodity,
      },
    })

    // Create milestones
    await tx.milestone.createMany({
      data: MILESTONE_TEMPLATES.default.map((m) => ({
        tradeCaseId: tradeCase.id,
        templateKey: m.templateKey,
        name: m.name,
        sequence: m.sequence,
        status: 'NOT_STARTED',
      })),
    })

    // Create document checklist
    await tx.document.createMany({
      data: DOCUMENT_CHECKLIST.default.map((d) => ({
        tradeCaseId: tradeCase.id,
        documentType: d.documentType,
        status: 'REQUIRED',
        required: d.required,
      })),
    })

    const milestones = await tx.milestone.findMany({
      where: { tradeCaseId: tradeCase.id },
      orderBy: { sequence: 'asc' },
    })

    const documents = await tx.document.findMany({
      where: { tradeCaseId: tradeCase.id },
    })

    return { tradeCase, milestones, documents }
  })

  await logAudit({
    actorUserId: auth.user.id,
    actorOrganizationId: organizationId,
    entityType: 'Quote',
    entityId: quote.id,
    action: 'QUOTE_ACCEPTED',
    before: { status: quote.status },
    after: { status: 'ACCEPTED', tradeCaseId: result.tradeCase.id },
    tradeCaseId: result.tradeCase.id,
  })

  // Notify Ops
  const opsMembers = await prisma.membership.findMany({
    where: { role: 'OPS', status: 'ACTIVE' },
    select: { userId: true },
  })

  await Promise.all(
    opsMembers.map((m) =>
      createNotification({
        recipientUserId: m.userId,
        organizationId,
        tradeCaseId: result.tradeCase.id,
        type: 'QUOTE_ACCEPTED',
        title: 'Quote accepted',
        body: `${auth.organization.name} accepted quote for ${quote.rfq.commodity}. Trade case ${referenceCode} created.`,
      })
    )
  )

  return apiSuccess({
    quoteId: quote.id,
    quoteStatus: 'ACCEPTED',
    tradeCase: {
      id: result.tradeCase.id,
      referenceCode: result.tradeCase.referenceCode,
      status: result.tradeCase.status,
      milestoneCount: result.milestones.length,
      documentChecklistCount: result.documents.length,
    },
  })
})
