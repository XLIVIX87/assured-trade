# UK Commodity Gateway — Agent Operating Manual

## Project Overview
Assured Trade Deal Desk: a case-managed platform facilitating commodity trade between UK/EU buyers and Nigerian suppliers. Phase 1 = MVP deal desk (not a marketplace).

## Source of Truth
All Phase 1 specs live in `docs/phase-1/`. When in doubt, defer to these docs over any design tool output.

---

## Quick Commands

### Local Development
```bash
# First time setup
npm install
cp apps/web/.env.example apps/web/.env.local  # then fill in secrets

# Start everything (web + db)
docker compose up --build

# Apply Prisma migrations (in another terminal)
docker compose exec web npx prisma migrate dev

# Seed database with demo data
docker compose exec web npx prisma db seed

# Run web dev server directly (without Docker)
cd apps/web && npm run dev
```

### Testing
```bash
npm run test              # unit + integration tests
npm run test:e2e          # Playwright E2E tests
npm run lint              # ESLint
npm run typecheck         # TypeScript type checking
npm run build             # Next.js production build
```

### Prisma
```bash
cd apps/web
npx prisma migrate dev --name <migration_name>   # create migration (dev only)
npx prisma migrate deploy                         # apply migrations (CI/prod)
npx prisma generate                               # regenerate client
npx prisma db seed                                # seed data
npx prisma studio                                 # visual DB browser
npx prisma format                                 # format schema
npx prisma validate                               # validate schema
```

### Docker
```bash
docker compose up --build          # start all services
docker compose down                # stop all services
docker compose down -v             # stop + remove volumes (wipes DB)
docker compose logs -f web         # tail web logs
```

---

## Coding Standards

### General
- TypeScript strict mode, no `any` unless absolutely necessary.
- Prefer named exports.
- Use `const` by default; `let` only when mutation is needed.
- No unused imports or variables.

### File Naming
- Components: `PascalCase.tsx` (e.g., `RfqWizard.tsx`)
- Utilities/libs: `camelCase.ts` (e.g., `requireSession.ts`)
- Route Handlers: `route.ts` inside path-based directories
- Types: co-locate with usage or in `types.ts` alongside the module

### API Layer
- All Route Handlers in `apps/web/app/api/**/route.ts`.
- Every handler starts with `requireSession()` + role/org checks.
- Use Zod for request validation.
- Return consistent envelope: `{ data, meta: { requestId, timestamp } }`.
- Errors: `{ error: { code, message, details }, meta }`.
- Log structured events; NEVER log secrets, session tokens, or full signed URLs.
- Idempotent for: quote acceptance, close-out generation, doc approval/rejection.

### UI Layer
- Server Components for data-fetching (tables, dashboards, case data).
- Client Components for interactivity (forms, modals, file uploads, AI streaming).
- Every screen must handle 5 states: loading, empty, error, success, submitting.
- Dark mode only (Phase 1). Follow design tokens in DESIGN.md.
- Status indicators: always text + color (not color alone).

### Database
- Prisma is the only ORM.
- Organization-scoped multi-tenancy: every business entity scoped by org.
- Prefer soft disable over hard delete for critical entities.
- AuditEvents, TradeCases, and approved Documents are NEVER hard-deleted.
- Never run `prisma migrate dev` in production — use `prisma migrate deploy`.

### Auth & RBAC
- Auth.js for session management.
- Three roles: BUYER, SUPPLIER, OPS.
- RBAC enforced at API layer (not UI only).
- Guard utilities: `requireSession()`, `requireRole()`, `requireOrgAccess()`.
- No cross-org data access.

### AI
- AI features are optional and disabled by default.
- No auto-decisions — AI is assistive only.
- Server-side only (no NEXT_PUBLIC_ AI env vars).
- Rate-limited, schema-validated, with timeouts.
- Prompt injection defense: user input = data, never instructions.

### Testing
- Integration tests must map to AC IDs (AC-001 through AC-016).
- RBAC must be tested: unauthorized access returns 401/403.
- Close-out blocked if required docs not approved.
- Document rejection requires reason.

---

## Quality Gates (Non-Negotiable)
- Every PR must reference AC IDs (AC-###).
- RBAC/org scoping enforced in Route Handlers.
- All screens must have loading/empty/error/submitting states.
- Close-out pack requires all required docs approved.
- AI endpoints server-side only, disabled by default, rate-limited and schema-validated.
- Logs must not contain secrets or full signed URLs.
- Idempotent operations: quote acceptance, close-out, doc approval/rejection.

---

## Monorepo Structure
```
apps/
  web/                    # Next.js application
    app/
      api/                # Route Handlers
      (dashboard)/        # Buyer/Ops authenticated pages
      (supplier)/         # Supplier authenticated pages
      (auth)/             # Login/signup pages
    components/           # App-specific components
    lib/                  # Shared utilities (auth, rbac, validation, etc.)
    prisma/               # Schema, migrations, seed
packages/
  ui/                     # Shared component library
docs/
  phase-1/               # Phase 1 specification documents
```

---

## Branch Strategy
- `main` — stable, deployable
- `feat/<slice-name>` — feature branches per implementation slice
- PRs require: lint + typecheck + tests passing

## PR Description Template
```
## Changes
<summary>

## AC Coverage
- AC-### — <description>

## Commands Run
- npm run lint ✓
- npm run build ✓
- npm test ✓
```
