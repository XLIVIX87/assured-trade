---
id: phase1-security-checklist-uk-commodity-gateway
title: "Phase 1 Security Checklist — <APP_NAME>"
status: draft
owner: Product + Engineering Lead
last_updated: 2026-03-24
related_docs:
  - docs/phase-1/00-project-brief.md
  - docs/phase-1/01-prd.md
  - docs/phase-1/05-api-spec.md
  - docs/phase-1/07-ai-spec.md
  - docs/phase-1/08-infra-runbook.md
---

# Phase 1 Security Checklist

This checklist defines the minimum practical security baseline for **<APP_NAME>** in Phase 1. It is written for a stack built on **Next.js + TypeScript**, **Auth.js**, **Postgres + Prisma**, **Docker**, **GitHub Actions**, and optional **AI endpoints**. The goal is not to create a heavyweight enterprise security program on day one, but to ensure that the most likely and most damaging risks are addressed before and during launch.

Phase 1 security posture should assume:
- the app is multi-tenant by organization
- business data is sensitive even if it is not always “regulated”
- document metadata and file access are high-value targets
- AI endpoints create a distinct abuse and cost risk
- operational mistakes (misconfigured secrets, broken RBAC, over-permissive logs) are as dangerous as malicious attacks

This document should be used together with the PRD, API spec, AI spec, and Infra/Runbook.

---

# Threat model summary

## Security goals
Phase 1 security should protect:
1. **buyer and supplier data confidentiality**
2. **organization-level isolation**
3. **workflow integrity** (quotes, approvals, close-out state)
4. **file/document access control**
5. **auth/session integrity**
6. **AI cost and abuse boundaries**
7. **deployment and supply-chain integrity**

## Assets to protect
The main assets in Phase 1 are:

### Identity and access assets
- user accounts
- sessions
- organization memberships
- role assignments

### Business workflow assets
- RFQs
- Quotes
- TradeCases
- Milestones
- Issues
- Notifications
- AuditEvents

### Evidence and compliance assets
- document metadata
- document file keys / signed URLs
- inspection records
- close-out pack metadata and files

### Infrastructure and secret assets
- `DATABASE_URL`
- `AUTH_SECRET`
- provider credentials
- AI API keys
- storage credentials
- GitHub Actions secrets

### AI-related assets
- prompt templates
- internal guidance docs (if retrieval is enabled)
- AI logs and usage records
- budget and quota configuration

---

## Threat actors
Phase 1 should account for the following threat actors:

### External attackers
- unauthenticated internet users
- credential-stuffing or brute-force attempts
- scanners probing exposed endpoints
- users attempting document/file access without authorization

### Authenticated but unauthorized users
- buyer trying to access another buyer’s data
- supplier trying to access other supplier or buyer trade cases
- user with valid account but stale/incorrect org membership

### Internal misuse / operational mistakes
- overly broad Ops access patterns
- accidental secret exposure in CI logs
- deployment misconfiguration
- logging sensitive data
- manual DB edits or unsafe migrations

### Abuse actors
- users triggering excessive AI requests
- malicious prompt injection via uploaded text or pasted content
- file upload abuse
- repeated retry loops from buggy clients

---

## Trust boundaries
The main trust boundaries in Phase 1 are:

1. **Browser ↔ Next.js app**
   - untrusted client input
   - all requests require validation

2. **Next.js Route Handlers ↔ Postgres**
   - only server-side trusted writes
   - app logic must enforce role/org scope before DB access

3. **Next.js app ↔ Object storage**
   - file access must be mediated via signed URLs
   - never expose raw bucket credentials to client

4. **Next.js app ↔ AI provider**
   - all model calls server-side only
   - prompts and outputs treated as sensitive operational data

5. **GitHub Actions ↔ deployment target**
   - CI credentials and deployment permissions must be tightly scoped

---

# Secrets management checklist

## Local development
Local development should:
- use uncommitted env files or secret files
- never store real production secrets in local demo/dev config
- keep local secrets outside screenshots, recordings, and example docs

