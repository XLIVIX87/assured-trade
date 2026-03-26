---
id: phase1-brief-uk-commodity-gateway
title: "Phase 1 Project Brief — UK Commodity Gateway (Assured Trade Deal Desk)"
status: draft
owner: Product + Engineering Lead
last_updated: 2026-03-24
repo_paths_used:
  - docs/phase-1/00-project-brief.md (to be created)
  - apps/web (placeholder)
  - packages/* (placeholder)
assumptions:
  - Phase 1 is a curated, case-managed “Assured Trade Deal Desk” (not a marketplace).
  - Platform is a facilitator, not importer/exporter of record.
  - Payments handled off-platform or via regulated partners.
  - File storage uses object storage (S3-compatible); DB stores metadata only.
  - Next.js Route Handlers serve all backend APIs.
  - System must function fully without AI enabled.
open_questions:
  - Confirm <APP_NAME> and <REPO_ROOT>.
  - Confirm commodities in Phase 1 (default: sesame, chilli, shea butter, cocoa).
  - Confirm document templates per commodity/incoterm.
  - Confirm storage provider (local + production).
  - Confirm Auth.js session strategy and org model.
  - Confirm notification strategy (in-app vs email).
  - Confirm close-out pack format (ZIP vs ZIP+PDF).
dependencies:
  - Prisma schema + migrations
  - Auth.js configuration
  - Object storage integration
  - Docker + docker-compose setup
  - GitHub Actions CI baseline
---

# Problem statement

International buyers avoid sourcing Nigerian commodities due to:
- Lack of trust (fraud risk, unreliable suppliers)
- Inconsistent quality and lack of verifiable inspection
- Poor documentation readiness (COO, phyto, COA, etc.)
- Weak execution visibility and accountability

Suppliers face:
- Difficulty presenting export-ready documentation
- Lack of structured workflows to meet international expectations

**Core problem:** There is no standardized, governed, evidence-backed system that enables confident trade execution.

---

# Target users and jobs-to-be-done

## Buyers (UK/EU importers)
- Submit RFQs
- Track execution transparently
- Receive complete documentation packs

## Ops (Deal Desk)
- Standardize trade execution
- Manage workflows, approvals, inspections
- Maintain audit trail

## Suppliers
- Upload documents and evidence
- Meet export readiness requirements
- Access credible buyers

---

# Solution overview

Build a **Trade Case–driven platform** where each deal is managed through:

- RFQ → Quote → Trade Case → Milestones → Documents → Inspection → Close-out Pack

Key features:
- Evidence-based execution (documents + inspections)
- Milestone tracking with accountability
- Structured approvals and audit logs
- Close-out pack generation

---

# MVP scope (in/out)

## In scope
- RFQ creation and submission
- Quote creation and acceptance
- Trade Case creation
- Milestone tracking
- Document upload + approval/rejection
- Supplier onboarding (basic verification)
- Inspection recording
- Issue/dispute tracking
- Close-out pack (ZIP required, PDF optional)
- In-app notifications
- Audit trail

## Out of scope
- Marketplace listings or bidding
- Payments/escrow
- Logistics automation
- Advanced KYC/AML
- Full AI automation
- Trade finance integrations

---

# Success metrics (measurable)

## Adoption
- 5–10 verified buyers onboarded
- 10–20 RFQs submitted

## Conversion
- RFQ → Quote time ≤ 72 hours
- Quote acceptance rate ≥ 30%

## Execution
- Milestone on-time completion ≥ 80%
- Document first-pass approval ≥ 70%
- Inspection first-pass success ≥ 70%

## Outcome
- 1–3 completed trades
- Average cycle time tracked (RFQ → close-out)

---

# Risks & mitigations

## Execution risk
- Mitigation: strict templates, controlled onboarding

## Security risk
- Mitigation: RBAC at API layer, signed URLs

## AI abuse risk
- AI features disabled by default
- Rate limits enforced
- Schema validation required
- No auto-approval from AI

## Scope creep
- Lock Phase 1 to deal desk only

---

# Non-functional considerations (testable)

## Performance
- P95 API latency < 300ms
- File uploads ≤ 50MB

## Reliability
- Idempotent critical actions
- Retry logic:
  - File uploads: 3 attempts
  - Close-out: 2 attempts

## Security
- Role-based access enforced on all endpoints
- Supplier cannot access other org data
- Buyer cannot access other buyers' data

## Rate limiting
- RFQ: 10/hour/user
- AI: 20/day/user
- Upload: 50MB max

## Privacy
- Audit logs immutable
- Documents access controlled via signed URLs

---

# Open questions

1. Final app name (<APP_NAME>)
2. Commodity scope confirmation
3. Verification level (default = BASIC)
4. Storage provider selection
5. Close-out pack format decision
6. Notification system choice
7. Auth.js session + org model

---

# Phase 1 deliverables

- Project Brief (this document)
- PRD (docs/phase-1/01-prd.md)
- User Journeys (docs/phase-1/02-user-journeys.md)
- Domain Model
- API Contracts
- UI Spec
- DevOps Setup

---

# Committable files

- Path: docs/phase-1/00-project-brief.md
- Branch: phase-1/project-brief-final
- Commit: docs: finalize Phase 1 project brief
- PR title: Phase 1: Final Project Brief

---

# Verification steps

## Review
- Confirm scope matches PRD
- Confirm all open questions are valid
- Confirm no marketplace scope creep

## Commands (if repo exists)
- npm run lint
- npm run build
- docker compose up --build

## Artefacts
- Markdown preview
- PR diff