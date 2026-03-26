import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/guards'
import { apiHandler } from '@/lib/api/handler'
import { apiSuccess } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { logAudit } from '@/lib/audit'
import { createNotification } from '@/lib/notifications'

type RouteContext = { params: Promise<{ id: string }> }

// POST /api/documents/:id/approve — Approve document (Ops only, idempotent)
export const POST = apiHandler(async (req: NextRequest, ctx?: RouteContext) => {
  const auth = await requireAuth()
  const { id } = await ctx!.params
  const { role } = auth.membership

  if (role !== 'OPS') {
    throw Errors.forbidden('Only Ops can approve documents')
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

  // Idempotent: if already approved, return it
  if (document.status === 'APPROVED') {
    return apiSuccess(document)
  }

  if (document.status !== 'UPLOADED') {
    throw Errors.conflict(
      `Cannot approve document in ${document.status} status. Only UPLOADED documents can be approved.`
    )
  }

  // Parse optional review note from body
  let reviewNote: string | undefined
  try {
    const body = await req.json()
    reviewNote = body?.reviewNote
  } catch {
    // No body is fine
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.document.update({
      where: { id },
      data: { status: 'APPROVED' },
      include: {
        tradeCase: { select: { id: true, referenceCode: true } },
        uploadedBy: { select: { id: true, name: true } },
      },
    })

    await tx.documentReview.create({
      data: {
        documentId: id,
        reviewedByUserId: auth.user.id,
        action: 'APPROVED',
        reason: reviewNote,
      },
    })

    return updated
  })

  await logAudit({
    actorUserId: auth.user.id,
    actorOrganizationId: auth.membership.organizationId,
    entityType: 'Document',
    entityId: id,
    action: 'DOCUMENT_APPROVED',
    before: { status: 'UPLOADED' },
    after: { status: 'APPROVED' },
    tradeCaseId: document.tradeCaseId,
  })

  // Notify the uploader
  if (document.uploadedByUserId) {
    await createNotification({
      recipientUserId: document.uploadedByUserId,
      tradeCaseId: document.tradeCaseId,
      type: 'DOCUMENT_APPROVED',
      title: 'Document approved',
      body: `Your ${document.documentType} document for case ${document.tradeCase.referenceCode} has been approved.`,
    })
  }

  return apiSuccess(result)
})