### Local checklist
- [ ] `.env.local` or equivalent is gitignored
- [ ] no secrets committed in repo history
- [ ] demo/sample config uses placeholder values only
- [ ] developers know which env vars are required
- [ ] local logs do not print raw secrets

---

## CI / GitHub Actions
CI secrets should:
- live in GitHub Secrets / GitHub Environments
- be scoped per environment where possible
- never be echoed into logs
- be rotated if accidental exposure occurs

### CI checklist
- [ ] deploy secrets are not stored in repo
- [ ] `GITHUB_TOKEN` permissions are minimized
- [ ] production deployment uses protected environment approvals if available
- [ ] workflow logs do not print env values
- [ ] third-party GitHub Actions are pinned to trusted versions or SHAs where possible

---

## Production
Production secrets should:
- come from platform secret management or env injection
- never be hard-coded into Docker image or source files
- be rotated periodically and after incident suspicion

### Production checklist
- [ ] `AUTH_SECRET` is present and stable
- [ ] DB credentials are unique to environment
- [ ] AI provider keys are server-only
- [ ] storage credentials are server-only
- [ ] secret rotation plan exists, even if lightweight
- [ ] production secrets differ from dev/staging

---

# Auth / session checklist

## Auth.js baseline assumptions
Phase 1 assumes Auth.js is responsible for authentication, but **authorization is custom** and enforced at the API layer using:
- session
- membership
- role
- org scoping

Auth.js alone is not enough; RBAC must be layered on top.

---

## Auth/session controls
- [ ] every protected Route Handler verifies session
- [ ] every sensitive route verifies role
- [ ] every object read/write is org-scoped
- [ ] stale or disabled memberships block access
- [ ] logout clears active session cleanly
- [ ] session expiry results in 401/redirect, not silent failure
- [ ] auth callback/base URL settings are correct per environment
- [ ] auth-related cookies use secure settings in production
- [ ] session and CSRF defaults are not weakened without explicit reason

---

## Session expiry assumptions
Phase 1 should assume:
- sessions may expire during multi-step workflows
- form state should be preserved client-side where practical
- expired session must not produce partial privileged writes

### Verify
- [ ] a session-expired write returns 401/403 cleanly
- [ ] retried submission after re-login works predictably
- [ ] no duplicate mutation occurs after session recovery

---

# API security checklist

## Input validation
Every API must assume untrusted input.

- [ ] request body validated server-side
- [ ] query params validated server-side
- [ ] path params validated server-side
- [ ] enum values validated
- [ ] payload size limits enforced
- [ ] file metadata validated before DB write
- [ ] malformed JSON handled gracefully

## Authorization
- [ ] Buyer cannot access other buyer org data
- [ ] Supplier cannot access unassigned trade cases
- [ ] Buyer cannot approve/reject documents
- [ ] only Ops can execute restricted state transitions
- [ ] business state transitions are validated server-side

## Rate limiting
- [ ] create/update endpoints have rate limits where abuse risk exists
- [ ] file upload registration endpoints have limits
- [ ] AI endpoints have stricter limits
- [ ] repeated 401/403/429 patterns are logged

## Logging redaction
- [ ] no raw secrets in logs
- [ ] no full signed URLs in logs
- [ ] no raw document contents by default in logs
- [ ] no raw sensitive AI prompts in logs unless redacted and approved
- [ ] request IDs/correlation IDs included in logs

## Error handling
- [ ] consistent error envelope used
- [ ] no stack traces leaked to client in production
- [ ] internal errors logged server-side only
- [ ] validation errors are explicit but not over-revealing

---

# AI-specific checklist

AI is optional in Phase 1, but if enabled, it introduces distinct security and abuse risks.

## Prompt injection
- [ ] system/developer prompts explicitly instruct model to treat user and retrieved text as data only
- [ ] retrieved context never overrides higher-priority instructions
- [ ] model outputs are never allowed to trigger privileged actions directly
- [ ] AI outputs are always treated as suggestions until user confirmation or deterministic validation

