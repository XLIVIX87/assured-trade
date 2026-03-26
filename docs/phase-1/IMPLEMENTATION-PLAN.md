# Phase 1 Implementation Plan

## Overview
8 slices, each producing a mergeable PR. Estimated order reflects dependencies — each slice builds on the previous.

---

## Slice 0: Monorepo Scaffold + Tooling
**Branch:** `feat/scaffold`

### What
- Initialize git repo
- Set up Turborepo monorepo: `apps/web` (Next.js 15 + TypeScript), `packages/ui`
- Configure: ESLint, Prettier, TypeScript (strict), Tailwind CSS (dark-mode tokens from DESIGN.md)
- Create `docker-compose.yml` (web + postgres)
- Create `apps/web/Dockerfile`
- Create `.env.example` with all required env vars
- Create GitHub Actions CI workflow (lint + typecheck + build)
- Add root `package.json` scripts: `lint`, `build`, `typecheck`, `test`, `dev`

### Files to Create
```
.gitignore
package.json
turbo.json
docker-compose.yml
.github/workflows/ci.yml
apps/web/package.json
apps/web/tsconfig.json
apps/web/next.config.ts
apps/web/tailwind.config.ts
apps/web/postcss.config.js
apps/web/Dockerfile
apps/web/.env.example
apps/web/app/layout.tsx
apps/web/app/page.tsx
apps/web/app/globals.css
packages/ui/package.json
packages/ui/tsconfig.json
packages/ui/src/index.ts
```

### Commands to Run
```bash
npm install
npm run lint
npm run build
docker compose up --build
```

### AC Coverage
Prerequisites for all ACs. No specific AC closed.

---

## Slice 1: Auth + RBAC Skeleton
**Branch:** `feat/auth-rbac`

### What
- Install & configure Auth.js v5 (credentials provider for dev, easily swappable)
- Create Auth.js route handler + middleware
- Create Organization + User + Membership model stubs (minimal Prisma schema)
- Build guard utilities: `requireSession()`, `requireRole()`, `requireOrgAccess()`
- Add `/api/health` route
- Add middleware for auth redirect

### Files to Create/Modify
```
apps/web/prisma/schema.prisma (initial — auth models only)
apps/web/auth.ts
apps/web/auth.config.ts
apps/web/middleware.ts
apps/web/lib/auth/session.ts
apps/web/lib/auth/guards.ts
apps/web/lib/rbac/roles.ts
apps/web/lib/rbac/permissions.ts
apps/web/lib/api/response.ts
apps/web/lib/api/errors.ts
apps/web/app/api/health/route.ts
apps/web/app/(auth)/login/page.tsx
```

### Commands to Run
```bash
npx prisma migrate dev --name init-auth
npm run lint && npm run build && npm test
```

### AC Coverage
- **AC-010** — Auth enforcement (401/403 on unauthorized access)

---

## Slice 2: Data Model — Full Prisma Schema + Migrations + Seed
**Branch:** `feat/data-model`

### What
- Implement ALL 19 Phase 1 entities from `06-data-model.md`
- Add all 15+ enums (RfqStatus, QuoteStatus, TradeCaseStatus, etc.)
- Add composite indexes per spec
- Add unique constraints (Quote→TradeCase, Membership userId+orgId, Milestone tradeCaseId+sequence)
- Create seed script: 1 ops org, 1 buyer org, 2 supplier orgs, users, 2 RFQs, 2 Quotes, 1 active TradeCase with milestones/docs/inspection/issue/notifications/audit

### Files to Create/Modify
```
apps/web/prisma/schema.prisma (full schema)
apps/web/prisma/seed.ts
apps/web/package.json (add prisma seed config)
```

### Commands to Run
```bash
npx prisma migrate dev --name full-phase1-schema
npx prisma db seed
npx prisma validate
npm run lint && npm run build
```

### AC Coverage
Prerequisites for AC-001 through AC-009, AC-014, AC-015.

---

## Slice 3: Core APIs — RFQ + Quote + TradeCase
**Branch:** `feat/api-core`

### What
- Implement Route Handlers per `05-api-spec.md`:
  - `POST /api/rfqs` — create RFQ (Buyer)
  - `GET /api/rfqs` — list RFQs (filtered by org)
  - `GET /api/rfqs/:id` — RFQ detail
  - `PATCH /api/rfqs/:id` — update draft RFQ
  - `POST /api/quotes` — create Quote (Ops)
  - `POST /api/quotes/:id/send` — send Quote to Buyer
  - `GET /api/quotes/:id` — Quote detail
  - `POST /api/quotes/:id/accept` — accept Quote → create TradeCase + milestones + doc checklist
  - `GET /api/tradecases` — list TradeCases
  - `GET /api/tradecases/:id` — TradeCase detail
  - `PATCH /api/tradecases/:id` — update TradeCase metadata
  - `POST /api/tradecases/:id/assign-supplier` — assign supplier
- Add Zod validation schemas
- Add AuditEvent logging utility
- Add Notification creation utility
- Enforce RBAC on every endpoint
- Add request ID correlation

