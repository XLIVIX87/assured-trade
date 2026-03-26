import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/guards'
import { apiHandler } from '@/lib/api/handler'
import { apiSuccess } from '@/lib/api/response'
import { Errors } from '@/lib/api/errors'

type RouteContext = { params: Promise<{ id: string }> }

// POST /api/notifications/:id/read — Mark notification read (own only)
export const POST = apiHandler(async (req: NextRequest, ctx?: RouteContext) => {
  const auth = await requireAuth()
  const { id } = await ctx!.params

  const notification = await prisma.notification.findUnique({
    where: { id },
  })

  if (!notification) {
    throw Errors.notFound('Notification not found')
  }

  // Can only mark own notifications as read
  if (notification.recipientUserId !== auth.user.id) {
    throw Errors.forbidden('Access denied to this notification')
  }

  // Idempotent: if already read, return it
  if (notification.readAt) {
    return apiSuccess(notification)
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
  })

  return apiSuccess(updated)
})
