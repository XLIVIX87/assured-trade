// ─────────────────────────────────────────────────────────────
// Assured Trade — Phase 1 Database Seed
// ─────────────────────────────────────────────────────────────

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const DEV_PASSWORD = "password123";

async function main() {
  console.log("Seeding Assured Trade database...");
  const hashedPassword = await bcrypt.hash(DEV_PASSWORD, 10);
  console.log(`  Dev login password for all users: ${DEV_PASSWORD}`);

  // ───────────────────────────────────────────
  // Organizations
  // ───────────────────────────────────────────
  const opsOrg = await prisma.organization.create({
    data: {
      name: "Assured Trade Operations",
      slug: "assured-trade-ops",
      country: "GB",
      type: "INTERNAL",
      verificationStatus: "VERIFIED",
      verificationLevel: "ENHANCED",
    },
  });

  const buyerOrg = await prisma.organization.create({
    data: {
      name: "Thames Valley Foods Ltd",
      slug: "thames-valley-foods",
      country: "GB",
      registrationNumber: "12345678",
      type: "BUYER",
      verificationStatus: "VERIFIED",
      verificationLevel: "BASIC",
    },
  });

  const supplierOrg1 = await prisma.organization.create({
    data: {
      name: "Lagos Agro Exports Ltd",
      slug: "lagos-agro-exports",
      country: "NG",
      registrationNumber: "RC-100200",
      type: "SUPPLIER",
      verificationStatus: "VERIFIED",
      verificationLevel: "BASIC",
    },
  });

  const supplierOrg2 = await prisma.organization.create({
    data: {
      name: "Kano Commodities Co",
      slug: "kano-commodities",
      country: "NG",
      registrationNumber: "RC-300400",
      type: "SUPPLIER",
      verificationStatus: "PENDING",
      verificationLevel: "NONE",
    },
  });

  // ───────────────────────────────────────────
  // Users & Memberships
  // ───────────────────────────────────────────
  const opsUser = await prisma.user.create({
    data: {
      name: "Alex Operations",
      email: "alex.ops@assuredtrade.co.uk",
      emailVerified: new Date(),
      hashedPassword,
      memberships: {
        create: {
          organizationId: opsOrg.id,
          role: "OPS",
          status: "ACTIVE",
        },
      },
    },
  });

  const buyerUser = await prisma.user.create({
    data: {
      name: "Sarah Buyer",
      email: "sarah@thamesvalleyfoods.co.uk",
      emailVerified: new Date(),
      hashedPassword,
      memberships: {
        create: {
          organizationId: buyerOrg.id,
          role: "BUYER",
          status: "ACTIVE",
        },
      },
    },
  });

  const supplierUser1 = await prisma.user.create({
    data: {
      name: "Chidi Supplier",
      email: "chidi@lagosagroexports.com",
      emailVerified: new Date(),
      hashedPassword,
      memberships: {
        create: {
          organizationId: supplierOrg1.id,
          role: "SUPPLIER",
          status: "ACTIVE",
        },
      },
    },
  });

  const supplierUser2 = await prisma.user.create({
    data: {
      name: "Amina Supplier",
      email: "amina@kanocommodities.com",
      emailVerified: new Date(),
      hashedPassword,
      memberships: {
        create: {
          organizationId: supplierOrg2.id,
          role: "SUPPLIER",
          status: "ACTIVE",
        },
      },
    },
  });

  // ───────────────────────────────────────────
  // RFQs
  // ───────────────────────────────────────────
  const rfq1 = await prisma.rfq.create({
    data: {
      buyerOrganizationId: buyerOrg.id,
      createdByUserId: buyerUser.id,
      status: "SUBMITTED",
      commodity: "Dried Hibiscus Flowers",
      volume: 25000,
      unit: "kg",
      destination: "Felixstowe, UK",
      incoterm: "CIF",
      timeline: "Q2 2026",
      notes: "Premium grade required. Must meet EU food safety standards. Prefer air-dried over sun-dried.",
    },
  });

  const rfq2 = await prisma.rfq.create({
    data: {
      buyerOrganizationId: buyerOrg.id,
      createdByUserId: buyerUser.id,
      status: "QUOTED",
      commodity: "Raw Cashew Nuts",
      volume: 50000,
      unit: "kg",
      destination: "Southampton, UK",
      incoterm: "FOB",
      timeline: "Q3 2026",
      notes: "W320 grade. Need phytosanitary certificate and certificate of origin.",
    },
  });

  // ───────────────────────────────────────────
  // Quotes
  // ───────────────────────────────────────────
  const quote1Draft = await prisma.quote.create({
    data: {
      rfqId: rfq1.id,
      createdByUserId: opsUser.id,
      status: "DRAFT",
      currency: "GBP",
      serviceFeeAmount: 3500.0,
      brokerCommissionAmount: 750.0,
      leadTimeDays: 45,
      qcPlan: "Pre-shipment inspection at Lagos warehouse. Sample testing for moisture content and aflatoxin levels.",
      docPlan: "COO, COA, Phytosanitary Certificate, Packing List, Bill of Lading, Fumigation Certificate required.",
      terms: "Payment: 30% advance, 70% against shipping documents. Force majeure clause applies.",
      expiresAt: new Date("2026-05-01T00:00:00Z"),
    },
  });

  const quote2Sent = await prisma.quote.create({
    data: {
      rfqId: rfq2.id,
      createdByUserId: opsUser.id,
      status: "SENT",
      currency: "GBP",
      serviceFeeAmount: 6200.0,
      brokerCommissionAmount: 1200.0,
      leadTimeDays: 60,
      qcPlan: "Two-stage inspection: warehouse check + port-side verification. W320 nut count and quality grading.",
      docPlan: "Full documentation suite: COO, COA, Phyto, Packing List, BoL, Insurance Certificate, Commercial Invoice.",
      terms: "Payment: 50% advance via LC, 50% against BoL. Subject to GAFTA arbitration.",
      expiresAt: new Date("2026-05-15T00:00:00Z"),
    },
  });

  // ───────────────────────────────────────────
  // Accepted Quote + Trade Case
  // ───────────────────────────────────────────
  const acceptedQuote = await prisma.quote.create({
    data: {
      rfqId: rfq2.id,
      createdByUserId: opsUser.id,
      status: "ACCEPTED",
      currency: "GBP",
      serviceFeeAmount: 5800.0,
      brokerCommissionAmount: 1100.0,
      leadTimeDays: 55,
      qcPlan: "Pre-shipment inspection at Kano warehouse. W320 count verification, moisture and aflatoxin testing.",
      docPlan: "COO, COA, Phytosanitary Certificate, Packing List, Bill of Lading, Insurance Certificate.",
      terms: "Payment: 40% advance, 60% against documents. GAFTA standard terms.",
      expiresAt: new Date("2026-04-30T00:00:00Z"),
      acceptedAt: new Date("2026-03-20T14:30:00Z"),
    },
  });

  const tradeCase = await prisma.tradeCase.create({
    data: {
      quoteId: acceptedQuote.id,
      rfqId: rfq2.id,
      buyerOrganizationId: buyerOrg.id,
      assignedOpsUserId: opsUser.id,
      status: "ACTIVE",
      referenceCode: "AT-2026-0001",
      commodity: "Raw Cashew Nuts",
      routeSummary: "Kano, Nigeria -> Apapa Port, Lagos -> Southampton, UK",
      expectedShipDate: new Date("2026-05-15T00:00:00Z"),
    },
  });

  // ───────────────────────────────────────────
  // Lot + Allocation
  // ───────────────────────────────────────────
  const lot = await prisma.lot.create({
    data: {
      supplierOrganizationId: supplierOrg1.id,
      createdByUserId: supplierUser1.id,
      commodity: "Raw Cashew Nuts",
      origin: "Kano State, Nigeria",
      grade: "W320",
      batchNumber: "LAE-2026-0042",
      availableQuantity: 75000,
      unit: "kg",
      storageNotes: "Climate-controlled warehouse at Kano Free Trade Zone. Regular fumigation schedule.",
    },
  });

  await prisma.lotAllocation.create({
    data: {
      tradeCaseId: tradeCase.id,
      lotId: lot.id,
      supplierOrganizationId: supplierOrg1.id,
      quantityAllocated: 50000,
      unit: "kg",
      notes: "Full order from single lot. Batch LAE-2026-0042.",
    },
  });

  // ───────────────────────────────────────────
  // Milestones (mixed statuses)
  // ───────────────────────────────────────────
  const milestones = [
    { name: "Quote Accepted", sequence: 1, status: "DONE" as const, templateKey: "quote_accepted", completedAt: new Date("2026-03-20T14:30:00Z") },
    { name: "Supplier Allocated", sequence: 2, status: "DONE" as const, templateKey: "supplier_allocated", completedAt: new Date("2026-03-21T10:00:00Z") },
    { name: "Document Collection", sequence: 3, status: "IN_PROGRESS" as const, templateKey: "doc_collection", dueDate: new Date("2026-04-15T00:00:00Z") },
    { name: "Pre-Shipment Inspection", sequence: 4, status: "NOT_STARTED" as const, templateKey: "pre_ship_inspection", dueDate: new Date("2026-04-25T00:00:00Z") },
    { name: "Shipping & Logistics", sequence: 5, status: "NOT_STARTED" as const, templateKey: "shipping", dueDate: new Date("2026-05-15T00:00:00Z") },
    { name: "Customs Clearance", sequence: 6, status: "BLOCKED" as const, templateKey: "customs", dueDate: new Date("2026-05-25T00:00:00Z"), blockedReason: "Awaiting confirmed ship date to schedule customs slot." },
    { name: "Close-Out", sequence: 7, status: "NOT_STARTED" as const, templateKey: "closeout", dueDate: new Date("2026-06-05T00:00:00Z") },
  ];

  for (const ms of milestones) {
    await prisma.milestone.create({
      data: {
        tradeCaseId: tradeCase.id,
        templateKey: ms.templateKey,
        name: ms.name,
        sequence: ms.sequence,
        status: ms.status,
        ownerUserId: opsUser.id,
        dueDate: ms.dueDate,
        completedAt: ms.completedAt,
        blockedReason: ms.blockedReason,
      },
    });
  }

  // ───────────────────────────────────────────
  // Documents (approved, uploaded, rejected)
  // ───────────────────────────────────────────
  const docApproved = await prisma.document.create({
    data: {
      tradeCaseId: tradeCase.id,
      documentType: "COO",
      status: "APPROVED",
      required: true,
      fileKey: "docs/AT-2026-0001/coo-nigeria.pdf",
      originalName: "Certificate_of_Origin_Nigeria.pdf",
      mimeType: "application/pdf",
      sizeBytes: 245000,
      issuedBy: "Nigerian Export Promotion Council",
      issuedAt: new Date("2026-03-22T00:00:00Z"),
      uploadedByUserId: supplierUser1.id,
      uploadedByOrganizationId: supplierOrg1.id,
    },
  });

  await prisma.documentReview.create({
    data: {
      documentId: docApproved.id,
      reviewedByUserId: opsUser.id,
      action: "APPROVED",
    },
  });

  const docUploaded = await prisma.document.create({
    data: {
      tradeCaseId: tradeCase.id,
      documentType: "COA",
      status: "UPLOADED",
      required: true,
      fileKey: "docs/AT-2026-0001/coa-cashew.pdf",
      originalName: "Certificate_of_Analysis_W320.pdf",
      mimeType: "application/pdf",
      sizeBytes: 182000,
      issuedBy: "SGS Nigeria",
      issuedAt: new Date("2026-03-23T00:00:00Z"),
      uploadedByUserId: supplierUser1.id,
      uploadedByOrganizationId: supplierOrg1.id,
    },
  });

  const docRejected = await prisma.document.create({
    data: {
      tradeCaseId: tradeCase.id,
      documentType: "PHYTO",
      status: "REJECTED",
      required: true,
      fileKey: "docs/AT-2026-0001/phyto-v1.pdf",
      originalName: "Phytosanitary_Certificate_v1.pdf",
      mimeType: "application/pdf",
      sizeBytes: 156000,
      issuedBy: "NAQS",
      issuedAt: new Date("2026-03-21T00:00:00Z"),
      uploadedByUserId: supplierUser1.id,
      uploadedByOrganizationId: supplierOrg1.id,
    },
  });

  await prisma.documentReview.create({
    data: {
      documentId: docRejected.id,
      reviewedByUserId: opsUser.id,
      action: "REJECTED",
      reason: "Certificate expired. Issue date is before the lot allocation date. Please request a new certificate from NAQS referencing the correct batch number.",
    },
  });

  // ───────────────────────────────────────────
  // Inspection
  // ───────────────────────────────────────────
  await prisma.inspection.create({
    data: {
      tradeCaseId: tradeCase.id,
      lotId: lot.id,
      provider: "SGS Nigeria",
      scheduledAt: new Date("2026-03-25T09:00:00Z"),
      completedAt: new Date("2026-03-25T15:30:00Z"),
      result: "PASS",
      notes: "W320 count verified at 315-325 per pound. Moisture 8.2% (within spec). No visible defects or foreign matter. Aflatoxin below detection limit.",
      attachmentsJson: [
        { name: "inspection_report.pdf", key: "inspections/AT-2026-0001/sgs-report.pdf" },
        { name: "photos.zip", key: "inspections/AT-2026-0001/photos.zip" },
      ],
      createdByUserId: opsUser.id,
    },
  });

  // ───────────────────────────────────────────
  // Issue
  // ───────────────────────────────────────────
  await prisma.issue.create({
    data: {
      tradeCaseId: tradeCase.id,
      type: "DOCUMENT",
      severity: "MEDIUM",
      status: "OPEN",
      description: "Phytosanitary certificate was rejected due to incorrect issue date. Supplier needs to obtain a new certificate from NAQS with the correct batch reference.",
      ownerUserId: supplierUser1.id,
      createdByUserId: opsUser.id,
    },
  });

  // ───────────────────────────────────────────
  // Messages
  // ───────────────────────────────────────────
  await prisma.message.create({
    data: {
      tradeCaseId: tradeCase.id,
      authorUserId: opsUser.id,
      visibility: "SHARED",
      body: "Welcome to trade case AT-2026-0001. Document collection is now underway. Please upload all required documents by April 15th.",
    },
  });

  await prisma.message.create({
    data: {
      tradeCaseId: tradeCase.id,
      authorUserId: supplierUser1.id,
      visibility: "SHARED",
      body: "COO and COA have been uploaded. Working on getting the phytosanitary certificate reissued. Should have it within 3 business days.",
    },
  });

  await prisma.message.create({
    data: {
      tradeCaseId: tradeCase.id,
      authorUserId: opsUser.id,
      visibility: "INTERNAL",
      body: "Internal note: Supplier is responsive. Phyto reissue expected by end of week. Keep monitoring.",
    },
  });

  // ───────────────────────────────────────────
  // Notifications
  // ───────────────────────────────────────────
  const notifications = [
    {
      recipientUserId: buyerUser.id,
      organizationId: buyerOrg.id,
      tradeCaseId: tradeCase.id,
      type: "QUOTE_ACCEPTED" as const,
      title: "Quote Accepted - Raw Cashew Nuts",
      body: "Your quote for 50,000 kg Raw Cashew Nuts has been accepted. Trade case AT-2026-0001 is now active.",
    },
    {
      recipientUserId: opsUser.id,
      organizationId: opsOrg.id,
      tradeCaseId: tradeCase.id,
      type: "DOCUMENT_UPLOADED" as const,
      title: "Document Uploaded - COO",
      body: "Lagos Agro Exports has uploaded the Certificate of Origin for trade case AT-2026-0001.",
    },
    {
      recipientUserId: supplierUser1.id,
      organizationId: supplierOrg1.id,
      tradeCaseId: tradeCase.id,
      type: "DOCUMENT_REJECTED" as const,
      title: "Document Rejected - Phytosanitary Certificate",
      body: "The Phytosanitary Certificate for AT-2026-0001 has been rejected. Reason: Certificate expired.",
    },
    {
      recipientUserId: opsUser.id,
      organizationId: opsOrg.id,
      tradeCaseId: tradeCase.id,
      type: "INSPECTION_RECORDED" as const,
      title: "Inspection Complete - PASS",
      body: "SGS Nigeria inspection for AT-2026-0001 completed with result: PASS.",
    },
    {
      recipientUserId: buyerUser.id,
      organizationId: buyerOrg.id,
      rfqId: rfq1.id,
      type: "RFQ_SUBMITTED" as const,
      title: "RFQ Submitted - Dried Hibiscus Flowers",
      body: "Your RFQ for 25,000 kg Dried Hibiscus Flowers has been submitted and is under review.",
    },
  ];

  for (const n of notifications) {
    await prisma.notification.create({ data: n });
  }

  // ───────────────────────────────────────────
  // Audit Events
  // ───────────────────────────────────────────
  const auditEvents = [
    {
      actorUserId: buyerUser.id,
      actorOrganizationId: buyerOrg.id,
      entityType: "Quote",
      entityId: acceptedQuote.id,
      action: "ACCEPTED",
      afterJson: { status: "ACCEPTED", acceptedAt: "2026-03-20T14:30:00Z" },
      tradeCaseId: tradeCase.id,
      requestId: "req_seed_001",
    },
    {
      actorUserId: opsUser.id,
      actorOrganizationId: opsOrg.id,
      entityType: "TradeCase",
      entityId: tradeCase.id,
      action: "CREATED",
      afterJson: { referenceCode: "AT-2026-0001", status: "ACTIVE" },
      tradeCaseId: tradeCase.id,
      requestId: "req_seed_002",
    },
    {
      actorUserId: supplierUser1.id,
      actorOrganizationId: supplierOrg1.id,
      entityType: "Document",
      entityId: docApproved.id,
      action: "UPLOADED",
      afterJson: { documentType: "COO", status: "UPLOADED" },
      tradeCaseId: tradeCase.id,
      requestId: "req_seed_003",
    },
    {
      actorUserId: opsUser.id,
      actorOrganizationId: opsOrg.id,
      entityType: "Document",
      entityId: docApproved.id,
      action: "APPROVED",
      beforeJson: { status: "UPLOADED" },
      afterJson: { status: "APPROVED" },
      tradeCaseId: tradeCase.id,
      requestId: "req_seed_004",
    },
    {
      actorUserId: opsUser.id,
      actorOrganizationId: opsOrg.id,
      entityType: "Document",
      entityId: docRejected.id,
      action: "REJECTED",
      beforeJson: { status: "UPLOADED" },
      afterJson: { status: "REJECTED" },
      tradeCaseId: tradeCase.id,
      requestId: "req_seed_005",
    },
  ];

  for (const ae of auditEvents) {
    await prisma.auditEvent.create({ data: ae });
  }

  console.log("Seed completed successfully.");
  console.log(`  Organizations: 4`);
  console.log(`  Users: 4`);
  console.log(`  RFQs: 2`);
  console.log(`  Quotes: 3 (1 draft, 1 sent, 1 accepted)`);
  console.log(`  Trade Cases: 1`);
  console.log(`  Milestones: 7`);
  console.log(`  Documents: 3 (approved, uploaded, rejected)`);
  console.log(`  Document Reviews: 2`);
  console.log(`  Inspections: 1`);
  console.log(`  Issues: 1`);
  console.log(`  Messages: 3`);
  console.log(`  Notifications: 5`);
  console.log(`  Audit Events: 5`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
