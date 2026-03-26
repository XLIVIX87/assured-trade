---
id: phase1-infra-runbook-uk-commodity-gateway
title: "Phase 1 Infra / Runbook — <APP_NAME>"
status: draft
owner: Product + Engineering Lead
last_updated: 2026-03-24
related_docs:
  - docs/phase-1/00-project-brief.md
  - docs/phase-1/01-prd.md
  - docs/phase-1/03-acceptance-criteria.md
  - docs/phase-1/05-api-spec.md
  - docs/phase-1/06-data-model.md
  - docs/phase-1/07-ai-spec.md
environments:
  - local
  - dev
  - staging
  - production
---

# Phase 1 Infra / Runbook

This document defines how to run, test, migrate, deploy, and troubleshoot **<APP_NAME>** in Phase 1. It is written for a **Docker-first local workflow**, **GitHub Actions CI**, and a deployment target that may be either **self-hosted Docker**, **managed previews**, or **TBD**. The app stack assumes:

- `apps/web` = Next.js + TypeScript
- Route Handlers under `app/api/**/route.ts`
- Postgres + Prisma
- Auth.js
- Optional AI endpoints
- Docker + docker-compose for local development
- GitHub Actions for CI

This runbook is designed to be usable by one person or a small team and should be kept current as the stack evolves.

---

# Environment overview

## Local
Purpose:
- active development
- schema iteration
- UI work
- local API testing
- seed/demo data

Expected components:
- web app
- Postgres
- optional object storage emulator later (if needed)
- optional mail catcher later (if email is added)

Characteristics:
- fast reset
- safe to wipe/reseed
- secrets stored locally only
- Docker Compose is primary runtime

---

## Dev
Purpose:
- shared internal environment
- post-merge smoke checks
- seeded demo/test environment
- API and auth integration checks

Characteristics:
- persistent database
- lower stability than staging/prod
- may use test credentials/providers
- migrations should be applied in a controlled way

---

## Staging
Purpose:
- pre-production verification
- release candidate testing
- migration rehearsal
- manual QA / UAT

Characteristics:
- production-like config
- controlled seed/demo data only
- stricter secrets handling
- deployment process should mirror production

---

## Production
Purpose:
- live user environment

Characteristics:
- highest control
- no test accounts without explicit approval
- audited migration application
- strict secret handling
- error tracking and logs required
- rollback path must be defined before deploy

---

# Local dev setup

## Prerequisites

Install the following locally:

- Docker
- Docker Compose
- Node.js (recommended if you sometimes run commands outside containers)
- npm
- Git

Optional but useful:
- `psql`
- Prisma CLI (via local npm scripts or `npx`)
- GitHub CLI

---

## Expected local services (Docker Compose)

Minimum local stack:

### 1. `web`
- Next.js application
- connects to Postgres using `DATABASE_URL`
- runs Prisma generate/build/dev commands as needed

### 2. `db`
- Postgres database
- persistent via Docker volume
- used by Prisma migrations and app runtime

Optional later:
- `mail` (MailHog/Mailpit)
- `storage` (MinIO)
- `otel` collector

---

## Example compose responsibilities

### `web`
- build from `apps/web/Dockerfile`
- expose port `3000`
- depends on `db`
- receives server-only env vars

### `db`
- image: `postgres:16`
- exposes `5432`
- persists data via named volume
- password delivered by local secret or env var

---

## One-liner local startup flow

