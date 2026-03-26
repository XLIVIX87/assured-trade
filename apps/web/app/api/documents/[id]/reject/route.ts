import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/guards'
import { apiHandler } from '@/lib/api/handler'
import { apiSuccess } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { logAudit } from '@/lib/audit'
import { createNotification } from '@/lib/notifications'
import { documentRejectSchema } from '@/lib/validation/schemas'

type RouteContext = { params: Promise<{ id: string }> }

// POST /api/documents/:id/reject — Reject document (Ops only)
export const POST = apiHandler(async (req: NextRequest, ctx?: RouteContext) => {
  const auth = await requireAuth()
  const { id } = await ctx!.params
  const { role } = auth.membership

  if (role !== 'OPS') {
    throw Errors.forbidden('Only Ops can reject documents')
  }

  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      tradeCase: { select: { id: true, referenceCode: true } },
      uploadedBy: { select: { id: true, name: true } },
    },
  })

  if (!document) {
    throw Errors.notFound('Document not found')
  }

  if (document.status !== 'UPLOADED') {
    throw Errors.conflict(
      `Cannot reject document in ${document.status} status. Only UPLOADED documents can be rejected.`
    )
  }

  const body = await req.json()
  const data = documentRejectSchema.parse(body)

  const result = await prisma.$transaction(async (tx) => {
    // Reset to REQUIRED so it can be re-uploaded
    const updated = await tx.document.update({
      where: { id },
      data: { status: 'REJECTED' },
      include: {
        tradeCase: { select: { id: true, referenceCode: true } },
        uploadedBy: { select: { id: true, name: true } },
      },
    })

    await tx.documentReview.create({
      data: {
        documentId: id,
        reviewedByUserId: auth.user.id,
        action: 'REJECTED',
        reason: data.reason,
      },
    })

    return updated
  })

  await logAudit({
    actorUserId: auth.user.id,
    actorOrganizationId: auth.membership.organizationId,
    entityType: 'Document',
    entityId: id,
    action: 'DOCUMENT_REJECTED',
    before: { status: 'UPLOADED' },
    after: { status: 'REJECTED', reason: data.reason },
    tradeCaseId: document.tradeCaseId,
  })

  // Notify the uploader
  if (document.uploadedByUserId) {
    await createNotification({
      recipientUserId: document.uploadedByUserId,
      tradeCaseId: document.tradeCaseId,
      type: 'DOCUMENT_REJECTED',
      title: 'Document rejected',
      body: `Your ${document.documentType} document for case ${document.tradeCase.referenceCode} was rejected. Reason: ${data.reason}`,
    })
  }

  return apiSuccess(result)
})
