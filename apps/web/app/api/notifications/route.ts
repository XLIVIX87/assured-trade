import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { requireAuth } from '@/lib/auth/guards'
import { apiHandler } from '@/lib/api/handler'
import { apiSuccess } from '@/lib/api/response'

// GET /api/notifications — List notifications for current user
export const GET = apiHandler(async (req: NextRequest) => {
  const auth = await requireAuth()

  const url = new URL(req.url)
  const unreadOnly = url.searchParams.get('unreadOnly') === 'true'
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') ?? '20', 10)))

  const where: Record<string, unknown> = {
    recipientUserId: auth.user.id,
  }

  if (unreadOnly) {
    where.readAt = null
  }

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        tradeCase: { select: { id: true, referenceCode: true } },
        rfq: { select: { id: true, commodity: true } },
      },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: {
        recipientUserId: auth.user.id,
        readAt: null,
      },
    }),
  ])

  return apiSuccess({
    notifications,
    unreadCount,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  })
})
