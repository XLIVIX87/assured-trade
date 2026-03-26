---
id: phase1-prd-uk-commodity-gateway
title: "Phase 1 PRD — UK Commodity Gateway (Assured Trade Deal Desk)"
status: draft
owner: Product + Engineering Lead
last_updated: 2026-03-24
related_docs:
  - docs/phase-1/00-project-brief.md
  - docs/phase-1/02-user-journeys.md
  - docs/phase-1/04-ui-spec.md (to be created)
assumptions:
  - Phase 1 is a curated deal desk, not a marketplace.
  - Platform is a facilitator (no custody of funds).
  - System must function fully without AI enabled.
  - Storage via object storage; DB stores metadata only.
open_questions:
  - Confirm <APP_NAME> and <REPO_ROOT>
  - Commodity list and templates
  - Storage provider
  - Auth.js session strategy
  - Notification strategy
---

# Goals and non-goals

## Goals
- Deliver a **controlled, evidence-based trade workflow**
- Enable **RFQ → Quote → Trade Case → Close-out**
- Provide **full transparency and auditability**
- Execute **1–3 successful pilot trades**

## Non-goals
- Marketplace listings
- Payments/escrow
- Logistics automation
- Full AI automation

---

# Personas

## Buyer
- Needs trust, visibility, documentation

## Ops
- Needs control, templates, oversight

## Supplier
- Needs structure, clarity, access

---

# User problems (ranked)

1. Lack of trust
2. Poor quality verification
3. Documentation gaps
4. Lack of visibility
5. Weak dispute handling

---

# Requirements (functional)

## MUST

- RFQ creation
- Quote creation + acceptance
- Trade Case generation
- Milestones (with owner, due date, status)
- Document checklist (template-based)
- Document upload + approve/reject
- Supplier onboarding (BASIC verification)
- Inspection recording (pass/fail)
- Issue tracking
- Close-out pack generation (ZIP required)
- In-app notifications
- Audit logging

## SHOULD

- Template management
- Analytics dashboard
- Document versioning

## COULD

- Email notifications
- AI assistance

---

# Acceptance Criteria

## AC-1 RFQ Creation
- Given Buyer is logged in
- When RFQ submitted
- Then:
  - RFQ created with status SUBMITTED
  - Audit event logged
  - Visible in dashboard

## AC-2 Quote Acceptance
- Given Quote is SENT
- When Buyer accepts
- Then:
  - Quote = ACCEPTED
  - TradeCase created
  - Milestones generated

## AC-3 Document Approval
- Given document uploaded
- When Ops approves
- Then:
  - Status = APPROVED
  - Audit logged

## AC-4 Document Rejection
- Given document uploaded
- When Ops rejects
- Then:
  - Status = REJECTED
  - Reason required

## AC-5 Inspection Failure
- Given inspection fails
- Then:
  - Milestone = BLOCKED
  - Issue created

## AC-6 Close-out Pack
- Given all docs approved
- When close-out triggered
- Then:
  - ZIP generated
  - Case marked COMPLETE

---

# Non-functional requirements (testable)

## Performance
- P95 API < 300ms

## Reliability
- Uptime target: 99.5%
- Retry policies defined

## Security
- RBAC enforced
- No cross-org access

## Rate limiting
- RFQ: 10/hour
- AI: 20/day

## Privacy
- Signed URLs
- Immutable audit logs

---

# AI-enabled features

## Deterministic (core)
- Workflow
- Milestones
- Docs
- Close-out

## AI (optional only)
- RFQ parsing
- Doc validation
- Summary generation

## AI rules
- No auto-decisions
- Rate limited
- Schema validated

---

# MVP definition

## Phase 1
- Core workflow
- No marketplace
- No payments

## Phase 2
- Integrations
- Notifications
- Supplier scoring

## Phase 3
- Marketplace
- Finance tools

---

# Analytics

- RFQ count
- Quote rate
- Acceptance %
- Completion rate
- Cycle time

---

# Out of scope

- Marketplace
- Payments
- Logistics automation
- Trade finance

---

# Open questions

- App name
- Commodity templates
- Storage provider
- Auth strategy

---

# Feature matrix

| Feature | Value | Acceptance | Risk | Priority |
|--------|------|-----------|------|---------|
| RFQ | Intake | AC-1 | Poor data | MUST |
| Quote | Offer | AC-2 | Mispricing | MUST |
| Case | Control | AC-2 | Complexity | MUST |
| Docs | Compliance | AC-3/4 | Errors | MUST |
| Inspection | Quality | AC-5 | Delay | MUST |
| Close-out | Delivery | AC-6 | Missing docs | MUST |

---

# Committable files

- docs/phase-1/01-prd.md
- branch: phase-1/prd-final
- commit: finalize PRD
- PR: Phase 1 PRD final

---

# Verification steps

## Review
- Acceptance criteria exist for each MUST
- Scope aligns with brief
- AI separated

## Commands
- npm run lint
- npm run build

## Artefacts
- PR diff
- Markdown preview