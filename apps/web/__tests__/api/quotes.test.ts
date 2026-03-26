/**
 * Integration tests for /api/quotes and /api/quotes/:id/accept (AC-002, AC-003, AC-015)
 *
 * Covers:
 * - Creating a quote as Ops stores it with status=DRAFT
 * - Accepting a quote creates TradeCase + milestones + doc checklist
 * - Accepting an already-accepted quote returns existing (idempotent)
 * - Buyer cannot create quotes (403)
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import {
  testPrisma,
  createTestFixtures,
  cleanDatabase,
  mockAuth,
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

import { POST as createQuote } from "@/app/api/quotes/route";
import { POST as acceptQuote } from "@/app/api/quotes/[id]/accept/route";

let fixtures: TestFixtures;
let testRfqId: string;

beforeAll(async () => {
  await cleanDatabase();
  fixtures = await createTestFixtures();

  // Create an RFQ that quotes can reference
  const rfq = await testPrisma.rfq.create({
    data: {
      buyerOrganizationId: IDS.buyerOrg,
      createdByUserId: IDS.buyerUser,
      status: "SUBMITTED",
      commodity: "Cashew Nuts",
      volume: 100,
      unit: "MT",
      destination: "Liverpool, UK",
    },
  });
  testRfqId = rfq.id;
});

afterAll(async () => {
  await cleanDatabase();
  await testPrisma.$disconnect();
});

beforeEach(() => {
  vi.clearAllMocks();
});

function quotePayload(rfqId: string) {
  return {
    rfqId,
    fees: { serviceFee: 2500, currency: "GBP" },
    leadTimeDays: 30,
    qcPlan: "Pre-shipment SGS inspection",
    docPlan: "Full ECOWAS doc set",
    terms: "Net 30 on B/L date",
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
  };
}

describe("POST /api/quotes", () => {
  it("creates a quote with status=DRAFT when called by Ops", async () => {
    mockAuth(IDS.opsUser, "ops@test.com");

    const req = buildRequest("POST", "/api/quotes", quotePayload(testRfqId));
    const res = await createQuote(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(201);
    expect(body.data).toBeDefined();

    const quote = body.data as Record<string, unknown>;
    expect(quote.status).toBe("DRAFT");
    expect(quote.rfqId).toBe(testRfqId);
    expect(quote.createdByUserId).toBe(IDS.opsUser);
    expect(quote.serviceFeeAmount).toBe(2500);
    expect(quote.leadTimeDays).toBe(30);
  });

  it("returns 403 when a buyer tries to create a quote", async () => {
    mockAuth(IDS.buyerUser, "buyer@test.com");

    const req = buildRequest("POST", "/api/quotes", quotePayload(testRfqId));
    const res = await createQuote(req);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(403);
    expect(body.error!.code).toBe("FORBIDDEN");
  });
});

describe("POST /api/quotes/:id/accept", () => {
  let sentQuoteId: string;

  beforeAll(async () => {
    // Create a quote in SENT status (the state required for acceptance)
    const quote = await testPrisma.quote.create({
      data: {
        rfqId: testRfqId,
        createdByUserId: IDS.opsUser,
        status: "SENT",
        currency: "GBP",
        serviceFeeAmount: 3000,
        leadTimeDays: 21,
        qcPlan: "Pre-shipment inspection",
        docPlan: "Standard doc set",
        terms: "Net 30",
        expiresAt: new Date(Date.now() + 14 * 86400000),
      },
    });
    sentQuoteId = quote.id;
  });

  it("accepts a SENT quote and creates TradeCase + milestones + doc checklist", async () => {
    mockAuth(IDS.buyerUser, "buyer@test.com");

    const req = buildRequest("POST", `/api/quotes/${sentQuoteId}/accept`);
    const ctx = { params: Promise.resolve({ id: sentQuoteId }) };
    const res = await acceptQuote(req, ctx);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body.data).toBeDefined();

    const data = body.data as Record<string, unknown>;
    expect(data.quoteStatus).toBe("ACCEPTED");

    const tc = data.tradeCase as Record<string, unknown>;
    expect(tc).toBeDefined();
    expect(tc.status).toBe("ACTIVE");
    expect(tc.milestoneCount).toBe(10);
    expect(tc.documentChecklistCount).toBe(7);
    expect((tc.referenceCode as string).startsWith("AT-")).toBe(true);

    // Verify quote status updated in DB
    const updatedQuote = await testPrisma.quote.findUnique({
      where: { id: sentQuoteId },
    });
    expect(updatedQuote!.status).toBe("ACCEPTED");
    expect(updatedQuote!.acceptedAt).toBeTruthy();

    // Verify milestones in DB
    const milestones = await testPrisma.milestone.findMany({
      where: { tradeCaseId: tc.id as string },
      orderBy: { sequence: "asc" },
    });
    expect(milestones.length).toBe(10);
    expect(milestones[0].templateKey).toBe("supplier_assigned");
    expect(milestones[9].templateKey).toBe("closeout");

    // Verify document checklist in DB
    const docs = await testPrisma.document.findMany({
      where: { tradeCaseId: tc.id as string },
    });
    expect(docs.length).toBe(7);
  });

  it("returns existing trade case when accepting an already-accepted quote (idempotent)", async () => {
    mockAuth(IDS.buyerUser, "buyer@test.com");

    const req = buildRequest("POST", `/api/quotes/${sentQuoteId}/accept`);
    const ctx = { params: Promise.resolve({ id: sentQuoteId }) };
    const res = await acceptQuote(req, ctx);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    const data = body.data as Record<string, unknown>;
    expect(data.quoteStatus).toBe("ACCEPTED");
    expect(data.tradeCase).toBeDefined();
  });

  it("returns 403 when Ops tries to accept a quote", async () => {
    mockAuth(IDS.opsUser, "ops@test.com");

    const req = buildRequest("POST", `/api/quotes/${sentQuoteId}/accept`);
    const ctx = { params: Promise.resolve({ id: sentQuoteId }) };
    const res = await acceptQuote(req, ctx);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(403);
    expect(body.error!.code).toBe("FORBIDDEN");
  });
});
