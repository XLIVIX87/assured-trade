---
id: phase1-user-journeys-uk-commodity-gateway
title: "Phase 1 User Journeys — <APP_NAME> (Assured Trade Deal Desk)"
status: draft
owner: Product + Engineering Lead
last_updated: 2026-03-24
related_docs:
  - docs/phase-1/00-project-brief.md
  - docs/phase-1/01-prd.md
  - docs/phase-1/04-ui-spec.md (to be created)
  - <STITCH_LINK_OR_TBD>
---

# Journey map overview

Phase 1 user journeys are centered around a **controlled, evidence-driven Trade Case lifecycle**, where each action is governed by clear states, approvals, and auditability. The system prioritizes **clarity, recoverability, and accountability**, ensuring that every failure state has a defined recovery path and every action is traceable. The journeys below are structured for direct implementation with explicit UI states, API touchpoints, failure modes, and recovery strategies.

---

# Journey table (overview)

| Journey | Trigger | Steps | System Responses | Errors | Recovery | Data Touched |
|--------|--------|------|------------------|--------|----------|-------------|
| 1. Happy Path | Buyer submits RFQ | RFQ → Quote → Accept → Case → Docs → Inspection → Close-out | Create/update entities, notifications, audit logs | Validation, rejection, blocked milestone | Re-submit, re-upload, re-inspect | RFQ, Quote, Case, Docs, Inspection |
| 2. Auth Edge Case | Session expired | Attempt action → auth fail → login → retry | 401/403 responses | Expired session | Re-authenticate, restore state | User, Session |
| 3. AI Flow | Buyer inputs free-text RFQ | AI parse → stream → confirm → continue | Stream suggestions | Timeout, rate limit | Retry, fallback | RFQ.ai_summary |
| 4. Document Rejection Loop | Ops rejects document | Upload → reject → fix → re-upload → approve | Status updates, notifications | Repeated rejection | Iterative correction | Document, Audit |
| 5. Milestone Delay | Milestone overdue | Detect delay → notify → escalate | Alert generated | No action taken | Escalation or reassignment | Milestone, Notification |

---

# Journey 1 — Happy Path (End-to-End Trade Execution)

## Trigger
Buyer submits RFQ.

## Steps

### 1. RFQ Creation
- UI: `/dashboard/rfqs/new`
- UI States:
  - loading → empty → submitting → success
- API:
  - `POST /api/rfqs`
- System:
  - Create RFQ (status = SUBMITTED)
  - Log AuditEvent
  - Notify Ops

### Errors
- 400 validation error
- Network failure

### Recovery
- Inline error messages
- Preserve form state locally
- Retry submission

---

### 2. Quote Creation
- UI: `/ops/rfqs/:id/quote`
- API:
  - `POST /api/quotes`
  - `POST /api/quotes/:id/send`

### Errors
- Missing fields

### Recovery
- Validation feedback

---

### 3. Quote Acceptance
- UI: `/dashboard/quotes/:id`
- API:
  - `POST /api/quotes/:id/accept`
- System:
  - Create TradeCase
  - Generate milestones + checklist

---

### 4. Document Workflow
- UI: `/supplier/cases/:id`
- States:
  - loading → empty → uploading → success/error
- API:
  - `POST /api/tradecases/:id/documents`
  - `POST /api/documents/:id/approve`
  - `POST /api/documents/:id/reject`

### Errors
- File too large (413)
- Invalid format

### Recovery
- Retry upload
- Show constraints

---

### 5. Inspection
- API:
  - `POST /api/inspections`
- System:
  - Record inspection
  - If fail → block milestone + create issue

---

### 6. Close-out Pack
- API:
  - `POST /api/tradecases/:id/closeout`
- System:
  - Generate ZIP
  - Mark case COMPLETE

---

# Journey 2 — Auth / Session Edge Case

## Trigger
User performs action with expired session.

## Flow
- API returns 401/403
- UI state: error → redirect to login → success

## Recovery
- Restore previous state
- Retry action

---

# Journey 3 — AI RFQ Flow (Streaming)

## Trigger
Buyer pastes text.

## Flow
- API: `/api/ai/rfq-normalize`
- States:
  - loading → streaming → success → error

## Safety Controls
- Rate limiting
- Token limits
- Schema validation
- No auto-save
- Prompt injection defense

## Errors
- 429, timeout

## Recovery
- Retry
- Manual fallback

---

# Journey 4 — Document Rejection Loop

## Flow
1. Upload document
2. Ops rejects (with reason)
3. Supplier notified
4. Supplier re-uploads
5. Ops approves

## UI States
- error (rejected)
- loading
- success (approved)

## Recovery
- Iterative improvement
- Optional escalation

---

# Journey 5 — Milestone Delay & Escalation

## Trigger
Milestone overdue

## Flow
- System flags overdue
- Notify Ops + Buyer
- Escalate if unresolved

## Recovery
- Reassign owner
- Update due date

---

# Global UI State Requirements

Every screen must support:
- loading
- empty
- submitting
- success
- error

---

# API Touchpoints

- `/api/rfqs`
- `/api/quotes`
- `/api/tradecases`
- `/api/documents`
- `/api/inspections`
- `/api/milestones`
- `/api/issues`
- `/api/ai/*`

---

# Demo Script

1. Login as Buyer
2. Create RFQ
3. Login as Ops
4. Create Quote
5. Login as Buyer → accept
6. Login as Supplier → upload docs
7. Login as Ops → reject doc
8. Supplier fixes → re-upload
9. Ops approves
10. Add inspection
11. Complete milestones
12. Generate close-out

---

# Committable files

- docs/phase-1/02-user-journeys.md
- branch: phase-1/user-journeys-final
- commit: finalize user journeys
- PR: Phase 1 user journeys final

---

# Verification steps

## Review
- Failure paths defined
- UI states complete
- API endpoints mapped
- Recovery flows exist

## Commands
- npm run lint
- npm run build

## Artefacts
- Demo run
- PR diff