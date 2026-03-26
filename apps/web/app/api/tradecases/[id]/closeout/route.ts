import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/guards'
import { apiHandler } from '@/lib/api/handler'
import { apiSuccess } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { logAudit } from '@/lib/audit'
import { createNotification } from '@/lib/notifications'
import { generateCloseoutZip } from '@/lib/closeout/generate'
import { checkRateLimit } from '@/lib/rate-limit'

type RouteContext = { params: Promise<{ id: string }> }

// POST /api/tradecases/:id/closeout — Generate close-out pack (Ops only, idempotent)
export const POST = apiHandler(async (req: NextRequest, ctx?: RouteContext) => {
  const auth = await requireAuth()
  const { id } = await ctx!.params
  const { role } = auth.membership

  if (role !== 'OPS') {
    throw Errors.forbidden('Only Ops can generate close-out packs')
  }

  // Rate limit: 5 close-out attempts per hour per case
  if (!checkRateLimit(`closeout:${id}`, 5, 60 * 60 * 1000)) {
    throw Errors.rateLimited()
  }

  const tradeCase = await prisma.tradeCase.findUnique({
    where: { id },
    include: {
      documents: {
        select: {
          id: true,
          documentType: true,
          status: true,
          required: true,
          originalName: true,
        },
      },
      closeoutPacks: {
        where: { status: 'READY' },
        orderBy: { generatedAt: 'desc' },
        take: 1,
      },
      buyerOrganization: { select: { id: true, name: true } },
    },
  })

  if (!tradeCase) {
    throw Errors.notFound('Trade case not found')
  }

  // Idempotent: if already completed with a READY closeout pack, return it
  if (tradeCase.status === 'COMPLETED' && tradeCase.closeoutPacks.length > 0) {
    return apiSuccess({
      tradeCaseId: tradeCase.id,
      referenceCode: tradeCase.referenceCode,
      status: tradeCase.status,
      closeoutPack: tradeCase.closeoutPacks[0],
    })
  }

  // Check ALL required docs are APPROVED
  const requiredDocs = tradeCase.documents.filter((d) => d.required)
  const unapprovedDocs = requiredDocs.filter((d) => d.status !== 'APPROVED')

  if (unapprovedDocs.length > 0) {
    throw Errors.conflict(
      'Cannot generate close-out pack. The following required documents are not approved.',
      {
        missingOrUnapprovedDocuments: unapprovedDocs.map((d) => ({
          id: d.id,
          documentType: d.documentType,
          status: d.status,
          originalName: d.originalName,
        })),
      }
    )
  }

  // Generate the actual ZIP file
  let zipResult: { fileKey: string; documentCount: number };
  try {
    zipResult = await generateCloseoutZip(id);
  } catch (err) {
    console.error('[CLOSEOUT_ZIP_FAILED]', { tradeCaseId: id, error: err });
    throw Errors.internal('Failed to generate close-out ZIP. Please retry.');
  }

  // Create closeout pack and mark case completed in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const closeoutPack = await tx.closeoutPack.create({
      data: {
        tradeCaseId: id,
        status: 'READY',
        fileKey: zipResult.fileKey,
        generatedByUserId: auth.user.id,
        notes: `Close-out pack generated with ${zipResult.documentCount} approved documents packaged into ZIP.`,
      },
    })

    const updated = await tx.tradeCase.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    })

    // Mark the closeout milestone as done
    await tx.milestone.updateMany({
      where: {
        tradeCaseId: id,
        templateKey: 'closeout',
        status: { not: 'DONE' },
      },
      data: {
        status: 'DONE',
        completedAt: new Date(),
      },
    })

    return { closeoutPack, tradeCase: updated }
  })

  await logAudit({
    actorUserId: auth.user.id,
    actorOrganizationId: auth.membership.organizationId,
    entityType: 'CloseoutPack',
    entityId: result.closeoutPack.id,
    action: 'CLOSEOUT_GENERATED',
    after: {
      tradeCaseId: id,
      approvedDocCount: requiredDocs.length,
    },
    tradeCaseId: id,
  })

  // Notify buyer
  const buyerMembers = await prisma.membership.findMany({
    where: {
      organizationId: tradeCase.buyerOrganizationId,
      role: 'BUYER',
      status: 'ACTIVE',
    },
    select: { userId: true },
  })

  await Promise.all(
    buyerMembers.map((m) =>
      createNotification({
        recipientUserId: m.userId,
        organizationId: tradeCase.buyerOrganizationId,
        tradeCaseId: id,
        type: 'CLOSEOUT_READY',
        title: 'Close-out pack ready',
        body: `The close-out pack for case ${tradeCase.referenceCode} is now ready for download.`,
      })
    )
  )

  return apiSuccess({
    tradeCaseId: tradeCase.id,
    referenceCode: tradeCase.referenceCode,
    status: 'COMPLETED',
    closeoutPack: result.closeoutPack,
  })
})
