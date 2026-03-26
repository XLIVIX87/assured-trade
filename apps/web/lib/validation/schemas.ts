import { z } from 'zod'

// ─── Pagination ──────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export type PaginationInput = z.infer<typeof paginationSchema>

// ─── RFQ ─────────────────────────────────────────────────────

export const rfqAttachmentSchema = z.object({
  fileKey: z.string().trim().min(1, 'File key is required').max(1000),
  originalName: z.string().trim().min(1, 'Original name is required').max(500),
  mimeType: z.string().trim().max(200).optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
})

export const rfqCreateSchema = z.object({
  commodity: z.string().trim().min(1, 'Commodity is required').max(200),
  volume: z.number().positive('Volume must be positive'),
  unit: z.string().trim().min(1, 'Unit is required').max(20),
  destination: z.string().trim().min(1, 'Destination is required').max(500),
  incoterm: z.string().trim().max(10).optional(),
  timeline: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(5000).optional(),
  attachments: z.array(rfqAttachmentSchema).optional(),
})

export type RfqCreateInput = z.infer<typeof rfqCreateSchema>

export const rfqUpdateSchema = rfqCreateSchema.partial()

export type RfqUpdateInput = z.infer<typeof rfqUpdateSchema>

// ─── Quote ───────────────────────────────────────────────────

export const quoteCreateSchema = z.object({
  rfqId: z.string().cuid('Invalid RFQ ID'),
  fees: z.object({
    serviceFee: z.number().nonnegative('Service fee must be non-negative'),
    currency: z.string().trim().min(1).max(10).default('GBP'),
  }),
  leadTimeDays: z
    .number()
    .int()
    .positive('Lead time must be at least 1 day'),
  qcPlan: z.string().trim().min(1, 'QC plan is required').max(5000),
  docPlan: z.string().trim().min(1, 'Document plan is required').max(5000),
  terms: z.string().trim().min(1, 'Terms are required').max(5000),
  expiresAt: z.coerce.date().refine(
    (d) => d > new Date(),
    'Expiry date must be in the future',
  ),
})

export type QuoteCreateInput = z.infer<typeof quoteCreateSchema>

// ─── Document ────────────────────────────────────────────────

export const documentUploadSchema = z.object({
  fileKey: z.string().trim().min(1, 'File key is required').max(1000),
  originalName: z
    .string()
    .trim()
    .min(1, 'Original file name is required')
    .max(500),
  mimeType: z.string().trim().min(1, 'MIME type is required').max(200),
  sizeBytes: z.number().int().positive('File size must be positive'),
  documentType: z.enum([
    'COO',
    'COA',
    'PHYTO',
    'PACKING_LIST',
    'BILL_OF_LADING',
    'FUMIGATION_CERT',
    'WEIGHT_CERT',
    'QUALITY_CERT',
    'INSURANCE_CERT',
    'COMMERCIAL_INVOICE',
    'OTHER',
  ]),
  issuedBy: z.string().trim().max(500).optional(),
  issuedAt: z.coerce.date().optional(),
})

export type DocumentUploadInput = z.infer<typeof documentUploadSchema>

export const documentRejectSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'Rejection reason is required')
    .max(5000),
})

export type DocumentRejectInput = z.infer<typeof documentRejectSchema>

// ─── Inspection ──────────────────────────────────────────────

export const inspectionCreateSchema = z.object({
  tradeCaseId: z.string().cuid('Invalid trade case ID'),
  lotId: z.string().cuid('Invalid lot ID').optional(),
  provider: z.string().trim().min(1, 'Provider is required').max(500),
  scheduledAt: z.coerce.date().optional(),
  completedAt: z.coerce.date().optional(),
  result: z.enum(['PASS', 'FAIL', 'INCONCLUSIVE']),
  notes: z.string().trim().max(5000).optional(),
})

export type InspectionCreateInput = z.infer<typeof inspectionCreateSchema>

// ─── Milestone ───────────────────────────────────────────────

export const milestoneUpdateSchema = z.object({
  status: z
    .enum(['NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'OVERDUE'])
    .optional(),
  ownerUserId: z.string().cuid('Invalid user ID').optional(),
  dueDate: z.coerce.date().optional(),
  blockedReason: z.string().trim().max(5000).optional(),
})

export type MilestoneUpdateInput = z.infer<typeof milestoneUpdateSchema>

// ─── Issue ───────────────────────────────────────────────────

export const issueCreateSchema = z.object({
  tradeCaseId: z.string().cuid('Invalid trade case ID'),
  type: z.enum(['DOCUMENT', 'QUALITY', 'LOGISTICS', 'COMPLIANCE', 'OTHER']),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  description: z
    .string()
    .trim()
    .min(1, 'Description is required')
    .max(5000),
})

export type IssueCreateInput = z.infer<typeof issueCreateSchema>

export const issueUpdateSchema = z.object({
  status: z
    .enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])
    .optional(),
  resolutionNotes: z.string().trim().max(5000).optional(),
  ownerUserId: z.string().cuid('Invalid user ID').optional(),
})

export type IssueUpdateInput = z.infer<typeof issueUpdateSchema>

// ─── Lot ────────────────────────────────────────────────────

export const lotCreateSchema = z.object({
  commodity: z.string().trim().min(1, 'Commodity is required').max(200),
  origin: z.string().trim().min(1, 'Origin is required').max(500),
  grade: z.string().trim().max(200).optional(),
  batchNumber: z.string().trim().max(200).optional(),
  availableQuantity: z.number().positive('Quantity must be positive'),
  unit: z.string().trim().min(1, 'Unit is required').max(20),
  storageNotes: z.string().trim().max(5000).optional(),
  supplierOrganizationId: z.string().cuid('Invalid supplier org ID').optional(),
})

export type LotCreateInput = z.infer<typeof lotCreateSchema>

// ─── Lot Allocation ─────────────────────────────────────────

export const lotAllocationSchema = z.object({
  lotId: z.string().cuid('Invalid lot ID'),
  supplierOrganizationId: z.string().cuid('Invalid supplier org ID'),
  quantityAllocated: z.number().positive('Quantity must be positive'),
  unit: z.string().trim().min(1, 'Unit is required').max(20),
  notes: z.string().trim().max(5000).optional(),
})

export type LotAllocationInput = z.infer<typeof lotAllocationSchema>

// ─── Assign Supplier ────────────────────────────────────────

export const assignSupplierSchema = z.object({
  supplierOrgId: z.string().cuid('Invalid supplier org ID'),
  notes: z.string().trim().max(5000).optional(),
})

export type AssignSupplierInput = z.infer<typeof assignSupplierSchema>

// ─── Trade Case Update ──────────────────────────────────────

export const tradeCaseUpdateSchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED']).optional(),
  notes: z.string().trim().max(5000).optional(),
  routeSummary: z.string().trim().max(1000).optional(),
  expectedShipDate: z.coerce.date().optional(),
  assignedOpsUserId: z.string().cuid('Invalid user ID').optional(),
})

export type TradeCaseUpdateInput = z.infer<typeof tradeCaseUpdateSchema>

// ─── AI ──────────────────────────────────────────────────────

export const aiRfqNormalizeSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, 'Text is required')
    .max(10_000, 'Text must be at most 10 000 characters'),
  commodityHint: z.string().trim().max(200).optional(),
})

export type AiRfqNormalizeInput = z.infer<typeof aiRfqNormalizeSchema>
