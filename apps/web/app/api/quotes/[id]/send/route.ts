import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/guards'
import { apiHandler } from '@/lib/api/handler'
import { apiSuccess } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { logAudit } from '@/lib/audit'
import { createNotification } from '@/lib/notifications'

type RouteContext = { params: Promise<{ id: string }> }

// POST /api/quotes/:id/send — Send quote to buyer (Ops only)
export const POST = apiHandler(async (req: NextRequest, ctx?: RouteContext) => {
  const auth = await requireAuth()
  const { id } = await ctx!.params
  const { role } = auth.membership

  if (role !== 'OPS') {
    throw Errors.forbidden('Only Ops can send quotes')
  }

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      rfq: {
        select: {
          id: true,
          commodity: true,
          buyerOrganizationId: true,
          buyerOrganization: { select: { id: true, name: true } },
        },
      },
    },
  })

  if (!quote) {
    throw Errors.notFound('Quote not found')
  }

  if (quote.status !== 'DRAFT') {
    throw Errors.conflict(`Cannot send quote in ${quote.status} status. Only DRAFT quotes can be sent.`)
  }

  const updated = await prisma.quote.update({
    where: { id },
    data: { status: 'SENT' },
    include: {
      rfq: {
        select: {
          id: true,
          commodity: true,
          buyerOrganizationId: true,
          buyerOrganization: { select: { id: true, name: true } },
        },
      },
    },
  })

  // Also update the RFQ status to QUOTED
  await prisma.rfq.update({
    where: { id: quote.rfqId },
    data: { status: 'QUOTED' },
  })

  await logAudit({
    actorUserId: auth.user.id,
    actorOrganizationId: auth.membership.organizationId,
    entityType: 'Quote',
    entityId: quote.id,
    action: 'QUOTE_SENT',
    before: { status: quote.status },
    after: { status: 'SENT' },
  })

  // Notify buyer org members
  const buyerMembers = await prisma.membership.findMany({
    where: {
      organizationId: quote.rfq.buyerOrganizationId,
      role: 'BUYER',
      status: 'ACTIVE',
    },
    select: { userId: true },
  })

  await Promise.all(
    buyerMembers.map((m) =>
      createNotification({
        recipientUserId: m.userId,
        organizationId: quote.rfq.buyerOrganizationId,
        rfqId: quote.rfqId,
        type: 'QUOTE_SENT',
        title: 'New quote received',
        body: `A quote has been sent for your ${quote.rfq.commodity} RFQ. Please review and respond.`,
      })
    )
  )

  return apiSuccess(updated)
})
