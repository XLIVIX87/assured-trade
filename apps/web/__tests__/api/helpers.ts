import { PrismaClient } from "@prisma/client";
import { vi } from "vitest";
import { NextRequest } from "next/server";

// ─── Test Prisma Client ─────────────────────────────────────
export const testPrisma = new PrismaClient({
  datasources: {
    db: { url: process.env.DATABASE_URL },
  },
});

// ─── Fixture IDs (stable references for assertions) ─────────
export const IDS = {
  opsOrg: "test-ops-org",
  buyerOrg: "test-buyer-org",
  supplierOrg: "test-supplier-org",
  opsUser: "test-ops-user",
  buyerUser: "test-buyer-user",
  supplierUser: "test-supplier-user",
} as const;

// ─── Fixture Types ──────────────────────────────────────────
export interface TestFixtures {
  opsOrg: { id: string; name: string; slug: string };
  buyerOrg: { id: string; name: string; slug: string };
  supplierOrg: { id: string; name: string; slug: string };
  opsUser: { id: string; email: string };
  buyerUser: { id: string; email: string };
  supplierUser: { id: string; email: string };
}

// ─── Create Fixtures ────────────────────────────────────────
export async function createTestFixtures(): Promise<TestFixtures> {
  // Organizations
  const opsOrg = await testPrisma.organization.create({
    data: {
      id: IDS.opsOrg,
      name: "Test Ops Co",
      slug: "test-ops-co",
      country: "GB",
      type: "OPS",
    },
  });

  const buyerOrg = await testPrisma.organization.create({
    data: {
      id: IDS.buyerOrg,
      name: "Test Buyer Co",
      slug: "test-buyer-co",
      country: "GB",
      type: "BUYER",
    },
  });

  const supplierOrg = await testPrisma.organization.create({
    data: {
      id: IDS.supplierOrg,
      name: "Test Supplier Co",
      slug: "test-supplier-co",
      country: "NG",
      type: "SUPPLIER",
    },
  });

  // Users
  const opsUser = await testPrisma.user.create({
    data: {
      id: IDS.opsUser,
      email: "ops@test.com",
      name: "Test Ops User",
    },
  });

  const buyerUser = await testPrisma.user.create({
    data: {
      id: IDS.buyerUser,
      email: "buyer@test.com",
      name: "Test Buyer User",
    },
  });

  const supplierUser = await testPrisma.user.create({
    data: {
      id: IDS.supplierUser,
      email: "supplier@test.com",
      name: "Test Supplier User",
    },
  });

  // Memberships
  await testPrisma.membership.create({
    data: {
      userId: opsUser.id,
      organizationId: opsOrg.id,
      role: "OPS",
      status: "ACTIVE",
    },
  });

  await testPrisma.membership.create({
    data: {
      userId: buyerUser.id,
      organizationId: buyerOrg.id,
      role: "BUYER",
      status: "ACTIVE",
    },
  });

  await testPrisma.membership.create({
    data: {
      userId: supplierUser.id,
      organizationId: supplierOrg.id,
      role: "SUPPLIER",
      status: "ACTIVE",
    },
  });

  return {
    opsOrg: { id: opsOrg.id, name: opsOrg.name, slug: opsOrg.slug },
    buyerOrg: { id: buyerOrg.id, name: buyerOrg.name, slug: buyerOrg.slug },
    supplierOrg: { id: supplierOrg.id, name: supplierOrg.name, slug: supplierOrg.slug },
    opsUser: { id: opsUser.id, email: opsUser.email },
    buyerUser: { id: buyerUser.id, email: buyerUser.email },
    supplierUser: { id: supplierUser.id, email: supplierUser.email },
  };
}

// ─── Clean Database ─────────────────────────────────────────
// Deletes all rows in dependency-safe order.
export async function cleanDatabase() {
  await testPrisma.closeoutPack.deleteMany();
  await testPrisma.aiRun.deleteMany();
  await testPrisma.notification.deleteMany();
  await testPrisma.auditEvent.deleteMany();
  await testPrisma.message.deleteMany();
  await testPrisma.issue.deleteMany();
  await testPrisma.inspection.deleteMany();
  await testPrisma.documentReview.deleteMany();
  await testPrisma.document.deleteMany();
  await testPrisma.milestone.deleteMany();
  await testPrisma.lotAllocation.deleteMany();
  await testPrisma.lot.deleteMany();
  await testPrisma.tradeCase.deleteMany();
  await testPrisma.quote.deleteMany();
  await testPrisma.rfqAttachment.deleteMany();
  await testPrisma.rfq.deleteMany();
  await testPrisma.membership.deleteMany();
  await testPrisma.session.deleteMany();
  await testPrisma.account.deleteMany();
  await testPrisma.verificationToken.deleteMany();
  await testPrisma.user.deleteMany();
  await testPrisma.organization.deleteMany();
}

// ─── Mock Auth ──────────────────────────────────────────────
// Call this to make `auth()` from `@/lib/auth` return a session
// for the given userId and email.
export function mockAuth(userId: string, email: string = "test@test.com") {
  const { auth } = require("@/lib/auth") as { auth: ReturnType<typeof vi.fn> };
  auth.mockResolvedValue({
    user: { id: userId, email, name: "Test User" },
    expires: new Date(Date.now() + 86400000).toISOString(),
  });
}

// Clear auth mock (simulate unauthenticated)
export function mockAuthUnauthenticated() {
  const { auth } = require("@/lib/auth") as { auth: ReturnType<typeof vi.fn> };
  auth.mockResolvedValue(null);
}

// ─── Request Builder ────────────────────────────────────────
// Constructs a NextRequest for calling route handlers directly.
export function buildRequest(
  method: string,
  path: string,
  body?: unknown,
): NextRequest {
  const url = `http://localhost:3000${path}`;
  const init: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  return new NextRequest(url, init);
}

// ─── Response Parser ────────────────────────────────────────
export async function parseResponse<T = unknown>(
  res: Response,
): Promise<{ status: number; body: { data?: T; error?: { code: string; message: string; details?: unknown }; meta?: unknown } }> {
  const status = res.status;
  const body = await res.json();
  return { status, body };
}
