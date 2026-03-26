import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/guards'
import { apiHandler } from '@/lib/api/handler'
import { apiSuccess } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'

type RouteContext = { params: Promise<{ id: string }> }

// GET /api/quotes/:id — Quote detail
export const GET = apiHandler(async (req: NextRequest, ctx?: RouteContext) => {
  const auth = await requireAuth()
  const { id } = await ctx!.params
  const { role, organizationId } = auth.membership

  if (role === 'SUPPLIER') {
    throw Errors.forbidden('Suppliers cannot access quotes')
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
          destination: true,
          incoterm: true,
          buyerOrganizationId: true,
          buyerOrganization: { select: { id: true, name: true } },
        },
      },
      createdBy: { select: { id: true, name: true, email: true } },
      tradeCase: { select: { id: true, referenceCode: true, status: true } },
    },
  })

  if (!quote) {
    throw Errors.notFound('Quote not found')
  }

  // Buyer can only see quotes for their org's RFQs
  if (role === 'BUYER' && quote.rfq.buyerOrganizationId !== organizationId) {
    throw Errors.forbidden('Access denied to this quote')
  }

  return apiSuccess(quote)
})
