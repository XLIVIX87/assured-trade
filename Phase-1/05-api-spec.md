---
id: phase1-api-spec-uk-commodity-gateway
title: "Phase 1 API Specification — <APP_NAME> (Next.js Route Handlers)"
status: draft
owner: Product + Engineering Lead
last_updated: 2026-03-24
related_docs:
  - docs/phase-1/00-project-brief.md
  - docs/phase-1/01-prd.md
  - docs/phase-1/02-user-journeys.md
  - docs/phase-1/03-acceptance-criteria.md
  - docs/phase-1/04-ui-spec.md
---

# API design principles

## Architectural style
Phase 1 APIs are implemented as **Next.js Route Handlers** under `apps/web/app/api/**/route.ts`. The API is:
- session-authenticated
- role-aware
- organization-scoped
- JSON-first
- deterministic by default, with optional AI-assisted endpoints clearly separated

The API is not public. It is designed for the app’s own frontend and internal admin workflows.

## Versioning
Phase 1 does **not** introduce URL versioning (`/v1`) unless needed by deployment constraints. Versioning will be managed by:
- repository history
- schema evolution via Prisma migrations
- backwards-compatible response changes where possible

If breaking changes become necessary, Phase 2 may introduce `/api/v1/*`.

## Naming rules
- Use plural nouns for collections: `/api/rfqs`, `/api/quotes`, `/api/documents`
- Use nested routes only where scoping is meaningful: `/api/tradecases/:id/documents`
- Use action-style subpaths only for state transitions or non-CRUD mutations:
  - `/api/quotes/:id/send`
  - `/api/quotes/:id/accept`
  - `/api/documents/:id/approve`
  - `/api/documents/:id/reject`
  - `/api/tradecases/:id/closeout`

## Response model
All successful JSON responses should follow a consistent envelope:

