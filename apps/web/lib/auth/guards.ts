import { MembershipRole } from '@prisma/client'
import { auth } from './index'
import { prisma } from '@/lib/db'
import { Errors } from '@/lib/api/errors'

export type AuthContext = {
  user: { id: string; email: string; name?: string | null }
  membership: {
    id: string
    role: MembershipRole
    organizationId: string
  }
  organization: {
    id: string
    name: string
    slug: string
  }
}

/**
 * Ensures the request has a valid session.
 * Throws 401 if not authenticated.
 */
export async function requireSession() {
  const session = await auth()

  if (!session?.user?.id) {
    throw Errors.unauthenticated()
  }

  return session
}

/**
 * Ensures the authenticated user holds one of the specified roles
 * in their active membership.
 * Throws 401 if not authenticated, 403 if role does not match.
 */
export async function requireRole(...roles: MembershipRole[]) {
  const session = await requireSession()

  const membership = await prisma.membership.findFirst({
    where: {
      userId: session.user.id,
      status: 'ACTIVE',
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      role: true,
      organizationId: true,
    },
  })

  if (!membership) {
    throw Errors.forbidden('No active membership found')
  }

  if (roles.length > 0 && !roles.includes(membership.role)) {
    throw Errors.forbidden(
      `Role '${membership.role}' is not authorised for this action`,
    )
  }

  return { session, membership }
}

/**
 * Ensures the authenticated user belongs to the given organisation.
 * Throws 401 if not authenticated, 403 if no active membership in that org.
 */
export async function requireOrgAccess(orgId: string) {
  const session = await requireSession()

  const membership = await prisma.membership.findFirst({
    where: {
      userId: session.user.id,
      organizationId: orgId,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      role: true,
      organizationId: true,
    },
  })

  if (!membership) {
    throw Errors.forbidden('You do not have access to this organisation')
  }

  return { session, membership }
}

/**
 * Combined guard: authenticate, resolve active membership, check role,
 * and return a fully-resolved auth context including the organisation.
 *
 * This is the recommended guard for most route handlers.
 *
 * @param roles  Optional list of allowed roles. If empty, any role is accepted.
 */
export async function requireAuth(
  ...roles: MembershipRole[]
): Promise<AuthContext> {
  const session = await requireSession()

  const membership = await prisma.membership.findFirst({
    where: {
      userId: session.user.id,
      status: 'ACTIVE',
    },
    orderBy: { createdAt: 'asc' },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  })

  if (!membership) {
    throw Errors.forbidden('No active membership found')
  }

  if (roles.length > 0 && !roles.includes(membership.role)) {
    throw Errors.forbidden(
      `Role '${membership.role}' is not authorised for this action`,
    )
  }

  return {
    user: {
      id: session.user.id,
      email: session.user.email!,
      name: session.user.name,
    },
    membership: {
      id: membership.id,
      role: membership.role,
      organizationId: membership.organizationId,
    },
    organization: membership.organization,
  }
}
