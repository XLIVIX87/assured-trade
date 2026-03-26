import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/guards'
import { apiHandler } from '@/lib/api/handler'
import { Errors } from '@/lib/api/errors'
import { storage } from '@/lib/storage/local'

type RouteContext = { params: Promise<{ key: string }> }

// GET /api/files/:key — Serve a file from storage (signed URL replacement for local dev)
export const GET = apiHandler(async (req: NextRequest, ctx?: RouteContext) => {
  await requireAuth()
  const { key } = await ctx!.params
  const fileKey = decodeURIComponent(key)

  const stream = await storage.getFileStream(fileKey)
  if (!stream) {
    throw Errors.notFound('File')
  }

  // Convert Node Readable to Web ReadableStream
  const webStream = new ReadableStream({
    start(controller) {
      stream.on('data', (chunk: Buffer) => controller.enqueue(chunk))
      stream.on('end', () => controller.close())
      stream.on('error', (err: Error) => controller.error(err))
    },
  })

  const ext = fileKey.split('.').pop()?.toLowerCase()
  const mimeMap: Record<string, string> = {
    pdf: 'application/pdf',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    csv: 'text/csv',
    txt: 'text/plain',
  }

  return new NextResponse(webStream, {
    headers: {
      'Content-Type': mimeMap[ext ?? ''] ?? 'application/octet-stream',
      'Cache-Control': 'private, max-age=3600',
    },
  })
})
