import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createApiError } from "@/lib/api/errors";
import type { MembershipRole } from "@prisma/client";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
}

export interface SessionWithMembership {
  user: SessionUser;
  membership: {
    id: string;
    organizationId: string;
    role: MembershipRole;
  };
}

/**
 * Require an authenticated session. Returns 401 if not authenticated.
 */
export async function requireSession(): Promise<SessionUser> {
  const session = await auth();

  if (!session?.user?.id || !session?.user?.email) {
    throw createApiError("UNAUTHENTICATED", "Authentication required");
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? null,
  };
}

/**
 * Require a specific role. Returns 403 if role doesn't match.
 */
export async function requireRole(
  ...allowedRoles: MembershipRole[]
): Promise<SessionWithMembership> {
  const user = await requireSession();

  const membership = await prisma.membership.findFirst({
    where: {
      userId: user.id,
      status: "ACTIVE",
      role: { in: allowedRoles },
    },
  });

  if (!membership) {
    throw createApiError("FORBIDDEN", "Insufficient permissions");
  }

  return {
    user,
    membership: {
      id: membership.id,
      organizationId: membership.organizationId,
      role: membership.role,
    },
  };
}

/**
 * Require org access. Verifies user has active membership in the specified org.
 */
export async function requireOrgAccess(
  orgId: string,
  ...allowedRoles: MembershipRole[]
): Promise<SessionWithMembership> {
  const user = await requireSession();

  const where: Record<string, unknown> = {
    userId: user.id,
    organizationId: orgId,
    status: "ACTIVE" as const,
  };

  if (allowedRoles.length > 0) {
    where.role = { in: allowedRoles };
  }

  const membership = await prisma.membership.findFirst({ where });

  if (!membership) {
    throw createApiError("FORBIDDEN", "No access to this organization");
  }

  return {
    user,
    membership: {
      id: membership.id,
      organizationId: membership.organizationId,
      role: membership.role,
    },
  };
}
