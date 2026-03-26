---
id: phase1-ui-spec-uk-commodity-gateway
title: "Phase 1 UI Specification — <APP_NAME> (Stitch-First, Implementation-Ready)"
status: draft
owner: Product + Engineering Lead
last_updated: 2026-03-24
related_docs:
  - docs/phase-1/00-project-brief.md
  - docs/phase-1/01-prd.md
  - docs/phase-1/02-user-journeys.md
  - docs/phase-1/03-acceptance-criteria.md
stitch_assets:
  - <STITCH_PROJECT_LINK_OR_TBD>
  - docs/design/DESIGN.md (source of truth)
---

# 1. Design Principles

## Tone
- **High-trust, financial-grade, operational clarity**
- Calm, minimal, no visual noise
- Emphasis on **decision-making clarity**, not decoration

## Density
- Medium-high density
- Tables, timelines, and structured layouts preferred over cards where possible

## Accessibility
- WCAG AA contrast minimum
- Keyboard navigable
- No critical action relies on icon-only
- Status always includes **text + color**

---

# 2. Theme Decision (Critical)

**Phase 1 = DARK MODE ONLY**

- No light mode support in Phase 1
- All tokens and components must conform to dark theme

---

# 3. Design Tokens (Semantic System)

## Base Tokens

```css
--bg: #0B0F14;
--surface-1: #111827;
--surface-2: #1F2937;
--surface-3: #243041;

--border: #2D3748;

--text-primary: #E5E7EB;
--text-secondary: #9CA3AF;
--text-tertiary: #6B7280;

--primary: #2F6BFF;
--primary-hover: #1E4ED8;

--success: #16A34A;
--warning: #F59E0B;
--danger: #EF4444;


⸻

Status Tokens

--status-approved-bg: rgba(22,163,74,0.15);
--status-approved-text: #16A34A;

--status-rejected-bg: rgba(239,68,68,0.15);
--status-rejected-text: #EF4444;

--status-pending-bg: rgba(245,158,11,0.15);
--status-pending-text: #F59E0B;

--status-active-bg: rgba(47,107,255,0.15);
--status-active-text: #2F6BFF;


⸻

Radius / Shadows

--radius-sm: 6px;
--radius-md: 10px;
--radius-lg: 16px;

--shadow-sm: 0 1px 2px rgba(0,0,0,0.2);
--shadow-md: 0 4px 12px rgba(0,0,0,0.3);


⸻

4. Typography System

Usage	Size	Weight	Line Height
H1	28px	600	1.3
H2	22px	600	1.4
H3	18px	500	1.4
Body	14–16px	400	1.5
Caption	12px	400	1.4

Rules
	•	Use Inter
	•	Tables use tabular numbers
	•	Buttons use medium weight (500)

⸻

5. Core Component Specifications

Buttons

Variants:
	•	Primary (filled blue)
	•	Secondary (outline)
	•	Destructive (red)

States:
	•	default
	•	hover
	•	disabled
	•	loading (spinner + disabled)

Rules:
	•	No multiple primary buttons per section
	•	Loading disables interaction

⸻

Inputs

Types
	•	Text
	•	Select
	•	File Upload
	•	Textarea (AI-enabled)

States
	•	default
	•	focused
	•	error (red border + message)
	•	disabled

⸻

File Upload Component

States:
	•	idle (drop zone)
	•	uploading (progress bar)
	•	success (file preview + replace)
	•	error (retry button)

Rules:
	•	Max 50MB
	•	Accept defined formats only
	•	Versioning supported (new upload does not overwrite old)

⸻

Tables

Structure:
	•	Sticky header
	•	Sortable columns
	•	Pagination (server-side)

Columns must define:
	•	label
	•	data type
	•	sortability

⸻

Status Pills (Canonical)

Each status must include:
	•	color
	•	label
	•	optional icon

Example:
	•	APPROVED → green
	•	REJECTED → red
	•	PENDING → yellow

⸻

6. Screen Inventory + Anatomy

Buyer Dashboard

Layout order
	1.	KPI cards (top)
	2.	RFQ table
	3.	Quote table
	4.	Active cases

States
	•	loading: skeleton rows + cards
	•	empty: “No RFQs yet” CTA
	•	error: retry panel

⸻

RFQ Wizard

Sections:
	•	Commodity
	•	Volume
	•	Destination
	•	Notes / AI input

States:
	•	loading (draft init)
	•	submitting (disabled button)
	•	validation errors (inline)
	•	failure (preserve data)

⸻

Trade Case View (CRITICAL SCREEN)

Layout
	1.	Case header (status + next milestone)
	2.	Timeline (left)
	3.	Document checklist (center)
	4.	Activity / issues panel (right)

States
	•	loading: skeleton timeline
	•	empty: no docs uploaded
	•	error: retry fetch
	•	success: full case view

⸻

Document Review (Ops)

Layout:
	•	Table (doc type, status, actions)
	•	Inline approve/reject buttons

States:
	•	loading
	•	empty
	•	success
	•	error

⸻

7. Responsive Behaviour

Breakpoints
	•	Mobile < 768px
	•	Tablet 768–1024px
	•	Desktop > 1024px

Rules

Desktop-first (PRIMARY)
	•	Full functionality

Tablet
	•	Sidebar collapses
	•	Tables scroll horizontally

Mobile
	•	Ops screens NOT supported fully
	•	Buyer RFQ + tracking only
	•	Tables → stacked cards

⸻

8. UI States (Global + Per Screen)

Every interactive element must support:
	•	loading
	•	empty
	•	submitting
	•	success
	•	error

Mutation states
	•	Buttons show spinner
	•	Disabled during request

Network failure
	•	Show retry CTA
	•	Preserve state locally

⸻

9. Implementation Notes (Next.js)

Server Components
	•	Tables
	•	Dashboards
	•	Case data

Client Components
	•	Forms
	•	Modals
	•	File uploads
	•	AI streaming

Structure

apps/web/components/
apps/web/app/(dashboard)/
packages/ui/


⸻

10. Design-to-Code Contract (STRICT)

Source of Truth
	1.	PRD + UI Spec (primary)
	2.	DESIGN.md (visual reference)
	3.	Stitch outputs (secondary)

If conflict:
→ PRD/UI Spec wins unless updated

⸻

Required Assets

Each screen must include:
	•	PNG export
	•	Component list
	•	Layout notes

Naming convention:
	•	buyer-dashboard-v1.png
	•	trade-case-v1.png

⸻

Required Evidence per PR
	•	Before/after screenshots
	•	PR diff
	•	Optional Loom walkthrough

⸻

11. Stitch Prompts (Improved)

Prompt 1 — Buyer Dashboard

“Design a desktop-first Buyer Dashboard for a trade operations SaaS. Include top KPI cards (Open RFQs, Pending Quotes, Active Cases), a sortable RFQ table with status pills, and an empty state with CTA. Dark mode, finance-grade UI.”

⸻

Prompt 2 — Trade Case

“Design a Trade Case screen with a left timeline, central document checklist, and right activity panel. Include status pills, blocked states, and milestone indicators. Dark mode, high-density layout.”

⸻

Prompt 3 — Document Review

“Design a document management interface with table rows showing document type, status, and inline approve/reject actions. Include rejection modal with reason field.”

⸻

Prompt 4 — RFQ Wizard

“Design a multi-step RFQ form with structured inputs and AI-assisted text parsing section. Include validation states and submission loading state.”

⸻

Prompt 5 — Supplier Dashboard

“Design a supplier dashboard showing assigned cases, required documents, and upload progress. Include file upload states and task indicators.”

⸻

12. Committable Files
	•	Path: docs/phase-1/04-ui-spec.md
	•	Branch: phase-1/ui-spec-final
	•	Commit: finalize UI specification
	•	PR: Phase 1 UI Spec (Final)

⸻

13. Verification Steps

Review
	•	Tokens fully defined
	•	Components have states + variants
	•	All screens have anatomy + states
	•	Responsive rules defined

Commands
	•	npm run lint
	•	npm run build

Artefacts
	•	Stitch exports
	•	UI screenshots
	•	PR diff

