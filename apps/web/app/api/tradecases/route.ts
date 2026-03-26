import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/guards'
import { apiHandler } from '@/lib/api/handler'
import { paginatedResponse } from '@/lib/api/response'

// GET /api/tradecases — List trade cases
export const GET = apiHandler(async (req: NextRequest) => {
  const auth = await requireAuth()
  const { role, organizationId } = auth.membership

  const url = new URL(req.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') ?? '20', 10)))
  const status = url.searchParams.get('status') ?? undefined

  const where: Record<string, unknown> = {}

  if (role === 'BUYER') {
    // Buyer sees own org's cases
    where.buyerOrganizationId = organizationId
  } else if (role === 'SUPPLIER') {
    // Supplier sees cases where their org has lot allocations
    where.lotAllocations = {
      some: { supplierOrganizationId: organizationId },
    }
  }
  // OPS sees all

  if (status) {
    where.status = status
  }

  const [cases, total] = await Promise.all([
    prisma.tradeCase.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        buyerOrganization: { select: { id: true, name: true } },
        assignedOps: { select: { id: true, name: true, email: true } },
        _count: {
          select: {
            milestones: true,
            documents: true,
            issues: true,
          },
        },
      },
    }),
    prisma.tradeCase.count({ where }),
  ])

  return paginatedResponse(cases, total, page, pageSize)
})
