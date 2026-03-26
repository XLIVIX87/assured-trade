import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'

interface LogAuditParams {
  actorUserId?: string
  actorOrganizationId?: string
  entityType: string
  entityId: string
  action: string
  before?: unknown
  after?: unknown
  tradeCaseId?: string
  requestId?: string
}

/** Convert an unknown value into a Prisma-compatible JSON input. */
function toJsonInput(
  value: unknown,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) return undefined
  if (value === null) return Prisma.JsonNull
  return value as Prisma.InputJsonValue
}

/**
 * Persist an audit event. Fire-and-forget is acceptable for non-critical
 * paths; for critical mutations, await the returned promise to ensure
 * the event is stored before responding.
 */
export async function logAudit(params: LogAuditParams) {
  return prisma.auditEvent.create({
    data: {
      actorUserId: params.actorUserId,
      actorOrganizationId: params.actorOrganizationId,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      beforeJson: toJsonInput(params.before),
      afterJson: toJsonInput(params.after),
      tradeCaseId: params.tradeCaseId,
      requestId: params.requestId,
    },
  })
}
