---
id: phase1-data-model-uk-commodity-gateway
title: "Phase 1 Data Model Specification — <APP_NAME> (Prisma + Postgres)"
status: draft
owner: Product + Engineering Lead
last_updated: 2026-03-24
related_docs:
  - docs/phase-1/00-project-brief.md
  - docs/phase-1/01-prd.md
  - docs/phase-1/02-user-journeys.md
  - docs/phase-1/03-acceptance-criteria.md
  - docs/phase-1/05-api-spec.md
  - docs/phase-1/07-ai-spec.md
---

# Overview

This document defines the Phase 1 data model for **<APP_NAME>**, a case-managed Assured Trade Deal Desk built on **Next.js + Prisma + Postgres**, with optional **pgvector** support for AI retrieval in later phases. The model is designed to support the full Phase 1 flow:

**RFQ → Quote → Trade Case → Supplier/Lot Assignment → Documents → Inspection → Issues → Milestones → Close-out Pack**

The data model must support:
- strong role and organization scoping
- evidence-backed workflow execution
- auditability
- deterministic business state transitions
- optional AI assistance without making AI a system dependency

Assumed Prisma schema location:
- `apps/web/prisma/schema.prisma`

If the repo uses a different path, this doc should be updated before schema implementation begins.

---

# Design principles

## 1. Trade Case is the core business object
Every accepted Quote results in one Trade Case. Most operational records in Phase 1 are directly or indirectly scoped to a Trade Case.

## 2. Organization-scoped multi-tenancy
All user-visible business data must be scoped to an organization and then constrained further by role and assignment.

## 3. Auditability over cleverness
Key actions should produce explicit records. Avoid overloading generic JSON fields for critical business logic.

## 4. State transitions are data-backed
Statuses must be represented explicitly with enums and updated through application rules.

## 5. Files are metadata in DB, binary outside DB
Documents and attachments are stored in object storage; the database stores metadata, linkage, and review state.

## 6. AI is optional
The data model should support AI outputs and optional retrieval, but the product must work without them.

---

# Entities and relationships

## High-level ERD description

The main entity groups are:

### Identity / access
- `User`
- `Organization`
- `Membership`
- `SessionAccount` / auth-related models (Auth.js specific)

### Commercial intake
- `RFQ`
- `RFQAttachment`
- `Quote`

### Execution / operations
- `TradeCase`
- `Lot`
- `LotAllocation`
- `Milestone`
- `Inspection`
- `Issue`

### Evidence / compliance
- `Document`
- `DocumentReview`
- `CloseoutPack`

### Communication / control
- `Message`
- `Notification`
- `AuditEvent`

### Optional AI / retrieval
- `AiRun`
- `KnowledgeChunk` (if pgvector enabled)

---

## Relationship summary

- One `Organization` has many `Memberships`
- One `User` has many `Memberships`
- One `Organization` can act as Buyer or Supplier depending on context
- One Buyer `Organization` has many `RFQs`
- One `RFQ` can have many `Quotes`
- One accepted `Quote` creates one `TradeCase`
- One `TradeCase` belongs to one Buyer `Organization`
- One `TradeCase` may be assigned to one or more Supplier `Organizations` through `LotAllocation`
- One `Lot` belongs to one Supplier `Organization`
- One `TradeCase` has many `Milestones`
- One `TradeCase` has many `Documents`
- One `Document` can have many `DocumentReview` events, but only one current status
- One `TradeCase` has many `Inspections`
- One `TradeCase` has many `Issues`
- One `TradeCase` can have one or more `CloseoutPack` generations, but only one active/final current pack
- One `TradeCase` has many `Messages`, `Notifications`, and `AuditEvents`

---

## Mermaid ERD (conceptual)

