import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/guards'
import { apiHandler } from '@/lib/api/handler'
import { apiSuccess, paginatedResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { logAudit } from '@/lib/audit'
import { quoteCreateSchema } from '@/lib/validation/schemas'

// GET /api/quotes — List quotes
export const GET = apiHandler(async (req: NextRequest) => {
  const auth = await requireAuth()
  const { role, organizationId } = auth.membership

  if (role === 'SUPPLIER') {
    throw Errors.forbidden('Suppliers cannot access quotes')
  }

  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') ?? '20', 10)))
  const status = url.searchParams.get('status') ?? undefined

  const where: Record<string, unknown> = {}

  // Buyer sees only quotes linked to their org's RFQs
  if (role === 'BUYER') {
    where.rfq = { buyerOrganizationId: organizationId }
  }

  if (status) {
    where.status = status
  }

  const [quotes, total] = await Promise.all([
    prisma.quote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        rfq: {
          select: {
            id: true,
            commodity: true,
            volume: true,
            unit: true,
            buyerOrganization: { select: { id: true, name: true } },
          },
        },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.quote.count({ where }),
  ])

  return paginatedResponse(quotes, total, page, pageSize)
})

// POST /api/quotes — Create quote (Ops only)
export const POST = apiHandler(async (req: NextRequest) => {
  const auth = await requireAuth()
  const { role } = auth.membership

  if (role !== 'OPS') {
    throw Errors.forbidden('Only Ops can create quotes')
  }

  const body = await req.json()
  const data = quoteCreateSchema.parse(body)

  // Verify RFQ exists
  const rfq = await prisma.rfq.findUnique({ where: { id: data.rfqId } })
  if (!rfq) {
    throw Errors.notFound('RFQ not found')
  }

  const quote = await prisma.quote.create({
    data: {
      rfqId: data.rfqId,
      createdByUserId: auth.user.id,
      status: 'DRAFT',
      currency: data.fees.currency ?? 'GBP',
      serviceFeeAmount: data.fees.serviceFee,
      leadTimeDays: data.leadTimeDays,
      qcPlan: data.qcPlan,
      docPlan: data.docPlan,
      terms: data.terms,
      expiresAt: new Date(data.expiresAt),
    },
    include: {
      rfq: {
        select: {
          id: true,
          commodity: true,
          buyerOrganization: { select: { id: true, name: true } },
        },
      },
    },
  })

  await logAudit({
    actorUserId: auth.user.id,
    actorOrganizationId: auth.membership.organizationId,
    entityType: 'Quote',
    entityId: quote.id,
    action: 'QUOTE_CREATED',
    after: quote,
  })

  return apiSuccess(quote, undefined, 201)
})
