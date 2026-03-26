---
id: phase1-acceptance-criteria-uk-commodity-gateway
title: "Phase 1 Acceptance Criteria Pack — <APP_NAME> (Assured Trade Deal Desk)"
status: draft
owner: Product + Engineering Lead
last_updated: 2026-03-24
related_docs:
  - docs/phase-1/00-project-brief.md
  - docs/phase-1/01-prd.md
  - docs/phase-1/02-user-journeys.md
---

# Definition of Done (DoD)

A feature is complete only if:

## Code
- Fully implemented per AC IDs
- RBAC enforced in all APIs
- Prisma migrations included

## Tests
- Unit + Integration + E2E (critical flows)
- All tests pass

## UI
- loading / empty / submitting / success / error states implemented
- Form state preserved on failure

## Security
- No public file access
- Signed URLs enforced
- Rate limiting applied

## Observability
- AuditEvent logged for all key actions

## Documentation
- AC IDs referenced in PR
- Endpoints documented

---

# Acceptance Criteria

---

## AC-001 — RFQ Creation

**Given**
Buyer authenticated

**When**
RFQ submitted

**Then**
- RFQ created (status=SUBMITTED)
- Stored in DB
- Appears in dashboard
- AuditEvent logged

**Negative**
Missing fields → 400

**Verification**
Integration + E2E

**Evidence**
DB record, UI screenshot

---

## AC-002 — Quote Creation

**Given**
RFQ exists

**When**
Quote created and sent

**Then**
- Quote status=SENT
- Stored in DB
- Notification created

**Negative**
Missing terms → validation error

---

## AC-003 — Quote Acceptance

**Given**
Quote SENT

**When**
Accepted

**Then**
- Quote=ACCEPTED
- TradeCase created
- Milestones generated
- Document checklist generated

---

## AC-004 — Document Upload

**Given**
Supplier assigned

**When**
Upload document

**Then**
- Metadata stored in DB
- File stored in object storage
- Accessible via signed URL (200)
- Not accessible publicly (403)

**Negative**
Invalid file → reject

---

## AC-005 — Document Approval

**Then**
- Status=APPROVED
- Audit logged

**Negative**
Unauthorized → 403

---

## AC-006 — Document Rejection

**Then**
- Status=REJECTED
- Reason stored
- Notification created

---

## AC-007 — Inspection

**Then**
- Inspection stored
- Fail → milestone BLOCKED + issue created

---

## AC-008 — Milestone Update

**Then**
- Status updated
- Audit logged

---

## AC-009 — Close-out Pack

**Given**
Docs approved

**When**
Triggered

**Then**
- ZIP generated
- Stored
- Case COMPLETE

**Negative**
Missing docs → blocked

---

## AC-010 — Auth Enforcement

**Then**
- Unauthorized → 401/403

---

## AC-011 — AI RFQ Parsing

**Then**
- Structured suggestions returned
- No auto-save

**Negative**
429 rate limit

---

## AC-012 — Milestone Overdue

**Given**
Due date passed

**Then**
- Status=OVERDUE
- Notification sent

---

## AC-013 — Close-out Failure Retry

**Given**
Failure occurs

**Then**
- Case not complete
- Retry possible
- Idempotent behavior

---

## AC-014 — Notification Creation

**Then**
- Notification stored
- Visible in UI

---

## AC-015 — Template Generation

**Then**
- Milestones auto-created
- Document checklist auto-created

---

## AC-016 — AI Timeout Safety

**Then**
- Fallback response returned
- No data saved
- User prompted

---

# AC Mapping Table

| AC-ID | Feature | Test Type | Evidence |
|------|--------|----------|---------|
| AC-001 | RFQ | E2E | Screenshot |
| AC-002 | Quote | Integration | Logs |
| AC-003 | Case | E2E | DB |
| AC-004 | Upload | Integration | Storage |
| AC-005 | Approve | Integration | Audit |
| AC-006 | Reject | E2E | Notification |
| AC-007 | Inspection | Integration | DB |
| AC-008 | Milestone | Unit | Logs |
| AC-009 | Close-out | E2E | ZIP |
| AC-010 | Auth | Integration | API logs |
| AC-011 | AI | Integration | Logs |
| AC-012 | Overdue | Integration | Notification |
| AC-013 | Retry | E2E | Logs |
| AC-014 | Notification | Integration | DB |
| AC-015 | Templates | Integration | DB |
| AC-016 | AI safety | Integration | Logs |

---

# Committable files

- docs/phase-1/03-acceptance-criteria.md
- branch: phase-1/acceptance-final
- commit: finalize acceptance criteria
- PR: Phase 1 acceptance criteria final

---

# Verification steps

## Review
- All MUST features covered
- Failures handled
- AC IDs consistent

## Commands
- npm run lint
- npm test
- npm build

## Artefacts
- Test outputs
- Screenshots