### Files to Create
```
apps/web/lib/validation/rfq.ts
apps/web/lib/validation/quote.ts
apps/web/lib/validation/tradecase.ts
apps/web/lib/audit/log.ts
apps/web/lib/notifications/create.ts
apps/web/app/api/rfqs/route.ts
apps/web/app/api/rfqs/[id]/route.ts
apps/web/app/api/quotes/route.ts
apps/web/app/api/quotes/[id]/route.ts
apps/web/app/api/quotes/[id]/send/route.ts
apps/web/app/api/quotes/[id]/accept/route.ts
apps/web/app/api/tradecases/route.ts
apps/web/app/api/tradecases/[id]/route.ts
apps/web/app/api/tradecases/[id]/assign-supplier/route.ts
```

### Commands to Run
```bash
npm run lint && npm run build && npm test
```

### AC Coverage
- **AC-001** — RFQ creation (status=SUBMITTED, audit logged, visible in dashboard)
- **AC-002** — Quote creation (status=SENT, notification created)
- **AC-003** — Quote acceptance (TradeCase created, milestones generated, doc checklist generated)
- **AC-014** — Notification creation
- **AC-015** — Template generation (milestones + doc checklist auto-created)

---

## Slice 4: Document Workflow APIs
**Branch:** `feat/api-documents`

### What
- `GET /api/tradecases/:id/documents` — list case documents
- `POST /api/tradecases/:id/documents` — register document metadata (Supplier/Ops)
- `POST /api/documents/:id/approve` — approve document (Ops)
- `POST /api/documents/:id/reject` — reject document (Ops, reason required)
- Add DocumentReview history (immutable)
- Add Notifications on approval/rejection
- Signed URL generation stub (interface + local dev implementation)
- Lot creation + allocation endpoints:
  - `POST /api/lots`
  - `POST /api/tradecases/:id/lot-allocations`

### Files to Create
```
apps/web/lib/validation/document.ts
apps/web/lib/storage/interface.ts
apps/web/lib/storage/local.ts
apps/web/app/api/tradecases/[id]/documents/route.ts
apps/web/app/api/documents/[id]/approve/route.ts
apps/web/app/api/documents/[id]/reject/route.ts
apps/web/app/api/lots/route.ts
apps/web/app/api/tradecases/[id]/lot-allocations/route.ts
```

### Commands to Run
```bash
npm run lint && npm run build && npm test
```

### AC Coverage
- **AC-004** — Document upload (metadata in DB, accessible via signed URL)
- **AC-005** — Document approval (status=APPROVED, audit logged)
- **AC-006** — Document rejection (reason stored, notification created)
- **AC-014** — Notifications

---

## Slice 5: Inspection + Issues + Milestones
**Branch:** `feat/api-inspection-issues`

### What
- `POST /api/inspections` — record inspection (Ops)
- `PATCH /api/milestones/:id` — update milestone status (Ops)
- `GET /api/issues` — list issues
- `POST /api/issues` — create issue (Ops/Supplier)
- `PATCH /api/issues/:id` — update issue (Ops)
- `GET /api/notifications` — list notifications
- `POST /api/notifications/:id/read` — mark notification read
- Inspection failure → block milestone + create issue (business logic)
- Milestone overdue detection (utility, can be cron or on-read check)

### Files to Create
```
apps/web/lib/validation/inspection.ts
apps/web/lib/validation/issue.ts
apps/web/lib/validation/milestone.ts
apps/web/app/api/inspections/route.ts
apps/web/app/api/milestones/[id]/route.ts
apps/web/app/api/issues/route.ts
apps/web/app/api/issues/[id]/route.ts
apps/web/app/api/notifications/route.ts
apps/web/app/api/notifications/[id]/read/route.ts
```

### Commands to Run
```bash
npm run lint && npm run build && npm test
```

### AC Coverage
- **AC-007** — Inspection (fail → milestone BLOCKED + issue created)
- **AC-008** — Milestone update (status updated, audit logged)
- **AC-012** — Milestone overdue (status=OVERDUE, notification sent)
- **AC-014** — Notifications

---

## Slice 6: Close-out Pack Generation
**Branch:** `feat/closeout`

### What
- `POST /api/tradecases/:id/closeout` — generate close-out pack
  - Verify all required docs are approved (block if not)
  - Generate ZIP file (local filesystem or storage adapter)
  - Store CloseoutPack metadata
  - Mark case COMPLETE
  - Idempotent retry behavior
- Rate limit: 5/hr/case

### Files to Create
```
apps/web/lib/closeout/generate.ts
apps/web/lib/closeout/zip.ts
apps/web/app/api/tradecases/[id]/closeout/route.ts
```

### Commands to Run
```bash
npm run lint && npm run build && npm test
```

### AC Coverage
- **AC-009** — Close-out pack (ZIP generated, stored, case COMPLETE)
- **AC-013** — Close-out failure retry (idempotent, case not marked complete on failure)

---

