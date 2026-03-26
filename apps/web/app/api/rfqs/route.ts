import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/guards'
import { apiHandler } from '@/lib/api/handler'
import { apiSuccess, paginatedResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { logAudit } from '@/lib/audit'
import { createNotification } from '@/lib/notifications'
import { rfqCreateSchema } from '@/lib/validation/schemas'
import { checkRateLimit } from '@/lib/rate-limit'

// GET /api/rfqs — List RFQs
export const GET = apiHandler(async (req: NextRequest) => {
  const auth = await requireAuth()
  const { role, organizationId } = auth.membership

  // Supplier cannot list RFQs
  if (role === 'SUPPLIER') {
    throw Errors.forbidden('Suppliers cannot access RFQs')
  }

  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') ?? '20', 10)))
  const status = url.searchParams.get('status') ?? undefined

  const where: Record<string, unknown> = {}

  // Buyer sees own org only; Ops sees all
  if (role === 'BUYER') {
    where.buyerOrganizationId = organizationId
  }

  if (status) {
    where.status = status
  }

  const [rfqs, total] = await Promise.all([
    prisma.rfq.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        buyerOrganization: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { quotes: true } },
      },
    }),
    prisma.rfq.count({ where }),
  ])

  return paginatedResponse(rfqs, total, page, pageSize)
})

// POST /api/rfqs — Create RFQ
export const POST = apiHandler(async (req: NextRequest) => {
  const auth = await requireAuth()
  const { role, organizationId } = auth.membership

  if (role !== 'BUYER') {
    throw Errors.forbidden('Only buyers can create RFQs')
  }

  // Rate limit: 10 RFQs per hour per user
  if (!checkRateLimit(`rfq-create:${auth.user.id}`, 10, 60 * 60 * 1000)) {
    throw Errors.rateLimited()
  }

  const body = await req.json()
  const data = rfqCreateSchema.parse(body)

  const rfq = await prisma.rfq.create({
    data: {
      buyerOrganizationId: organizationId,
      createdByUserId: auth.user.id,
      status: 'SUBMITTED',
      commodity: data.commodity,
      volume: data.volume,
      unit: data.unit,
      destination: data.destination,
      incoterm: data.incoterm,
      timeline: data.timeline,
      notes: data.notes,
      ...(data.attachments?.length
        ? {
            attachments: {
              create: data.attachments.map((att) => ({
                fileKey: att.fileKey,
                originalName: att.originalName,
                mimeType: att.mimeType ?? 'application/octet-stream',
                sizeBytes: att.sizeBytes ?? 0,
                uploadedByUserId: auth.user.id,
              })),
            },
          }
        : {}),
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
    action: 'RFQ_CREATED',
    after: rfq,
  })

  // Notify all Ops users
  const opsMembers = await prisma.membership.findMany({
    where: { role: 'OPS', status: 'ACTIVE' },
    select: { userId: true },
  })

  await Promise.all(
    opsMembers.map((m) =>
      createNotification({
        recipientUserId: m.userId,
        organizationId,
        rfqId: rfq.id,
        type: 'RFQ_SUBMITTED',
        title: 'New RFQ submitted',
        body: `${auth.organization.name} submitted an RFQ for ${rfq.commodity} (${rfq.volume} ${rfq.unit})`,
      })
    )
  )

  return apiSuccess(rfq, undefined, 201)
})
