import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/guards'
import { apiHandler } from '@/lib/api/handler'
import { apiSuccess } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { logAudit } from '@/lib/audit'
import { documentUploadSchema } from '@/lib/validation/schemas'

type RouteContext = { params: Promise<{ id: string }> }

// GET /api/tradecases/:id/documents — List case documents
export const GET = apiHandler(async (req: NextRequest, ctx?: RouteContext) => {
  const auth = await requireAuth()
  const { id } = await ctx!.params
  const { role, organizationId } = auth.membership

  const tradeCase = await prisma.tradeCase.findUnique({
    where: { id },
    select: {
      id: true,
      buyerOrganizationId: true,
      lotAllocations: {
        select: { supplierOrganizationId: true },
      },
    },
  })

  if (!tradeCase) {
    throw Errors.notFound('Trade case not found')
  }

  // RBAC
  if (role === 'BUYER' && tradeCase.buyerOrganizationId !== organizationId) {
    throw Errors.forbidden('Access denied to this trade case')
  }

  if (role === 'SUPPLIER') {
    const hasAllocation = tradeCase.lotAllocations.some(
      (a) => a.supplierOrganizationId === organizationId
    )
    if (!hasAllocation) {
      throw Errors.forbidden('Access denied to this trade case')
    }
  }

  const documents = await prisma.document.findMany({
    where: { tradeCaseId: id },
    orderBy: [{ documentType: 'asc' }, { createdAt: 'desc' }],
    include: {
      uploadedBy: { select: { id: true, name: true, email: true } },
      reviews: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          reviewedBy: { select: { id: true, name: true } },
        },
      },
    },
  })

  return apiSuccess(documents)
})

// POST /api/tradecases/:id/documents — Upload document metadata (Supplier or Ops)
export const POST = apiHandler(async (req: NextRequest, ctx?: RouteContext) => {
  const auth = await requireAuth()
  const { id } = await ctx!.params
  const { role, organizationId } = auth.membership

  if (role === 'BUYER') {
    throw Errors.forbidden('Buyers cannot upload documents')
  }

  const tradeCase = await prisma.tradeCase.findUnique({
    where: { id },
    select: {
      id: true,
      buyerOrganizationId: true,
      lotAllocations: {
        select: { supplierOrganizationId: true },
      },
    },
  })

  if (!tradeCase) {
    throw Errors.notFound('Trade case not found')
  }

  // Supplier must be assigned to the case
  if (role === 'SUPPLIER') {
    const hasAllocation = tradeCase.lotAllocations.some(
      (a) => a.supplierOrganizationId === organizationId
    )
    if (!hasAllocation) {
      throw Errors.forbidden('Access denied to this trade case')
    }
  }

  const body = await req.json()
  const data = documentUploadSchema.parse(body)

  // Reject files > 50MB
  if (data.sizeBytes > 50 * 1024 * 1024) {
    throw Errors.payloadTooLarge('File size exceeds 50MB limit')
  }

  // Check if there's an existing REQUIRED document of this type to update
  const existingDoc = await prisma.document.findFirst({
    where: {
      tradeCaseId: id,
      documentType: data.documentType,
      status: 'REQUIRED',
    },
  })

  let document
  if (existingDoc) {
    // Update the existing required placeholder with file data
    document = await prisma.document.update({
      where: { id: existingDoc.id },
      data: {
        status: 'UPLOADED',
        fileKey: data.fileKey,
        originalName: data.originalName,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        issuedBy: data.issuedBy,
        issuedAt: data.issuedAt ? new Date(data.issuedAt) : undefined,
        uploadedByUserId: auth.user.id,
        uploadedByOrganizationId: organizationId,
      },
      include: {
        uploadedBy: { select: { id: true, name: true } },
      },
    })
  } else {
    // Create a new document entry
    document = await prisma.document.create({
      data: {
        tradeCaseId: id,
        documentType: data.documentType,
        status: 'UPLOADED',
        required: false,
        fileKey: data.fileKey,
        originalName: data.originalName,
        mimeType: data.mimeType,
        sizeBytes: data.sizeBytes,
        issuedBy: data.issuedBy,
        issuedAt: data.issuedAt ? new Date(data.issuedAt) : undefined,
        uploadedByUserId: auth.user.id,
        uploadedByOrganizationId: organizationId,
      },
      include: {
        uploadedBy: { select: { id: true, name: true } },
      },
    })
  }

  await logAudit({
    actorUserId: auth.user.id,
    actorOrganizationId: organizationId,
    entityType: 'Document',
    entityId: document.id,
    action: 'DOCUMENT_UPLOADED',
    after: {
      documentType: data.documentType,
      originalName: data.originalName,
    },
    tradeCaseId: id,
  })

  return apiSuccess(document, undefined, 201)
})
