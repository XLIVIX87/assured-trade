import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { apiHandler } from '@/lib/api/handler'
import { apiSuccess } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'
import { checkRateLimit } from '@/lib/rate-limit'
import { storage } from '@/lib/storage/local'
import { v4 as uuid } from 'uuid'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
])

// POST /api/upload — Upload a file to storage
export const POST = apiHandler(async (req: NextRequest) => {
  const auth = await requireAuth()

  // Rate limit: 30 uploads per hour per user
  if (!checkRateLimit(`file-upload:${auth.user.id}`, 30, 60 * 60 * 1000)) {
    throw Errors.rateLimited()
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const prefix = (formData.get('prefix') as string) ?? 'uploads'

  if (!file) {
    throw Errors.validation('No file provided')
  }

  if (file.size > MAX_FILE_SIZE) {
    throw Errors.payloadTooLarge(`File exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit`)
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw Errors.validation(`File type ${file.type} is not allowed`, {
      allowedTypes: Array.from(ALLOWED_MIME_TYPES),
    })
  }

  // Generate a unique file key
  const ext = file.name.split('.').pop() ?? 'bin'
  const fileKey = `${prefix}/${uuid()}.${ext}`

  // Read file into buffer and store
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  await storage.putFile(fileKey, buffer, file.type)

  return apiSuccess(
    {
      fileKey,
      originalName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    },
    undefined,
    201
  )
})