## Data exfiltration prevention
- [ ] no secrets passed to model prompts
- [ ] no raw credential material passed to model
- [ ] minimize PII in prompts
- [ ] truncate/redact document text before sending to model when possible
- [ ] internal-only docs are retrieved selectively, not dumped wholesale

## Abuse / cost controls
- [ ] per-user and per-org quotas are enforced
- [ ] request size caps are enforced
- [ ] timeout caps are configured
- [ ] retries do not loop infinitely
- [ ] hard monthly cost cap or alert threshold is configured
- [ ] AI feature can be disabled independently if abuse spikes

## Output handling
- [ ] schema validation for structured outputs
- [ ] malformed model outputs rejected safely
- [ ] no automatic approval/rejection decisions from AI
- [ ] rendered AI content sanitized before display
- [ ] fallback manual path exists for each AI feature

---

# Dependency hygiene checklist

## Package hygiene
- [ ] lockfile committed
- [ ] dependency updates reviewed, not blindly merged
- [ ] unused packages removed periodically
- [ ] high-risk packages minimized

## Alerts and updates
- [ ] Dependabot or equivalent enabled
- [ ] security advisories reviewed regularly
- [ ] critical patches prioritized
- [ ] production dependencies distinguished from dev dependencies

## GitHub Actions and third-party integrations
- [ ] third-party actions reviewed before use
- [ ] actions pinned to stable versions or SHAs where appropriate
- [ ] workflow permissions restricted
- [ ] external integrations documented

---

# Docker and supply-chain checklist

## Docker baseline
- [ ] multi-stage Docker build used where practical
- [ ] runtime image kept minimal
- [ ] app does not run as root if avoidable
- [ ] only required files copied into runtime image
- [ ] secrets not baked into image
- [ ] `.dockerignore` configured sensibly

## Image and supply-chain hygiene
- [ ] image scanning placeholder/tooling identified
- [ ] base image kept current
- [ ] registry access controlled
- [ ] image tags include immutable identifier (e.g. commit SHA)
- [ ] CI build is reproducible from committed source

## Supply-chain notes
Phase 1 may not yet have full SBOM/signing/scanning maturity, but at minimum:
- identify the intended image scanning tool or placeholder process
- record any known gap rather than silently ignoring it

---

# Open risks + mitigations (ranked)

## 1. Broken org scoping / RBAC
**Risk:** High  
**Why it matters:** Direct cross-tenant data exposure is a critical failure.  
**Mitigation:**
- centralize access checks
- integration tests for role/org boundaries
- require case/org ownership checks in every handler

## 2. Secret leakage in CI or runtime logs
**Risk:** High  
**Why it matters:** Can compromise DB, AI provider, or auth layer.  
**Mitigation:**
- redact logs
- keep secrets server-only
- review workflow output
- rotate after exposure

## 3. File access leakage via object storage
**Risk:** High  
**Why it matters:** Documents and close-out packs are sensitive.  
**Mitigation:**
- signed URLs only
- short TTL
- no public buckets
- verify direct access denial

## 4. AI abuse / runaway cost
**Risk:** Medium-High  
**Why it matters:** Budget and reliability impact, possible abuse vector.  
**Mitigation:**
- quotas
- rate limits
- provider timeout
- monitoring and fast disable switch

## 5. Unsafe migration / deployment sequence
**Risk:** Medium-High  
**Why it matters:** Can break auth or core workflows in production.  
**Mitigation:**
- reviewed migrations
- clear deploy/rollback runbook
- staging rehearsal
- avoid destructive changes without plan

## 6. Dependency or action compromise
**Risk:** Medium  
**Why it matters:** Supply-chain risk can affect build or runtime.  
**Mitigation:**
- review packages/actions
- pin versions
- monitor advisories

## 7. Over-logging sensitive business data
**Risk:** Medium  
**Why it matters:** Creates secondary exposure path.  
**Mitigation:**
- logging guidelines
- redaction
- audit what is logged in AI and document flows

