import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

interface AuditParams {
  actorUserId: string;
  actorOrganizationId?: string;
  entityType: string;
  entityId: string;
  action: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  tradeCaseId?: string;
}

/**
 * Log an immutable audit event. Fire-and-forget — errors are logged but don't propagate.
 */
export async function logAuditEvent(params: AuditParams): Promise<void> {
  try {
    await prisma.auditEvent.create({
      data: {
        actorUserId: params.actorUserId,
        actorOrganizationId: params.actorOrganizationId ?? null,
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        beforeJson: params.before ? (params.before as Prisma.InputJsonValue) : undefined,
        afterJson: params.after ? (params.after as Prisma.InputJsonValue) : undefined,
        tradeCaseId: params.tradeCaseId ?? null,
      },
    });
  } catch (error) {
    console.error("[AUDIT_LOG_FAILED]", {
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
