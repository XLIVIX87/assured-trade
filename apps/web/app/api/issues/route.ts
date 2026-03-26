import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/guards'
import { apiHandler } from '@/lib/api/handler'
import { apiSuccess, paginatedResponse } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { logAudit } from '@/lib/audit'
import { createNotification } from '@/lib/notifications'
import { issueCreateSchema } from '@/lib/validation/schemas'

// GET /api/issues — List issues
export const GET = apiHandler(async (req: NextRequest) => {
  const auth = await requireAuth()
  const { role, organizationId } = auth.membership

  const url = new URL(req.url)
  const tradeCaseId = url.searchParams.get('tradeCaseId') ?? undefined
  const status = url.searchParams.get('status') ?? undefined
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') ?? '20', 10)))

  const where: Record<string, unknown> = {}

  if (tradeCaseId) {
    where.tradeCaseId = tradeCaseId
  }

  if (status) {
    where.status = status
  }

  // Scope by role
  if (role === 'BUYER') {
    where.tradeCase = { buyerOrganizationId: organizationId }
  } else if (role === 'SUPPLIER') {
    where.tradeCase = {
      lotAllocations: {
        some: { supplierOrganizationId: organizationId },
      },
    }
  }
  // OPS sees all

  const [issues, total] = await Promise.all([
    prisma.issue.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        tradeCase: { select: { id: true, referenceCode: true } },
        owner: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    }),
    prisma.issue.count({ where }),
  ])

  return paginatedResponse(issues, total, page, pageSize)
})

// POST /api/issues — Create issue (Ops or Supplier)
export const POST = apiHandler(async (req: NextRequest) => {
  const auth = await requireAuth()
  const { role, organizationId } = auth.membership

  if (role === 'BUYER') {
    throw Errors.forbidden('Buyers cannot create issues')
  }

  const body = await req.json()
  const data = issueCreateSchema.parse(body)

  // Verify trade case exists
  const tradeCase = await prisma.tradeCase.findUnique({
    where: { id: data.tradeCaseId },
    select: {
      id: true,
      referenceCode: true,
      buyerOrganizationId: true,
      lotAllocations: {
        select: { supplierOrganizationId: true },
      },
    },
  })

  if (!tradeCase) {
    throw Errors.notFound('Trade case not found')
  }

  // Supplier can only create issues on cases they're assigned to
  if (role === 'SUPPLIER') {
    const hasAllocation = tradeCase.lotAllocations.some(
      (a) => a.supplierOrganizationId === organizationId
    )
    if (!hasAllocation) {
      throw Errors.forbidden('Access denied to this trade case')
    }
  }

  const issue = await prisma.issue.create({
    data: {
      tradeCaseId: data.tradeCaseId,
      type: data.type,
      severity: data.severity,
      status: 'OPEN',
      description: data.description,
      createdByUserId: auth.user.id,
    },
    include: {
      tradeCase: { select: { id: true, referenceCode: true } },
      createdBy: { select: { id: true, name: true } },
    },
  })

  await logAudit({
    actorUserId: auth.user.id,
    actorOrganizationId: organizationId,
    entityType: 'Issue',
    entityId: issue.id,
    action: 'ISSUE_CREATED',
    after: {
      type: data.type,
      severity: data.severity,
      tradeCaseId: data.tradeCaseId,
    },
    tradeCaseId: data.tradeCaseId,
  })

  // Notify Ops users
  const opsMembers = await prisma.membership.findMany({
    where: { role: 'OPS', status: 'ACTIVE' },
    select: { userId: true },
  })

  await Promise.all(
    opsMembers.map((m) =>
      createNotification({
        recipientUserId: m.userId,
        tradeCaseId: data.tradeCaseId,
        type: 'ISSUE_CREATED',
        title: `New ${data.severity} issue`,
        body: `A ${data.type} issue (${data.severity}) was raised on case ${tradeCase.referenceCode}.`,
      })
    )
  )

  return apiSuccess(issue, undefined, 201)
})