---

# Security checklist table

| Control | Why | How to verify | Owner | Status |
|---|---|---|---|---|
| Session required on protected routes | Prevent unauthenticated access | Integration tests return 401 without session | Engineering | TODO |
| Role + org scoping on every sensitive endpoint | Prevent cross-tenant data exposure | Integration tests for Buyer/Supplier/Ops boundaries | Engineering | TODO |
| Signed URLs for document access | Prevent public document exposure | Attempt direct access without signed URL; expect failure | Engineering | TODO |
| Server-side schema validation | Prevent malformed/bad input writes | Unit/integration tests with invalid payloads | Engineering | TODO |
| Consistent error envelope | Prevent leakage and improve debugging | Inspect API responses in test runs | Engineering | TODO |
| Redacted logs | Prevent secret/PII leakage | Review logs during test flows | Engineering/Ops | TODO |
| Auth.js production cookie/session settings | Protect session integrity | Verify env config and browser behavior in staging | Engineering | TODO |
| Rate limiting on AI endpoints | Prevent abuse and cost spikes | Simulate repeated requests; expect 429 | Engineering | TODO |
| AI output schema validation | Prevent malformed model output use | Force malformed output in test/mocked provider | Engineering | TODO |
| No AI auto-approval of workflow actions | Prevent unsafe automation | Code review + integration tests | Product/Engineering | TODO |
| Dependabot/security alert review | Catch vulnerable dependencies early | Confirm alerts enabled and monitored | Engineering | TODO |
| Third-party GitHub Actions reviewed/pinned | Reduce supply-chain risk | Inspect workflow files | Engineering | TODO |
| Non-root/minimal Docker runtime | Reduce container attack surface | Inspect Dockerfile/runtime container | Engineering | TODO |
| Secret separation by env | Prevent dev/prod crossover | Review env config and deployment secrets | Ops | TODO |
| Prisma migrations reviewed before prod | Reduce schema/deploy risk | PR checklist + migration review evidence | Engineering/Ops | TODO |
| Request correlation IDs | Improve incident traceability | Inspect logs for requestId propagation | Engineering | TODO |
| AI budget alerts / kill switch | Control runaway spend | Simulate threshold or verify config | Ops/Engineering | TODO |

---

# Practical verification guidance

## What reviewers should explicitly check
- RBAC is tested, not just assumed
- no secret-bearing env vars are exposed client-side
- API errors are helpful but not over-revealing
- AI prompts do not include unnecessary sensitive data
- document access is mediated and not directly public
- workflow state changes require proper role and valid current state

## What should be tested in staging before Phase 1 launch
- Buyer cannot see another Buyer org’s data
- Supplier cannot see unassigned case
- Ops can perform approval actions
- direct file access without signed URL fails
- session expiry during a form submission fails safely
- AI endpoint rate limit and timeout behavior works
- CI deploy does not leak secrets in logs

---

# Committable files

- **Filename/path:** `docs/phase-1/09-security-checklist.md`
- **Branch:** `phase-1/security-checklist`
- **Commit message:** `docs: add Phase 1 security checklist`
- **PR title:** `Phase 1: Add security checklist`

---

# Verification steps

## Review checklist
- threat model matches app architecture and business flow
- secret handling is clearly separated by local / CI / prod
- auth/session controls are distinct from authorization controls
- AI-specific risks are addressed separately from normal API risks
- open risks are ranked and realistic
- checklist table is actionable and not generic

## Commands to run (if repo exists)
From repo root:
```bash
npm run lint
npm test --if-present
npm run build
docker compose up --build

If Prisma/auth/API tests exist, also run:

npm run test:integration
npm run test:e2e

Evidence to capture
	•	CI logs showing green checks
	•	screenshots or recordings of protected flows working and failing correctly
	•	sample redacted logs with request IDs
	•	proof of environment secret configuration review
	•	PR diff for docs/phase-1/09-security-checklist.md