```mermaid
erDiagram
  USER ||--o{ MEMBERSHIP : has
  ORGANIZATION ||--o{ MEMBERSHIP : has

  ORGANIZATION ||--o{ RFQ : creates
  RFQ ||--o{ RFQ_ATTACHMENT : has
  RFQ ||--o{ QUOTE : receives

  QUOTE ||--o| TRADE_CASE : creates

  ORGANIZATION ||--o{ LOT : owns
  TRADE_CASE ||--o{ LOT_ALLOCATION : has
  LOT ||--o{ LOT_ALLOCATION : allocated_to

  TRADE_CASE ||--o{ MILESTONE : has
  TRADE_CASE ||--o{ DOCUMENT : has
  DOCUMENT ||--o{ DOCUMENT_REVIEW : reviewed_by
  TRADE_CASE ||--o{ INSPECTION : has
  TRADE_CASE ||--o{ ISSUE : has
  TRADE_CASE ||--o{ MESSAGE : has
  TRADE_CASE ||--o{ NOTIFICATION : has
  TRADE_CASE ||--o{ AUDIT_EVENT : has
  TRADE_CASE ||--o{ CLOSEOUT_PACK : generates


⸻

Prisma model definitions (described, not full schema)

1) Organization

Represents a legal or operational entity using the platform.

Key fields
	•	id
	•	name
	•	type or capability flags (buyer/supplier/internal)
	•	country
	•	registrationNumber (optional)
	•	verificationStatus
	•	verificationLevel
	•	createdAt, updatedAt

Notes

An organization may be:
	•	buyer-side
	•	supplier-side
	•	internal ops organization

Prefer flags or related profiles over rigid single-purpose enums if the business may evolve.

⸻

2) User

Represents a human user authenticated via Auth.js.

Key fields
	•	id
	•	name
	•	email
	•	emailVerified
	•	image (optional)
	•	createdAt, updatedAt

Notes

Auth.js adapter tables may include:
	•	Account
	•	Session
	•	VerificationToken

If using Prisma adapter, keep those models aligned with Auth.js expectations.

⸻

3) Membership

Maps users to organizations with a role.

Key fields
	•	id
	•	userId
	•	organizationId
	•	role (BUYER, SUPPLIER, OPS)
	•	status (ACTIVE, INVITED, DISABLED)
	•	createdAt, updatedAt

Constraints
	•	unique on (userId, organizationId)

Notes

This is the backbone of authorization and must not be skipped.

⸻

4) RFQ

Structured intake request from a buyer organization.

Key fields
	•	id
	•	buyerOrganizationId
	•	createdByUserId
	•	status
	•	commodity
	•	volume
	•	unit
	•	destination
	•	incoterm (optional)
	•	timeline (optional free text or structured date range)
	•	notes
	•	aiSummary (optional)
	•	createdAt, updatedAt

Notes

RFQ should store both:
	•	structured fields
	•	optional raw notes / user-provided text

AI suggestions should not overwrite core fields without explicit user action.

⸻

5) RFQAttachment

Metadata for files attached to RFQs.

Key fields
	•	id
	•	rfqId
	•	fileKey
	•	originalName
	•	mimeType
	•	sizeBytes
	•	uploadedByUserId
	•	createdAt

⸻

6) Quote

Commercial and execution response to an RFQ.

Key fields
	•	id
	•	rfqId
	•	createdByUserId
	•	status
	•	currency
	•	serviceFeeAmount
	•	brokerCommissionAmount (optional)
	•	leadTimeDays
	•	qcPlan
	•	docPlan
	•	terms
	•	expiresAt
	•	acceptedAt (optional)
	•	createdAt, updatedAt

Notes

A single RFQ may have multiple Quotes over time if revisions are modeled as separate rows. That is preferable to destructive overwrites.

⸻

7) TradeCase

The core execution record created from an accepted Quote.

Key fields
	•	id
	•	quoteId
	•	rfqId
	•	buyerOrganizationId
	•	assignedOpsUserId (optional initially)
	•	status
	•	referenceCode (human-readable case code)
	•	commodity
	•	routeSummary (optional)
	•	expectedShipDate (optional)
	•	completedAt (optional)
	•	createdAt, updatedAt

Constraints
	•	unique on quoteId if one Quote can only create one Trade Case

Notes

Denormalizing a few headline fields from RFQ/Quote into TradeCase is acceptable if it improves reporting and snapshot integrity.

⸻

8) Lot

Represents a supplier-side commodity batch/lot.

Key fields
	•	id
	•	supplierOrganizationId
	•	commodity
	•	origin
	•	grade
	•	batchNumber
	•	availableQuantity
	•	unit
	•	storageNotes
	•	createdByUserId
	•	createdAt, updatedAt

Notes

A lot may exist before or after a Trade Case is created.

⸻

9) LotAllocation

Connects a Lot to a Trade Case.

Key fields
	•	id
	•	tradeCaseId
	•	lotId
	•	supplierOrganizationId
	•	quantityAllocated
	•	unit
	•	notes
	•	createdAt

Constraints
	•	consider uniqueness on (tradeCaseId, lotId) if one lot is only allocated once per case

⸻

10) Milestone

Represents one workflow step in a Trade Case.

Key fields
	•	id
	•	tradeCaseId
	•	templateKey (optional)
	•	name
	•	sequence
	•	status
	•	ownerUserId (optional)
	•	dueDate (optional)
	•	completedAt (optional)
	•	blockedReason (optional)
	•	createdAt, updatedAt

Constraints
	•	unique on (tradeCaseId, sequence) preferred

Notes

Milestones should be materialized per case rather than generated on the fly from templates.

⸻

11) Document

Represents a required or uploaded case document.

Key fields
	•	id
	•	tradeCaseId
	•	documentType
	•	status
	•	required (boolean)
	•	fileKey
	•	originalName
	•	mimeType
	•	sizeBytes
	•	issuedBy (optional)
	•	issuedAt (optional)
	•	uploadedByUserId (optional)
	•	uploadedByOrganizationId (optional)
	•	createdAt, updatedAt

Notes

Document status is the current operational state. Historical review actions belong in DocumentReview.

⸻

12) DocumentReview

Immutable review history for a document.

Key fields
	•	id
	•	documentId
	•	reviewedByUserId
	•	action (APPROVED, REJECTED)
	•	reason or note
	•	createdAt

Notes

This preserves review history even when a document’s current status changes.

⸻

13) Inspection

Represents a recorded inspection event.

Key fields
	•	id
	•	tradeCaseId
	•	lotId (optional but recommended)
	•	provider
	•	scheduledAt
	•	completedAt
	•	result (PASS, FAIL, INCONCLUSIVE)
	•	notes
	•	attachmentsJson or separate child table if multiple structured files are needed
	•	createdByUserId
	•	createdAt, updatedAt

Notes

If inspection evidence needs rich metadata, model a separate InspectionAttachment.

⸻

14) Issue

Tracks operational issues, disputes, or exceptions.

Key fields
	•	id
	•	tradeCaseId
	•	type
	•	severity
	•	status
	•	description
	•	resolutionNotes
	•	ownerUserId (optional)
	•	createdByUserId
	•	createdAt, updatedAt
	•	resolvedAt (optional)

⸻

15) Message

Case-level communication record.

Key fields
	•	id
	•	tradeCaseId (or rfqId optionally if needed pre-case)
	•	authorUserId
	•	visibility (INTERNAL, SHARED)
	•	body
	•	createdAt

Notes

If pre-case RFQ clarifications are required, either:
	•	allow nullable tradeCaseId and optional rfqId, or
	•	create a separate RfqMessage model

For Phase 1 simplicity, a generic Message with either rfqId or tradeCaseId is acceptable if properly constrained.

⸻

16) Notification

User-facing event notification.

Key fields
	•	id
	•	recipientUserId
	•	organizationId
	•	tradeCaseId (optional)
	•	rfqId (optional)
	•	type
	•	payloadJson
	•	readAt (optional)
	•	createdAt

Notes

This model supports in-app notifications. Email delivery can be layered later.

⸻

17) AuditEvent

Immutable business audit log.

Key fields
	•	id
	•	actorUserId (optional if system-triggered)
	•	actorOrganizationId (optional)
	•	entityType
	•	entityId
	•	action
	•	beforeJson (optional)
	•	afterJson (optional)
	•	tradeCaseId (optional)
	•	createdAt

Notes

AuditEvent should be append-only.

⸻

18) CloseoutPack

Represents a generated close-out bundle.

Key fields
	•	id
	•	tradeCaseId
	•	status
	•	fileKey
	•	summaryFileKey (optional)
	•	generatedByUserId
	•	generatedAt
	•	notes (optional)

Notes

Allow multiple generations for retries/versioning, but one should be marked current/final if needed.

⸻

19) AiRun (optional but recommended)

Tracks AI feature usage and outcomes.

Key fields
	•	id
	•	feature
	•	userId
	•	organizationId
	•	tradeCaseId / rfqId (optional)
	•	provider
	•	model
	•	inputSize
	•	outputSize
	•	latencyMs
	•	costEstimate
	•	status
	•	errorType (optional)
	•	createdAt

Notes

Useful even if AI remains optional.

⸻

Suggested enums

Use Prisma enums where operational state must be tightly controlled.

Suggested enums
	•	MembershipRole
	•	MembershipStatus
	•	OrganizationVerificationStatus
	•	OrganizationVerificationLevel
	•	RfqStatus
	•	QuoteStatus
	•	TradeCaseStatus
	•	MilestoneStatus
	•	DocumentStatus
	•	DocumentReviewAction
	•	InspectionResult
	•	IssueStatus
	•	IssueSeverity
	•	MessageVisibility
	•	CloseoutPackStatus
	•	AiRunStatus

Using enums avoids string drift and makes API validation simpler.

⸻

Indexing strategy

Indexes should support:
	•	dashboards
	•	queue views
	•	authorization filters
	•	timeline/detail pages
	•	reporting
	•	optional retrieval

Core indexes

Organization / membership
	•	Membership(userId, status)
	•	for login/session org resolution
	•	unique Membership(userId, organizationId)

RFQ
	•	RFQ(buyerOrganizationId, status, createdAt desc)
	•	for buyer dashboards
	•	RFQ(createdByUserId, createdAt desc)
	•	for user-level activity

Quote
	•	Quote(rfqId, createdAt desc)
	•	for quote history
	•	Quote(status, expiresAt)
	•	for operational follow-up

TradeCase
	•	TradeCase(buyerOrganizationId, status, createdAt desc)
	•	buyer-facing cases
	•	TradeCase(assignedOpsUserId, status, updatedAt desc)
	•	ops work queues
	•	unique TradeCase(quoteId)

Lot / allocation
	•	Lot(supplierOrganizationId, commodity, createdAt desc)
	•	LotAllocation(tradeCaseId)
	•	LotAllocation(supplierOrganizationId)

Milestone
	•	Milestone(tradeCaseId, sequence)
	•	Milestone(status, dueDate)
	•	for overdue/at-risk reporting

Document
	•	Document(tradeCaseId, documentType, status)
	•	Document(status, updatedAt desc)
	•	for review queues

DocumentReview
	•	DocumentReview(documentId, createdAt desc)

Inspection
	•	Inspection(tradeCaseId, completedAt desc)
	•	Inspection(result, completedAt desc)

Issue
	•	Issue(tradeCaseId, status, createdAt desc)
	•	Issue(ownerUserId, status)

Notification
	•	Notification(recipientUserId, readAt, createdAt desc)

AuditEvent
	•	AuditEvent(entityType, entityId, createdAt desc)
	•	AuditEvent(tradeCaseId, createdAt desc)

Why these indexes

These indexes reflect actual product reads:
	•	“show my active cases”
	•	“show pending documents”
	•	“show milestone backlog”
	•	“show latest audit activity for this case”
	•	“show unread notifications”

Avoid over-indexing early. Measure before adding more.

⸻

Migration strategy

General principle

Use Prisma migrations for all schema changes. Do not rely on db push in shared or production environments.

Development workflow

Typical flow:
	1.	update apps/web/prisma/schema.prisma
	2.	run migration create/apply
	3.	regenerate Prisma client
	4.	run tests
	5.	commit migration files

Suggested commands:

cd apps/web
npx prisma format
npx prisma validate
npx prisma migrate dev --name init_phase1_data_model
npx prisma generate

Production workflow

In production:
	•	migrations should be reviewed
	•	applied in controlled CI/CD or release step
	•	never generated live in production

Suggested approach:

cd apps/web
npx prisma migrate deploy
npx prisma generate

Migration safety rules
	•	avoid destructive renames without data migration planning
	•	add nullable fields first if backfilling is required
	•	use explicit data migration scripts for enum/state transitions where needed
	•	test migration against representative seed data before deploy

Recommended follow-up sequence
	1.	initial schema models + enums
	2.	auth adapter models
	3.	core indexes
	4.	seed data
	5.	optional AI models
	6.	optional pgvector migration

⸻

Optional vector strategy

Use only if Phase 1 retrieval is actually needed.

What content should be embedded

Embed only internal guidance/reference content, such as:
	•	SOPs
	•	document requirement guides
	•	template notes
	•	milestone playbooks
	•	commodity handling reference notes

Do not embed live transactional source-of-truth rows like RFQs, Quotes, or current TradeCase state unless a specific retrieval use case is later justified.

Storage approach

Two main options:

Option A — pgvector in same database

Recommended if retrieval remains small and internal.
	•	add vector column to KnowledgeChunk
	•	store metadata in same row
	•	query via cosine or inner-product similarity

Option B — defer vectors

If Phase 1 doesn’t need retrieval yet, defer entirely.

Suggested KnowledgeChunk model

Fields:
	•	id
	•	sourceType
	•	sourcePath
	•	title
	•	sectionHeading
	•	content
	•	contentHash
	•	updatedAt
	•	embedding (vector, if pgvector enabled)
	•	metadataJson

Retrieval flow
	1.	internal question submitted
	2.	query embedded
	3.	top-k chunks retrieved from KnowledgeChunk
	4.	chunks filtered by freshness/source
	5.	chunks passed to AI prompt
	6.	answer returned with source references

Cost notes
	•	embedding costs are generally low but not free
	•	most cost in Phase 1 will come from generation, not embeddings
	•	re-embed only when source content changes
	•	avoid embedding duplicate/near-duplicate docs

⸻

Data lifecycle

Retention

Phase 1 default recommendations:
	•	RFQs, Quotes, TradeCases, Milestones, Issues, Documents metadata: retain indefinitely until policy says otherwise
	•	Notifications: retain at least 12 months, archiveable later
	•	AuditEvents: retain indefinitely or according to compliance policy
	•	AiRun logs: retain with redaction and budget awareness, e.g. 90–180 days unless policy requires otherwise

Deletion

Phase 1 should prefer soft operational disablement over hard deletion for critical business entities.

Hard delete acceptable for:
	•	draft RFQs (if allowed by business)
	•	test/seed data in non-production

Hard delete should be avoided for:
	•	accepted Quotes
	•	TradeCases
	•	approved Documents metadata
	•	AuditEvents

If deletion is needed later, introduce:
	•	deletedAt
	•	deletedByUserId

Privacy considerations
	•	store only necessary user/org identifying information
	•	never store raw file contents in Postgres
	•	signed URLs should be short-lived
	•	sensitive free text in AI logs should be minimized or redacted
	•	document metadata should not expose secrets or confidential storage paths in user-facing APIs

⸻

Seed / dev data strategy

A Phase 1 dev environment should be able to demonstrate all major flows.

Recommended seed set

Organizations
	•	1 internal ops organization
	•	1 buyer organization
	•	2 supplier organizations

Users
	•	1 Ops user
	•	1 Buyer user
	•	2 Supplier users

Business records
	•	2 RFQs
	•	2 Quotes (1 draft, 1 sent)
	•	1 accepted Quote with active TradeCase
	•	1 TradeCase with:
	•	milestones in mixed statuses
	•	3 required documents (approved, uploaded, rejected)
	•	1 inspection
	•	1 issue
	•	3 notifications
	•	several audit events

Optional AI seed
	•	a few AiRun rows
	•	a few KnowledgeChunk rows if retrieval is enabled

Seed goals

Seed data should support:
	•	dashboard screenshots
	•	demo script execution
	•	user journey walkthroughs
	•	API contract testing
	•	UI state testing (empty/loading/error can still be mocked separately)

Suggested commands

If supported:

cd apps/web
npx prisma db seed


⸻

Data integrity and business rules

Recommended application-level invariants

These are enforced by API/service logic, not just schema:
	•	only one TradeCase may be created from one accepted Quote
	•	Quote must be SENT before acceptance
	•	Document must be UPLOADED before approval/rejection
	•	required documents must be approved before successful close-out
	•	failed inspection should block relevant milestone and create/update an Issue
	•	Membership must be active for user access

Recommended database-level constraints

Use DB constraints where appropriate:
	•	unique membership per user-org
	•	unique tradecase per quote
	•	non-null foreign keys for core relationships
	•	enum-backed statuses
	•	reasonable string length limits where supported by Prisma/Postgres conventions

⸻

Implementation notes for Prisma

Suggested schema grouping

Organize models in schema.prisma with comment sections:
	•	auth
	•	org/access
	•	intake/commercial
	•	execution
	•	evidence
	•	communication/control
	•	ai/retrieval (optional)

Naming conventions
	•	singular Prisma model names
	•	camelCase fields
	•	explicit relation names when ambiguity exists
	•	timestamps on all mutable business entities

Recommended standard fields

Most business models should include:
	•	id
	•	createdAt
	•	updatedAt

Immutable event models may use only:
	•	id
	•	createdAt

⸻

Verification steps

Review checklist
	•	confirm every Phase 1 feature has a backing entity or relationship
	•	confirm all user-visible records are org-scoped
	•	confirm statuses use enums rather than free text
	•	confirm object storage is used for files, not DB blobs
	•	confirm indexing strategy matches dashboard and queue needs
	•	confirm optional AI/vector tables do not complicate core schema unnecessarily

If schema exists

Run:

cd apps/web
npx prisma format
npx prisma validate
npx prisma generate

If migrations exist and local DB is available:

cd apps/web
npx prisma migrate status
npx prisma migrate dev

If no schema exists yet

The repo should support these commands once Prisma is wired in:

cd apps/web
npx prisma init
npx prisma format
npx prisma validate
npx prisma migrate dev --name init_phase1_data_model
npx prisma generate

Additional validation
	•	review generated migration SQL before merge
	•	seed the DB and verify dashboards/API flows work with sample data
	•	confirm no missing foreign keys for core workflows
	•	confirm unique constraints behave as expected in tests

⸻

Committable files
	•	Filename/path: docs/phase-1/06-data-model.md
	•	Branch: phase-1/data-model-spec
	•	Commit message: docs: add Phase 1 data model spec
	•	PR title: Phase 1: Add data model specification

Suggested follow-up PR

After this doc lands, the next implementation PR should:
	1.	create/update apps/web/prisma/schema.prisma
	2.	add initial Prisma migrations
	3.	add seed data
	4.	generate Prisma client
	5.	add schema validation to CI

