/**
 * Integration tests for POST /api/rfqs (AC-001)
 *
 * Covers:
 * - Creating an RFQ stores it with status=SUBMITTED and creates an AuditEvent
 * - Missing required fields returns 400
 * - Unauthenticated request returns 401
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

// Mock auth module before any route imports
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
  handlers: { GET: vi.fn(), POST: vi.fn() },
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// Import route handler after mocks are established
import { POST } from "@/app/api/rfqs/route";

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

describe("POST /api/rfqs", () => {
  const validPayload = {
    commodity: "Sesame Seeds",
    volume: 500,
    unit: "MT",
    destination: "London, UK",
    incoterm: "CIF",
    timeline: "Q2 2026",
    notes: "Prefer hulled variety",
  };

  it("creates an RFQ with status=SUBMITTED and logs an AuditEvent", async () => {
    mockAuth(IDS.buyerUser, "buyer@test.com");

    const req = buildRequest("POST", "/api/rfqs", validPayload);
    const res = await POST(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(201);
    expect(body.data).toBeDefined();

    const rfq = body.data as Record<string, unknown>;
    expect(rfq.status).toBe("SUBMITTED");
    expect(rfq.commodity).toBe("Sesame Seeds");
    expect(rfq.volume).toBe(500);
    expect(rfq.unit).toBe("MT");
    expect(rfq.destination).toBe("London, UK");
    expect(rfq.buyerOrganizationId).toBe(IDS.buyerOrg);
    expect(rfq.createdByUserId).toBe(IDS.buyerUser);

    // Verify AuditEvent was created
    const audits = await testPrisma.auditEvent.findMany({
      where: { entityType: "Rfq", entityId: rfq.id as string },
    });
    expect(audits.length).toBe(1);
    expect(audits[0].action).toBe("RFQ_CREATED");
    expect(audits[0].actorUserId).toBe(IDS.buyerUser);
  });

  it("returns 400 when required fields are missing", async () => {
    mockAuth(IDS.buyerUser, "buyer@test.com");

    // Missing commodity, volume, unit, destination
    const req = buildRequest("POST", "/api/rfqs", { notes: "incomplete" });
    const res = await POST(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(400);
    expect(body.error).toBeDefined();
    expect(body.error!.code).toBe("VALIDATION_ERROR");
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuthUnauthenticated();

    const req = buildRequest("POST", "/api/rfqs", validPayload);
    const res = await POST(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(401);
    expect(body.error).toBeDefined();
    expect(body.error!.code).toBe("UNAUTHENTICATED");
  });

  it("returns 403 when a non-buyer tries to create an RFQ", async () => {
    mockAuth(IDS.opsUser, "ops@test.com");

    const req = buildRequest("POST", "/api/rfqs", validPayload);
    const res = await POST(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(403);
    expect(body.error).toBeDefined();
    expect(body.error!.code).toBe("FORBIDDEN");
  });
});
