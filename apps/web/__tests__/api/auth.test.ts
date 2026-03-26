/**
 * Integration tests for authentication and authorization (AC-010)
 *
 * Covers:
 * - Unauthenticated request to protected endpoint returns 401
 * - Wrong role returns 403
 *
 * Uses /api/rfqs as the representative protected endpoint since it
 * exercises both authentication (requireAuth) and role checks.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import {
  testPrisma,
  createTestFixtures,
  cleanDatabase,
  mockAuth,
  mockAuthUnauthenticated,
  buildRequest,
  parseResponse,
  IDS,
  type TestFixtures,
} from "./helpers";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
  handlers: { GET: vi.fn(), POST: vi.fn() },
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

import { POST as createRfq, GET as listRfqs } from "@/app/api/rfqs/route";
import { POST as createQuote } from "@/app/api/quotes/route";
import { POST as createInspection } from "@/app/api/inspections/route";

let fixtures: TestFixtures;

beforeAll(async () => {
  await cleanDatabase();
  fixtures = await createTestFixtures();
});

afterAll(async () => {
  await cleanDatabase();
  await testPrisma.$disconnect();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Authentication — 401 on unauthenticated requests", () => {
  it("POST /api/rfqs returns 401 when not authenticated", async () => {
    mockAuthUnauthenticated();

    const req = buildRequest("POST", "/api/rfqs", {
      commodity: "Test",
      volume: 1,
      unit: "MT",
      destination: "London",
    });
    const res = await createRfq(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(401);
    expect(body.error!.code).toBe("UNAUTHENTICATED");
  });

  it("GET /api/rfqs returns 401 when not authenticated", async () => {
    mockAuthUnauthenticated();

    const req = buildRequest("GET", "/api/rfqs");
    const res = await listRfqs(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(401);
    expect(body.error!.code).toBe("UNAUTHENTICATED");
  });

  it("POST /api/quotes returns 401 when not authenticated", async () => {
    mockAuthUnauthenticated();

    const req = buildRequest("POST", "/api/quotes", {
      rfqId: "fake-id",
      fees: { serviceFee: 100 },
      leadTimeDays: 7,
      qcPlan: "plan",
      docPlan: "plan",
      terms: "terms",
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });
    const res = await createQuote(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(401);
    expect(body.error!.code).toBe("UNAUTHENTICATED");
  });

  it("POST /api/inspections returns 401 when not authenticated", async () => {
    mockAuthUnauthenticated();

    const req = buildRequest("POST", "/api/inspections", {
      tradeCaseId: "fake-id",
      provider: "SGS",
      result: "PASS",
    });
    const res = await createInspection(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(401);
    expect(body.error!.code).toBe("UNAUTHENTICATED");
  });
});

describe("Authorization — 403 on wrong role", () => {
  it("Supplier cannot list RFQs (GET /api/rfqs)", async () => {
    mockAuth(IDS.supplierUser, "supplier@test.com");

    const req = buildRequest("GET", "/api/rfqs");
    const res = await listRfqs(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(403);
    expect(body.error!.code).toBe("FORBIDDEN");
  });

  it("Ops cannot create RFQs (POST /api/rfqs)", async () => {
    mockAuth(IDS.opsUser, "ops@test.com");

    const req = buildRequest("POST", "/api/rfqs", {
      commodity: "Test",
      volume: 1,
      unit: "MT",
      destination: "London",
    });
    const res = await createRfq(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(403);
    expect(body.error!.code).toBe("FORBIDDEN");
  });

  it("Buyer cannot create quotes (POST /api/quotes)", async () => {
    mockAuth(IDS.buyerUser, "buyer@test.com");

    const req = buildRequest("POST", "/api/quotes", {
      rfqId: "some-rfq-id",
      fees: { serviceFee: 100 },
      leadTimeDays: 7,
      qcPlan: "plan",
      docPlan: "plan",
      terms: "terms",
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });
    const res = await createQuote(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(403);
    expect(body.error!.code).toBe("FORBIDDEN");
  });

  it("Supplier cannot create quotes (POST /api/quotes)", async () => {
    mockAuth(IDS.supplierUser, "supplier@test.com");

    const req = buildRequest("POST", "/api/quotes", {
      rfqId: "some-rfq-id",
      fees: { serviceFee: 100 },
      leadTimeDays: 7,
      qcPlan: "plan",
      docPlan: "plan",
      terms: "terms",
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });
    const res = await createQuote(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(403);
    expect(body.error!.code).toBe("FORBIDDEN");
  });

  it("Buyer cannot record inspections (POST /api/inspections)", async () => {
    mockAuth(IDS.buyerUser, "buyer@test.com");

    const req = buildRequest("POST", "/api/inspections", {
      tradeCaseId: "fake-id",
      provider: "SGS",
      result: "PASS",
    });
    const res = await createInspection(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(403);
    expect(body.error!.code).toBe("FORBIDDEN");
  });
});
