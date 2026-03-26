import { prisma } from "@/lib/db";
import type { NotificationType, Prisma } from "@prisma/client";

interface NotificationParams {
  recipientUserId: string;
  organizationId: string;
  type: NotificationType;
  title: string;
  body?: string;
  tradeCaseId?: string;
  rfqId?: string;
  payload?: Record<string, unknown>;
}

/**
 * Create an in-app notification. Fire-and-forget.
 */
export async function createNotification(params: NotificationParams): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        recipientUserId: params.recipientUserId,
        organizationId: params.organizationId,
        type: params.type,
        title: params.title,
        body: params.body ?? '',
        tradeCaseId: params.tradeCaseId,
        rfqId: params.rfqId,
        payloadJson: params.payload ? (params.payload as Prisma.InputJsonValue) : undefined,
      },
    });
  } catch (error) {
    console.error("[NOTIFICATION_FAILED]", {
      type: params.type,
      recipientUserId: params.recipientUserId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
