/**
 * Integration tests for /api/documents/:id/approve and /api/documents/:id/reject
 * (AC-004, AC-005, AC-006)
 *
 * Covers:
 * - Document approval changes status to APPROVED
 * - Document rejection requires a reason
 * - Rejection without reason returns 400
 * - Non-Ops cannot approve (403)
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

import { POST as approveDocument } from "@/app/api/documents/[id]/approve/route";
import { POST as rejectDocument } from "@/app/api/documents/[id]/reject/route";

let fixtures: TestFixtures;
let tradeCaseId: string;
let uploadedDocId: string;
let uploadedDocId2: string;
let uploadedDocId3: string;

beforeAll(async () => {
  await cleanDatabase();
  fixtures = await createTestFixtures();

  // Create a minimal RFQ -> Quote -> TradeCase chain for the documents
  const rfq = await testPrisma.rfq.create({
    data: {
      buyerOrganizationId: IDS.buyerOrg,
      createdByUserId: IDS.buyerUser,
      status: "QUOTED",
      commodity: "Cocoa Beans",
      volume: 200,
      unit: "MT",
      destination: "Tilbury, UK",
    },
  });

  const quote = await testPrisma.quote.create({
    data: {
      rfqId: rfq.id,
      createdByUserId: IDS.opsUser,
      status: "ACCEPTED",
      currency: "GBP",
      serviceFeeAmount: 4000,
      leadTimeDays: 28,
      qcPlan: "SGS inspection",
      docPlan: "Standard",
      terms: "Net 30",
      expiresAt: new Date(Date.now() + 14 * 86400000),
      acceptedAt: new Date(),
    },
  });

  const tc = await testPrisma.tradeCase.create({
    data: {
      quoteId: quote.id,
      rfqId: rfq.id,
      buyerOrganizationId: IDS.buyerOrg,
      status: "ACTIVE",
      referenceCode: "AT-2026-9990",
      commodity: "Cocoa Beans",
    },
  });
  tradeCaseId = tc.id;

  // Create documents in UPLOADED status (ready for review)
  const doc1 = await testPrisma.document.create({
    data: {
      tradeCaseId,
      documentType: "COO",
      status: "UPLOADED",
      required: true,
      fileKey: "uploads/test-coo.pdf",
      originalName: "coo.pdf",
      mimeType: "application/pdf",
      sizeBytes: 12345,
      uploadedByUserId: IDS.supplierUser,
    },
  });
  uploadedDocId = doc1.id;

  const doc2 = await testPrisma.document.create({
    data: {
      tradeCaseId,
      documentType: "COA",
      status: "UPLOADED",
      required: true,
      fileKey: "uploads/test-coa.pdf",
      originalName: "coa.pdf",
      mimeType: "application/pdf",
      sizeBytes: 9876,
      uploadedByUserId: IDS.supplierUser,
    },
  });
  uploadedDocId2 = doc2.id;

  const doc3 = await testPrisma.document.create({
    data: {
      tradeCaseId,
      documentType: "PHYTO",
      status: "UPLOADED",
      required: true,
      fileKey: "uploads/test-phyto.pdf",
      originalName: "phyto.pdf",
      mimeType: "application/pdf",
      sizeBytes: 5000,
      uploadedByUserId: IDS.supplierUser,
    },
  });
  uploadedDocId3 = doc3.id;
});

afterAll(async () => {
  await cleanDatabase();
  await testPrisma.$disconnect();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/documents/:id/approve", () => {
  it("approves a document and changes status to APPROVED", async () => {
    mockAuth(IDS.opsUser, "ops@test.com");

    const req = buildRequest("POST", `/api/documents/${uploadedDocId}/approve`, {
      reviewNote: "Looks good",
    });
    const ctx = { params: Promise.resolve({ id: uploadedDocId }) };
    const res = await approveDocument(req, ctx);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body.data).toBeDefined();

    const doc = body.data as Record<string, unknown>;
    expect(doc.status).toBe("APPROVED");
    expect(doc.id).toBe(uploadedDocId);

    // Verify in DB
    const dbDoc = await testPrisma.document.findUnique({ where: { id: uploadedDocId } });
    expect(dbDoc!.status).toBe("APPROVED");

    // Verify DocumentReview was created
    const reviews = await testPrisma.documentReview.findMany({
      where: { documentId: uploadedDocId },
    });
    expect(reviews.length).toBe(1);
    expect(reviews[0].action).toBe("APPROVED");
    expect(reviews[0].reviewedByUserId).toBe(IDS.opsUser);
  });

  it("returns 403 when a buyer tries to approve", async () => {
    mockAuth(IDS.buyerUser, "buyer@test.com");

    const req = buildRequest("POST", `/api/documents/${uploadedDocId2}/approve`);
    const ctx = { params: Promise.resolve({ id: uploadedDocId2 }) };
    const res = await approveDocument(req, ctx);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(403);
    expect(body.error!.code).toBe("FORBIDDEN");
  });

  it("returns 403 when a supplier tries to approve", async () => {
    mockAuth(IDS.supplierUser, "supplier@test.com");

    const req = buildRequest("POST", `/api/documents/${uploadedDocId2}/approve`);
    const ctx = { params: Promise.resolve({ id: uploadedDocId2 }) };
    const res = await approveDocument(req, ctx);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(403);
    expect(body.error!.code).toBe("FORBIDDEN");
  });
});

describe("POST /api/documents/:id/reject", () => {
  it("rejects a document with a reason and changes status to REJECTED", async () => {
    mockAuth(IDS.opsUser, "ops@test.com");

    const req = buildRequest("POST", `/api/documents/${uploadedDocId2}/reject`, {
      reason: "Certificate date is expired",
    });
    const ctx = { params: Promise.resolve({ id: uploadedDocId2 }) };
    const res = await rejectDocument(req, ctx);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(200);
    expect(body.data).toBeDefined();

    const doc = body.data as Record<string, unknown>;
    expect(doc.status).toBe("REJECTED");

    // Verify DocumentReview reason persisted
    const reviews = await testPrisma.documentReview.findMany({
      where: { documentId: uploadedDocId2 },
    });
    expect(reviews.length).toBe(1);
    expect(reviews[0].action).toBe("REJECTED");
    expect(reviews[0].reason).toBe("Certificate date is expired");
  });

  it("returns 400 when rejection reason is missing", async () => {
    mockAuth(IDS.opsUser, "ops@test.com");

    const req = buildRequest("POST", `/api/documents/${uploadedDocId3}/reject`, {});
    const ctx = { params: Promise.resolve({ id: uploadedDocId3 }) };
    const res = await rejectDocument(req, ctx);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(400);
    expect(body.error!.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 when rejection reason is an empty string", async () => {
    mockAuth(IDS.opsUser, "ops@test.com");

    const req = buildRequest("POST", `/api/documents/${uploadedDocId3}/reject`, {
      reason: "   ",
    });
    const ctx = { params: Promise.resolve({ id: uploadedDocId3 }) };
    const res = await rejectDocument(req, ctx);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(400);
    expect(body.error!.code).toBe("VALIDATION_ERROR");
  });

  it("returns 403 when a non-Ops user tries to reject", async () => {
    mockAuth(IDS.buyerUser, "buyer@test.com");

    const req = buildRequest("POST", `/api/documents/${uploadedDocId3}/reject`, {
      reason: "Should not work",
    });
    const ctx = { params: Promise.resolve({ id: uploadedDocId3 }) };
    const res = await rejectDocument(req, ctx);
    const { status, body } = await parseResponse(res);

    expect(status).toBe(403);
    expect(body.error!.code).toBe("FORBIDDEN");
  });
});