## Slice 7: UI MVP — Buyer + Ops + Supplier Screens
**Branch:** `feat/ui-mvp`

### What
- Implement core screens per `04-ui-spec.md`:
  - **Buyer:** Dashboard, RFQ Wizard, Quote View, Trade Case View
  - **Ops:** Queue, RFQ Review + Quote Builder, Document Review Inbox
  - **Supplier:** Onboarding, Assigned Cases, Document Upload Center
- Shared layout with navigation (role-aware sidebar)
- All 5 UI states per screen: loading (skeleton), empty (CTA), error (retry), success, submitting
- Dark mode tokens from DESIGN.md applied via Tailwind
- Status Pills, Tables, File Upload components in `packages/ui`
- AI assist panel present but disabled (placeholder)

### Files to Create
```
packages/ui/src/components/Button.tsx
packages/ui/src/components/Input.tsx
packages/ui/src/components/StatusPill.tsx
packages/ui/src/components/DataTable.tsx
packages/ui/src/components/FileUpload.tsx
packages/ui/src/components/Modal.tsx
packages/ui/src/components/Skeleton.tsx
packages/ui/src/components/EmptyState.tsx
packages/ui/src/components/ErrorState.tsx
apps/web/components/layout/Sidebar.tsx
apps/web/components/layout/Header.tsx
apps/web/components/layout/Shell.tsx
apps/web/app/(dashboard)/page.tsx                          # Buyer dashboard
apps/web/app/(dashboard)/rfqs/new/page.tsx                 # RFQ wizard
apps/web/app/(dashboard)/quotes/[id]/page.tsx              # Quote view
apps/web/app/(dashboard)/cases/[id]/page.tsx               # Trade case view
apps/web/app/(dashboard)/ops/queue/page.tsx                # Ops queue
apps/web/app/(dashboard)/ops/rfqs/[id]/page.tsx            # RFQ review
apps/web/app/(dashboard)/ops/documents/page.tsx            # Document review inbox
apps/web/app/(supplier)/page.tsx                           # Supplier dashboard
apps/web/app/(supplier)/onboarding/page.tsx                # Supplier onboarding
apps/web/app/(supplier)/cases/[id]/page.tsx                # Supplier case view
apps/web/app/(supplier)/cases/[id]/documents/page.tsx      # Document upload
```

### Commands to Run
```bash
npm run lint && npm run build
# Screenshot capture for evidence
```

### AC Coverage
Visual evidence for AC-001 through AC-009 (screens that surface these features).

---

## Slice 8: Tests + CI Finalization
**Branch:** `feat/tests-ci`

### What
- Integration tests mapped to AC IDs:
  - AC-001: RFQ creation flow
  - AC-002: Quote creation flow
  - AC-003: Quote acceptance → TradeCase + milestones + checklist
  - AC-004: Document upload
  - AC-005: Document approval
  - AC-006: Document rejection (reason required)
  - AC-007: Inspection failure → block + issue
  - AC-008: Milestone update
  - AC-009: Close-out pack (blocked if docs incomplete)
  - AC-010: Auth/RBAC enforcement (401/403)
  - AC-013: Close-out retry idempotency
  - AC-014: Notification creation
  - AC-015: Template generation
- Minimal Playwright E2E: happy path (login → create RFQ → quote → accept → upload doc → close-out)
- Update CI pipeline to run all tests
- Rate limit placeholder tests (AC-011 AI, AC-016 AI timeout — stubs if AI not enabled)

### Files to Create
```
apps/web/__tests__/api/rfqs.test.ts
apps/web/__tests__/api/quotes.test.ts
apps/web/__tests__/api/tradecases.test.ts
apps/web/__tests__/api/documents.test.ts
apps/web/__tests__/api/inspections.test.ts
apps/web/__tests__/api/milestones.test.ts
apps/web/__tests__/api/closeout.test.ts
apps/web/__tests__/api/auth.test.ts
apps/web/__tests__/e2e/happy-path.spec.ts
apps/web/playwright.config.ts
.github/workflows/ci.yml (update)
```

### Commands to Run
```bash
npm run test
npm run test:e2e
npm run lint && npm run build
```

### AC Coverage
- **AC-001 through AC-016** — test evidence for all acceptance criteria

---

## Dependency Graph

```
Slice 0 (Scaffold)
  └── Slice 1 (Auth + RBAC)
       └── Slice 2 (Data Model)
            ├── Slice 3 (Core APIs: RFQ/Quote/TradeCase)
            │    └── Slice 4 (Document APIs)
            │         └── Slice 5 (Inspection/Issues/Milestones)
            │              └── Slice 6 (Close-out)
            └── Slice 7 (UI MVP) — can start after Slice 3
       └── Slice 8 (Tests) — after all API slices
```

Slices 7 and 4–6 can be partially parallelized once Slice 3 is done.

---

## Out of Scope (Phase 1)
- Marketplace / bidding
- Payments / escrow / wallet
- Logistics automation
- Advanced KYC/AML
- Full AI automation
- Trade finance
- Email notifications (could → should but not blocking)
- Analytics dashboard