```json
{
  "data": {},
  "meta": {
    "requestId": "req_123",
    "timestamp": "2026-03-24T12:00:00Z"
  }
}

Error responses should follow:

{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Missing required field: commodity",
    "details": {
      "field": "commodity"
    }
  },
  "meta": {
    "requestId": "req_123",
    "timestamp": "2026-03-24T12:00:00Z"
  }
}

Error model

Use consistent error categories:
	•	UNAUTHENTICATED → 401
	•	FORBIDDEN → 403
	•	NOT_FOUND → 404
	•	VALIDATION_ERROR → 400
	•	CONFLICT → 409
	•	RATE_LIMITED → 429
	•	PAYLOAD_TOO_LARGE → 413
	•	INTERNAL_ERROR → 500
	•	DEPENDENCY_ERROR → 502/503 where relevant

Idempotency

The following operations should be implemented defensively to avoid duplicate state changes:
	•	quote acceptance
	•	close-out generation
	•	document approval/rejection
	•	milestone update where status has already advanced

⸻

Auth model

Authentication

Use Auth.js session-based authentication. Every protected Route Handler must:
	1.	verify session
	2.	resolve active user
	3.	resolve organization membership + role
	4.	enforce org scoping and role-based access

Roles

Phase 1 roles:
	•	BUYER
	•	SUPPLIER
	•	OPS

Access model summary

Role	Can access
Buyer	Their org’s RFQs, Quotes, TradeCases, shared Documents, Notifications
Supplier	Assigned TradeCases, uploaded/shared Documents, their onboarding/profile info
Ops	All RFQs, Quotes, TradeCases, Documents, Inspections, Issues, Templates, Analytics

Session requirements

All write endpoints require an authenticated session. Public access is not allowed in Phase 1.

Recommended utility guards:
	•	requireSession()
	•	requireRole(roles)
	•	requireOrgAccess(orgId | caseId | rfqId | quoteId)

Authorization rules

Examples:
	•	Buyer cannot approve documents
	•	Supplier cannot access another supplier’s assigned case
	•	Ops can reject a document but must provide a reason
	•	Buyer can accept only Quotes that belong to their org and are in SENT state

⸻

Endpoint catalogue

Conventions
	•	Request schemas below are concise and indicative; implementation should use Zod or equivalent server-side validation.
	•	Response schemas are summarized, not exhaustive Prisma model dumps.

Method	Path	Purpose	Auth required	Request schema	Response schema	Status codes	Errors
GET	/api/rfqs	List RFQs for current user/org/role	Yes	Query: status?, page?, pageSize?	RFQ list	200	401, 403
POST	/api/rfqs	Create RFQ	Yes (Buyer)	commodity, volume, destination, incoterm?, notes?, attachments?	RFQ	201	400, 401, 403
GET	/api/rfqs/:id	Get RFQ detail	Yes	Path param	RFQ detail	200	401, 403, 404
PATCH	/api/rfqs/:id	Update draft/in-review RFQ	Yes (Buyer/Ops scoped)	Partial RFQ fields	RFQ	200	400, 401, 403, 404, 409
GET	/api/quotes	List Quotes	Yes	Query: status?, page?	Quote list	200	401, 403
POST	/api/quotes	Create Quote draft from RFQ	Yes (Ops)	rfqId, fees, leadTimeDays, qcPlan, docPlan, terms, expiresAt	Quote	201	400, 401, 403, 404
POST	/api/quotes/:id/send	Send Quote to Buyer	Yes (Ops)	none or message?	Quote	200	401, 403, 404, 409
GET	/api/quotes/:id	Get Quote detail	Yes	Path param	Quote detail	200	401, 403, 404
POST	/api/quotes/:id/accept	Accept Quote and create TradeCase	Yes (Buyer)	none	Quote + TradeCase summary	200	401, 403, 404, 409
GET	/api/tradecases	List TradeCases	Yes	Query: status?, page?, assigned?	TradeCase list	200	401, 403
GET	/api/tradecases/:id	Get TradeCase detail	Yes	Path param	TradeCase detail	200	401, 403, 404
PATCH	/api/tradecases/:id	Update TradeCase metadata	Yes (Ops)	status?, notes?, route?, expectedShipDate?	TradeCase	200	400, 401, 403, 404
POST	/api/tradecases/:id/assign-supplier	Assign Supplier to case	Yes (Ops)	supplierOrgId, notes?	Assignment summary	200	400, 401, 403, 404, 409
POST	/api/lots	Create Lot	Yes (Supplier/Ops)	commodity, origin, grade?, batchNumber?, quantity, photos?	Lot	201	400, 401, 403
POST	/api/tradecases/:id/lot-allocations	Allocate Lot to case	Yes (Ops)	lotId, quantityAllocated, supplierOrgId	Lot allocation	201	400, 401, 403, 404, 409
GET	/api/tradecases/:id/documents	List case documents	Yes	Query optional filters	Document list	200	401, 403, 404
POST	/api/tradecases/:id/documents	Register uploaded document metadata	Yes (Supplier/Ops)	fileKey, originalName, mimeType, size, documentType, issuedBy?, issuedAt?	Document	201	400, 401, 403, 404, 413
POST	/api/documents/:id/approve	Approve document	Yes (Ops)	reviewNote?	Document	200	400, 401, 403, 404, 409
POST	/api/documents/:id/reject	Reject document	Yes (Ops)	reason	Document	200	400, 401, 403, 404, 409
POST	/api/inspections	Record inspection	Yes (Ops)	tradeCaseId, lotId?, provider, scheduledAt?, completedAt?, result, notes?, attachments?	Inspection	201	400, 401, 403, 404
PATCH	/api/milestones/:id	Update milestone status/owner/due date	Yes (Ops)	status?, ownerUserId?, dueDate?, blockedReason?	Milestone	200	400, 401, 403, 404, 409
GET	/api/issues	List issues	Yes	Query: tradeCaseId?, status?	Issue list	200	401, 403
POST	/api/issues	Create issue/dispute	Yes (Ops, optionally Supplier)	tradeCaseId, type, severity, description	Issue	201	400, 401, 403, 404
PATCH	/api/issues/:id	Update issue	Yes (Ops)	status?, resolutionNotes?, ownerUserId?	Issue	200	400, 401, 403, 404
GET	/api/notifications	List notifications	Yes	Query: unreadOnly?	Notification list	200	401
POST	/api/notifications/:id/read	Mark notification read	Yes	none	Notification	200	401, 403, 404
POST	/api/ai/rfq-normalize	AI-assisted RFQ parsing	Yes (Buyer/Ops)	text, optional commodityHint?	Parsed suggestions	200	400, 401, 403, 429, 500
POST	/api/tradecases/:id/closeout	Generate close-out pack	Yes (Ops)	optional includeSummaryPdf?	Close-out pack summary	200	400, 401, 403, 404, 409, 500


⸻

Request and response schemas (concise)

RFQ create request

{
  "commodity": "sesame",
  "volume": 50,
  "unit": "MT",
  "destination": "Felixstowe, UK",
  "incoterm": "CIF",
  "notes": "Need food-grade export lot",
  "attachments": [
    {
      "fileKey": "uploads/rfq/spec-123.pdf",
      "originalName": "buyer-spec.pdf"
    }
  ]
}

RFQ response

{
  "data": {
    "id": "rfq_123",
    "status": "SUBMITTED",
    "commodity": "sesame",
    "volume": 50,
    "unit": "MT",
    "destination": "Felixstowe, UK"
  },
  "meta": {
    "requestId": "req_123",
    "timestamp": "2026-03-24T12:00:00Z"
  }
}

Quote create request

{
  "rfqId": "rfq_123",
  "fees": {
    "serviceFee": 2500,
    "currency": "GBP"
  },
  "leadTimeDays": 21,
  "qcPlan": "SGS pre-shipment inspection",
  "docPlan": "COO, COA, phyto, packing list, BL",
  "terms": "Subject to lot availability and doc approval",
  "expiresAt": "2026-04-05T23:59:59Z"
}

Quote accept response

{
  "data": {
    "quoteId": "quote_123",
    "quoteStatus": "ACCEPTED",
    "tradeCase": {
      "id": "case_123",
      "status": "ACTIVE",
      "milestoneCount": 10,
      "documentChecklistCount": 7
    }
  },
  "meta": {
    "requestId": "req_123",
    "timestamp": "2026-03-24T12:00:00Z"
  }
}

Document upload metadata request

{
  "fileKey": "documents/case_123/coa-v1.pdf",
  "originalName": "coa.pdf",
  "mimeType": "application/pdf",
  "size": 245332,
  "documentType": "COA",
  "issuedBy": "Lab A",
  "issuedAt": "2026-03-24"
}

Document reject request

{
  "reason": "Issuer stamp missing on page 2"
}

AI RFQ normalize request

{
  "text": "We need 50 metric tonnes of export sesame to Felixstowe, moisture below 8%, shipped in 3 weeks."
}

AI RFQ normalize response

{
  "data": {
    "suggestedFields": {
      "commodity": "sesame",
      "volume": 50,
      "unit": "MT",
      "destination": "Felixstowe, UK"
    },
    "clarifyingQuestions": [
      "Please confirm Incoterm",
      "Please confirm packaging format"
    ],
    "summary": "Likely sesame RFQ with moisture threshold and 3-week timeline."
  },
  "meta": {
    "requestId": "req_123",
    "timestamp": "2026-03-24T12:00:00Z"
  }
}


⸻

Validation rules

General rules

All write endpoints must validate:
	•	content type
	•	authenticated user
	•	org scope
	•	required fields
	•	enum values
	•	payload size
	•	business state transition validity

Use server-side schema validation (recommended: Zod).

Input limits

Recommended Phase 1 limits:
	•	notes / free text fields: max 5,000 chars
	•	AI input text: max 10,000 chars
	•	file metadata registration: reject if size > 50MB
	•	pagination:
	•	default pageSize = 20
	•	max pageSize = 100

State transition validation

Examples:
	•	Quote can only be accepted if status is SENT
	•	Document can only be approved/rejected if status is UPLOADED
	•	Close-out can only complete if required documents are approved
	•	Milestone cannot move from DONE back to NOT_STARTED without Ops override rule (if implemented later)

File validation
	•	allow only approved MIME types for Phase 1 (e.g. PDF, PNG, JPG, DOCX if required)
	•	reject executable or archive uploads unless explicitly supported
	•	separate upload transport from document registration if using presigned upload URLs

AI endpoint validation
	•	require non-empty text
	•	cap token/input size
	•	strip control characters
	•	validate model output against schema before returning
	•	do not auto-persist AI output without explicit user confirmation

⸻

Rate limiting / abuse controls

Default controls

Apply rate limiting at Route Handler or middleware layer for sensitive endpoints.

Suggested Phase 1 limits
	•	RFQ creation: 10 requests/hour/user
	•	Quote acceptance: 20 requests/hour/user
	•	Document uploads metadata registration: 30 requests/hour/user
	•	AI normalization endpoint: 20 requests/day/user and 100/day/org
	•	Close-out generation: 5 requests/hour/case

Abuse prevention
	•	reject repeated duplicate submissions within a short window where appropriate
	•	log repeated 401/403/429 patterns
	•	throttle AI endpoints aggressively
	•	reject oversized payloads early
	•	require session for all endpoints
	•	consider CSRF protections consistent with Auth.js/session setup

AI-specific abuse controls
	•	per-user and per-org budgets
	•	timeout caps on model calls
	•	no direct model output rendering without sanitization
	•	prompt injection resistance: treat user text as data, not instructions to change system behavior

⸻

Observability

What to log

Log structured events for:
	•	request start / request end
	•	auth failures
	•	authorization failures
	•	validation failures
	•	state transitions
	•	file registration
	•	document approval/rejection
	•	quote acceptance
	•	close-out generation attempts
	•	AI endpoint usage, latency, failure mode

What NOT to log

Do not log:
	•	raw secrets
	•	session tokens
	•	full signed URLs
	•	full sensitive document contents
	•	raw AI prompts/responses if they may contain sensitive buyer data, unless redacted and policy-approved

Correlation IDs

Every request should include or generate a requestId.
Recommended behavior:
	•	accept inbound x-request-id if present and trusted
	•	otherwise generate one
	•	return it in response metadata
	•	include it in logs and downstream calls

Audit vs operational logging
	•	AuditEvent = business-level append-only record for important actions
	•	request/application logs = operational debugging/monitoring

Both should exist and not be conflated.

⸻

Proposed implementation mapping

Below is the proposed file layout under apps/web/app/api/**.

RFQs
	•	apps/web/app/api/rfqs/route.ts
	•	apps/web/app/api/rfqs/[id]/route.ts

Quotes
	•	apps/web/app/api/quotes/route.ts
	•	apps/web/app/api/quotes/[id]/route.ts
	•	apps/web/app/api/quotes/[id]/send/route.ts
	•	apps/web/app/api/quotes/[id]/accept/route.ts

TradeCases
	•	apps/web/app/api/tradecases/route.ts
	•	apps/web/app/api/tradecases/[id]/route.ts
	•	apps/web/app/api/tradecases/[id]/assign-supplier/route.ts
	•	apps/web/app/api/tradecases/[id]/documents/route.ts
	•	apps/web/app/api/tradecases/[id]/lot-allocations/route.ts
	•	apps/web/app/api/tradecases/[id]/closeout/route.ts

Lots
	•	apps/web/app/api/lots/route.ts

Documents
	•	apps/web/app/api/documents/[id]/approve/route.ts
	•	apps/web/app/api/documents/[id]/reject/route.ts

Inspections
	•	apps/web/app/api/inspections/route.ts

Milestones
	•	apps/web/app/api/milestones/[id]/route.ts

Issues
	•	apps/web/app/api/issues/route.ts
	•	apps/web/app/api/issues/[id]/route.ts

Notifications
	•	apps/web/app/api/notifications/route.ts
	•	apps/web/app/api/notifications/[id]/read/route.ts

AI
	•	apps/web/app/api/ai/rfq-normalize/route.ts

⸻

Implementation notes for Route Handlers

Suggested internal structure

Each Route Handler should:
	1.	resolve session
	2.	validate request body/query/path params
	3.	load target entity with org scoping
	4.	enforce role + business rule
	5.	execute Prisma transaction if multi-step mutation
	6.	emit AuditEvent / Notification records as needed
	7.	return normalized response envelope

Recommended helper modules

Suggested internal modules:
	•	apps/web/lib/auth/
	•	apps/web/lib/rbac/
	•	apps/web/lib/validation/
	•	apps/web/lib/api/response.ts
	•	apps/web/lib/api/errors.ts
	•	apps/web/lib/audit/
	•	apps/web/lib/rate-limit/
	•	apps/web/lib/observability/

Transactions

Use Prisma transactions for:
	•	quote acceptance → create TradeCase + Milestones + Document checklist
	•	document rejection/approval + audit event + notification
	•	close-out generation metadata updates

⸻

Proposed contract tests

Critical integration/contract tests

At minimum, define tests for:
	1.	RFQ creation
	•	Buyer authenticated
	•	valid payload creates RFQ
	•	invalid payload returns 400
	2.	Quote acceptance
	•	only Buyer of same org can accept
	•	only SENT quote can be accepted
	•	TradeCase + milestones + checklist created
	3.	Document approval/rejection
	•	only Ops can approve/reject
	•	reject requires reason
	•	audit + notification created
	4.	Auth/RBAC
	•	Supplier cannot access foreign case
	•	Buyer cannot approve document
	•	unauthenticated request returns 401
	5.	Close-out
	•	fails when required docs missing
	•	succeeds when checklist complete
	•	second trigger is idempotent / conflict-safe
	6.	AI normalization
	•	valid text returns structured suggestions
	•	malformed or oversized input rejected
	•	rate limit returns 429
	•	no auto-persist side effects

Suggested test layers
	•	Unit: validation schemas, state transition guards
	•	Integration: Route Handlers + Prisma test DB
	•	E2E: browser flow for RFQ → Quote → Case → Document → Close-out

⸻

Verification steps

Review checklist
	•	endpoint list matches PRD scope
	•	auth model matches Buyer / Supplier / Ops roles
	•	action endpoints are explicit and minimal
	•	validation limits are defined
	•	AI endpoint is clearly separated and rate-limited
	•	logs avoid secrets and signed URL leakage

Proposed contract test review
	•	confirm every MUST feature has at least one endpoint
	•	confirm every critical mutation has at least one negative case
	•	confirm state transition rules are enforced at API layer, not only UI

Commands to run (if repo exists)

From repo root:
	•	npm run lint
	•	npm test --if-present
	•	npm run build
	•	docker compose up --build

If API tests exist:
	•	npm run test:unit
	•	npm run test:integration
	•	npm run test:e2e

Evidence to capture
	•	API test output
	•	sample request/response logs with redaction
	•	screenshot of PR diff for docs/phase-1/05-api-spec.md
	•	optional screen recording of one happy-path API flow via UI

⸻

Committable files
	•	Filename/path: docs/phase-1/05-api-spec.md
	•	Branch: phase-1/api-spec
	•	Commit message: docs: add Phase 1 API spec
	•	PR title: Phase 1: Add API specification