### First-time setup
```bash
docker compose up --build

Expected outcome:
	•	Postgres starts successfully
	•	app container builds
	•	app is reachable at http://localhost:3000

In another terminal, apply migrations

docker compose exec web npx prisma migrate dev

Expected outcome:
	•	Prisma applies migrations
	•	schema is up to date
	•	generated client is refreshed

Seed data (if supported)

docker compose exec web npx prisma db seed

Expected outcome:
	•	demo orgs/users/cases inserted
	•	app dashboards show usable data

⸻

Exact commands (copy/paste)

Start stack

docker compose up --build

Expected output:
	•	db container healthy
	•	web container listening on 0.0.0.0:3000 or equivalent
	•	no fatal startup errors

Stop stack

docker compose down

Expected output:
	•	containers stop cleanly
	•	volumes preserved

Stop and wipe DB volume

docker compose down -v

Expected output:
	•	containers removed
	•	Postgres volume deleted
	•	next startup requires fresh migration/seed

Open shell in app container

docker compose exec web sh

Expected output:
	•	interactive shell inside web container

Prisma format

docker compose exec web npx prisma format

Expected output:
	•	schema formatted successfully

Prisma validate

docker compose exec web npx prisma validate

Expected output:
	•	The schema at ... is valid

Create/apply migration in dev

docker compose exec web npx prisma migrate dev --name init_phase1

Expected output:
	•	migration folder created
	•	DB updated
	•	Prisma Client generated

Regenerate Prisma client

docker compose exec web npx prisma generate

Expected output:
	•	Prisma client generated successfully

Seed DB

docker compose exec web npx prisma db seed

Expected output:
	•	seed script exits 0
	•	logs show inserted records

Run lint

docker compose exec web npm run lint

Expected output:
	•	no lint errors

Run tests

docker compose exec web npm test --if-present

Expected output:
	•	tests pass or script exits cleanly if not yet implemented

Run build

docker compose exec web npm run build

Expected output:
	•	Next.js production build succeeds
	•	no unresolved env/runtime errors

⸻

Recommended local environment file strategy

Use a local server-only env file for the app, for example:
	•	apps/web/.env.local for direct local runs
	•	Compose-level env config for containerized runs

Do not commit secrets.

Suggested server-only values:
	•	DATABASE_URL
	•	AUTH_SECRET
	•	AUTH_URL or equivalent base URL setting
	•	AI_PROVIDER
	•	AI_API_KEY
	•	provider-specific credentials

Never expose server secrets using NEXT_PUBLIC_*.

⸻

CI pipeline overview

Goals

CI should answer three questions on every PR:
	1.	Does it build?
	2.	Does it pass validation/tests?
	3.	Is it safe to merge?

On Pull Request

Recommended PR pipeline:

Step 1 — Checkout
	•	fetch code

Step 2 — Setup Node
	•	install pinned Node version
	•	restore npm cache

Step 3 — Install dependencies
	•	npm ci

Step 4 — Static validation
	•	lint
	•	typecheck (if supported)
	•	Prisma format/validate

Step 5 — Tests
	•	unit tests
	•	integration tests if available

Step 6 — Build
	•	Next.js build
	•	ensure Route Handlers compile

Step 7 — Optional docs/UI evidence checks
	•	confirm required docs updated for scope-changing PRs
	•	optionally upload screenshots/artifacts

PR pipeline should not deploy to production.

⸻

On merge to main

Recommended main branch pipeline:

Step 1 — Re-run all PR checks
	•	lint
	•	validate
	•	test
	•	build

Step 2 — Build Docker image
	•	deterministic image build
	•	optionally tag with commit SHA

Step 3 — Push image to registry
	•	GHCR or target registry

Step 4 — Deploy to target environment

Depending on deployment choice:
	•	staging auto-deploy
	•	production manual approval gate preferred

Step 5 — Post-deploy smoke check
	•	app homepage
	•	login/auth check
	•	DB connectivity check
	•	health route if implemented

⸻

Suggested CI job split

validate
	•	npm ci
	•	lint
	•	Prisma format/validate
	•	typecheck

test
	•	unit/integration tests

build
	•	Next.js build
	•	Docker build optional on PR, required on main

deploy
	•	main branch or tagged release only

⸻

DB migration procedure

Development migrations

For local/dev work:
	1.	update Prisma schema
	2.	create migration using prisma migrate dev
	3.	review generated SQL
	4.	regenerate client
	5.	run tests
	6.	commit schema + migration files together

Dev command

docker compose exec web npx prisma migrate dev --name <descriptive_name>

Use descriptive names, for example:
	•	add_trade_case_core
	•	add_document_review_history

⸻

Production migrations

Never run prisma migrate dev in production.

Use:

docker compose exec web npx prisma migrate deploy

Or equivalent in deployment job/container startup phase.

Production migration rules
	•	migrations must already exist in repo
	•	SQL should be reviewed before deployment
	•	backups or rollback plan must exist before risky migrations
	•	do not mix schema changes and destructive data cleanup without a plan

⸻

Migration approval checklist

Before applying to staging/prod:
	•	migration reviewed
	•	no accidental destructive change
	•	seed/dev assumptions removed
	•	new nullable fields considered if backfill required
	•	related app code deployed in compatible order

⸻

Secrets handling strategy

Local

Secrets stored in:
	•	local env files
	•	local compose env config
	•	local secret files ignored by git

Rules:
	•	never commit secrets
	•	rotate any accidentally exposed secret immediately

⸻

CI

Secrets stored in:
	•	GitHub Actions secrets
	•	GitHub environment secrets if environment-specific

Rules:
	•	use least privilege
	•	restrict production deploy secrets to protected environments
	•	avoid printing secret values in logs
	•	prefer OIDC for cloud auth if available

⸻

Production

Secrets should be stored in:
	•	platform secret manager
	•	container environment injection
	•	mounted secret files where supported

Rules:
	•	no hard-coded secrets in image
	•	no secrets in repo
	•	rotate periodically
	•	scope by environment

⸻

Sensitive values to manage
	•	DATABASE_URL
	•	AUTH_SECRET
	•	OAuth client secrets if applicable
	•	AI provider API keys
	•	object storage credentials
	•	email provider credentials if added later

⸻

Deployment procedure

Deployment target assumptions

Deployment is listed as <SELF_HOSTED_DOCKER_OR_MANAGED_PREVIEW_OR_TBD>. This runbook supports either of these modes:

Option A — Self-hosted Docker
	•	build image
	•	push to registry
	•	pull on host
	•	restart service/container
	•	run Prisma migrations
	•	smoke test

Option B — Managed preview / managed app platform
	•	connect GitHub repo
	•	auto-build on branch/main
	•	inject env vars through platform
	•	run migrations via predeploy/release task
	•	smoke test deployed URL

⸻

Standard deployment procedure (safe default)

Step 1 — Confirm readiness
	•	CI green
	•	migration reviewed
	•	release notes/PR reviewed
	•	required secrets present in target environment

Step 2 — Build release artefact
	•	Docker image built from current commit
	•	tag with commit SHA and optional version tag

Step 3 — Apply migrations

Preferred order:
	1.	deploy backward-compatible code first if needed
	2.	apply migration
	3.	enable new UI/API paths

In simple Phase 1 releases, app deploy and migration may happen in one release step if migration is safe.

Step 4 — Start new version
	•	restart service or roll out new container
	•	verify app starts cleanly

Step 5 — Smoke test

Check:
	•	homepage loads
	•	login works
	•	DB-backed page loads
	•	one API call succeeds
	•	no fatal auth/db errors in logs

Step 6 — Monitor

For first 15–30 minutes:
	•	error logs
	•	auth failures
	•	migration errors
	•	AI cost spikes if relevant

⸻

Rollback plan

Application rollback

If deploy is bad but migration is compatible:
	•	redeploy previous image/tag
	•	verify app health

Migration rollback

Schema rollback is harder and must be considered per migration.

Default rule:
	•	prefer forward fixes over emergency down migrations
	•	if destructive migration applied, restore from backup only if necessary and planned

Rollback decision tree
	1.	Is the issue app-only?
→ redeploy previous version
	2.	Is the issue migration-related but non-destructive?
→ hotfix app or apply follow-up migration
	3.	Is the issue destructive/data integrity related?
→ stop writes, assess backup/restore plan, escalate immediately

⸻

Operational playbooks

1) App won’t start

Symptoms
	•	container exits immediately
	•	web logs show startup failure
	•	localhost returns connection refused

Common causes
	•	missing env vars
	•	bad DATABASE_URL
	•	Prisma client not generated
	•	migration/schema mismatch
	•	Next.js build/runtime error

Checks

docker compose ps
docker compose logs web
docker compose logs db

Recovery steps
	1.	confirm env vars exist
	2.	confirm db is healthy
	3.	run:

docker compose exec web npx prisma validate
docker compose exec web npx prisma generate


	4.	rebuild:

docker compose up --build


	5.	if build-specific, run:

docker compose exec web npm run build



Expected resolution
	•	app container remains running
	•	logs show server listening
	•	homepage reachable

⸻

2) DB migration failed

Symptoms
	•	deploy blocked
	•	Prisma migrate exits non-zero
	•	app starts but throws schema mismatch errors

Common causes
	•	invalid migration SQL
	•	migration conflicts with current DB state
	•	missing privilege
	•	destructive change
	•	drift between local and deployed DB

Checks

docker compose exec web npx prisma migrate status
docker compose exec web npx prisma validate
docker compose logs db

Recovery steps (dev)
	1.	inspect migration files
	2.	reset only if safe in local:

docker compose down -v
docker compose up --build
docker compose exec web npx prisma migrate dev


	3.	reseed if needed

Recovery steps (staging/prod)
	1.	stop and inspect; do not blindly rerun
	2.	determine whether issue is:
	•	migration SQL
	•	DB permissions
	•	existing data conflict
	3.	if non-destructive and understood, apply corrected follow-up migration
	4.	if risky, halt release and redeploy previous app version if possible

Do not
	•	manually edit applied migration history in production without plan
	•	run migrate dev in production

⸻

3) Auth broken

Symptoms
	•	users cannot log in
	•	401 loops
	•	callback errors
	•	session appears missing

Common causes
	•	wrong AUTH_SECRET
	•	wrong callback/base URL
	•	cookie domain mismatch
	•	provider credentials wrong
	•	session table/schema mismatch
	•	proxy/HTTPS config issue in deployed env

Checks
	•	inspect app logs
	•	confirm auth env vars
	•	test login locally and in target environment
	•	inspect cookies/session behavior in browser devtools

Recovery steps
	1.	confirm AUTH_SECRET present and stable
	2.	confirm app base URL/callback URL correct
	3.	confirm provider credentials (if using OAuth)
	4.	if DB sessions used, confirm session tables exist and app can access DB
	5.	redeploy after env fix if needed

Emergency fallback

If auth provider integration is broken and internal access is critical, consider enabling a temporary controlled local/dev-only auth path, but never bypass auth in production without explicit documented approval.

⸻

4) AI costs spiking

Symptoms
	•	sudden increase in token usage/spend
	•	repeated AI requests from one user/org
	•	high volume of 429s or retry loops

Common causes
	•	missing rate limit
	•	frontend retry loop
	•	abusive user behavior
	•	prompt unexpectedly too large
	•	logging/debug script hitting endpoint repeatedly

Checks
	•	inspect AI request logs by user/org/feature
	•	inspect latency and error rate
	•	inspect top endpoints by frequency
	•	confirm quotas and rate limiting active

Recovery steps
	1.	temporarily disable AI endpoint if needed
	2.	reduce org/user quotas
	3.	patch retry loop in client
	4.	lower prompt/input size cap
	5.	move expensive feature behind ops-only flag if necessary

Prevention
	•	daily and monthly budget alerts
	•	per-org caps
	•	clear fallback/manual path
	•	audit usage in dashboard/logs

⸻

5) On-call notes (even if solo)

On-call goals
	•	restore service quickly
	•	protect data integrity
	•	avoid making issue worse under pressure

Minimal Phase 1 on-call checklist

When incident starts:
	1.	note time and environment
	2.	identify scope:
	•	all users?
	•	one role?
	•	one feature?
	3.	check:
	•	app logs
	•	DB health
	•	auth status
	•	recent deploy/migration
	4.	decide:
	•	rollback
	•	hotfix
	•	temporary feature disable
	5.	record:
	•	root cause summary
	•	resolution
	•	follow-up action

Solo operator note

Even if you are the only operator:
	•	keep incident notes in a markdown file or issue
	•	write down the exact commands used
	•	record what fixed it
	•	convert repeated incidents into permanent runbook updates

⸻

PR checklist

Every infra-affecting PR should include:

Required review items
	•	Docker or compose changes reviewed
	•	Prisma migration reviewed
	•	secrets impact noted
	•	deployment implications stated
	•	rollback implication stated

Required evidence
	•	CI logs showing green checks
	•	build output
	•	migration output if schema changed
	•	screenshots/recording if UI affected
	•	updated docs if behavior/process changed

Required PR notes
	•	what changed
	•	whether migration is included
	•	whether env vars changed
	•	whether manual deployment step is required
	•	how to verify after deploy

⸻

Recommended repo commands the project should support

From repo root, the repo should ideally support:

npm run lint
npm run test
npm run build
docker compose up --build

From apps/web, the repo should ideally support:

npx prisma format
npx prisma validate
npx prisma generate
npx prisma migrate dev
npx prisma migrate deploy
npx prisma db seed

If these do not yet exist, add them in the implementation PR.

⸻

Suggested service health checks

If feasible in Phase 1, add:
	•	/api/health or equivalent lightweight route
	•	DB connectivity check in startup logs
	•	auth config sanity logs (non-secret)
	•	optional /api/ready later for deeper readiness checks

Health check should not leak secrets or internal config.

⸻

Runbook maintenance rules

This runbook must be updated when any of the following changes:
	•	local dev startup flow
	•	docker-compose services
	•	auth env vars
	•	deployment target
	•	migration process
	•	secret handling strategy
	•	AI provider/runtime controls

Treat this doc as operational source of truth, not a one-time writeup.

⸻

Committable files
	•	Filename/path: docs/phase-1/08-infra-runbook.md
	•	Branch: phase-1/infra-runbook
	•	Commit message: docs: add Phase 1 infra runbook
	•	PR title: Phase 1: Add infra/runbook

⸻

Verification steps

Review checklist
	•	environment descriptions are accurate
	•	local commands are copy/paste usable
	•	CI flow is clear for PR vs main
	•	migration guidance differentiates dev vs prod
	•	secret handling is separated by local/CI/prod
	•	deployment and rollback steps are actionable
	•	all required operational playbooks are present

Commands to run (if repo exists)

From repo root:

docker compose up --build

Then:

docker compose exec web npx prisma format
docker compose exec web npx prisma validate
docker compose exec web npm run lint
docker compose exec web npm test --if-present
docker compose exec web npm run build

If seed is configured:

docker compose exec web npx prisma db seed

Evidence to capture
	•	successful docker compose up logs
	•	Prisma validation output
	•	green CI logs
	•	screenshot/recording of app loading locally
	•	migration output for schema-changing PRs

