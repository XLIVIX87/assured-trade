import { prisma } from '@/lib/db'
import { NotificationType } from '@prisma/client'

interface CreateNotificationParams {
  recipientUserId: string
  organizationId?: string
  tradeCaseId?: string
  rfqId?: string
  type: NotificationType
  title: string
  body: string
}

/**
 * Create an in-app notification for a user.
 *
 * Notifications are stored in the database and surfaced via the
 * notification bell in the UI. Phase 1 does not include email
 * delivery — only in-app persistence.
 */
export async function createNotification(params: CreateNotificationParams) {
  return prisma.notification.create({
    data: {
      recipientUserId: params.recipientUserId,
      organizationId: params.organizationId,
      tradeCaseId: params.tradeCaseId,
      rfqId: params.rfqId,
      type: params.type,
      title: params.title,
      body: params.body,
    },
  })
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationRead(notificationId: string) {
  return prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  })
}

/**
 * Mark all unread notifications for a user as read.
 */
export async function markAllNotificationsRead(recipientUserId: string) {
  return prisma.notification.updateMany({
    where: {
      recipientUserId,
      readAt: null,
    },
    data: { readAt: new Date() },
  })
}
