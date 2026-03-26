# UK Commodity Gateway — Design System (Phase 1)

## Design Philosophy
High-trust, financial-grade, operational clarity. Medium-high information density. Phase 1 is **dark mode only** — no light mode.

## Color Tokens

### Backgrounds
| Token | Value | Usage |
|---|---|---|
| `--bg-base` | `#0B0F14` | Page background |
| `--bg-surface` | `#111827` | Cards, panels |
| `--bg-surface-raised` | `#1F2937` | Modals, dropdowns |
| `--bg-surface-overlay` | `#243041` | Tooltips, popovers |

### Borders & Dividers
| Token | Value |
|---|---|
| `--border-default` | `#2D3748` |
| `--border-focus` | `#2F6BFF` |

### Accent Colors
| Token | Value | Usage |
|---|---|---|
| `--color-primary` | `#2F6BFF` | CTAs, active states |
| `--color-success` | `#16A34A` | Approved, completed |
| `--color-warning` | `#F59E0B` | Pending, attention |
| `--color-danger` | `#EF4444` | Rejected, errors, destructive |

### Status Tokens
| Status | Background | Text | Border |
|---|---|---|---|
| Approved | `#16A34A/10%` | `#16A34A` | `#16A34A/30%` |
| Rejected | `#EF4444/10%` | `#EF4444` | `#EF4444/30%` |
| Pending | `#F59E0B/10%` | `#F59E0B` | `#F59E0B/30%` |
| Active | `#2F6BFF/10%` | `#2F6BFF` | `#2F6BFF/30%` |
| Draft | `#6B7280/10%` | `#6B7280` | `#6B7280/30%` |

### Text
| Token | Value | Usage |
|---|---|---|
| `--text-primary` | `#F9FAFB` | Headings, primary content |
| `--text-secondary` | `#D1D5DB` | Body text |
| `--text-muted` | `#9CA3AF` | Captions, hints |
| `--text-disabled` | `#6B7280` | Disabled states |

---

## Typography
- **Font:** Inter (system fallback: -apple-system, sans-serif)
- H1: 28px / 600 weight
- H2: 22px / 600 weight
- H3: 18px / 500 weight
- Body: 14–16px / 400 weight
- Caption: 12px / 400 weight

---

## Spacing & Radius
- Border radius: `6px` (inputs), `10px` (cards), `16px` (modals)
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64px

---

## Component Specs

### Buttons
- **Primary:** `--color-primary` bg, white text. Hover: darken 10%.
- **Secondary:** transparent bg, `--border-default` border, `--text-secondary` text.
- **Destructive:** `--color-danger` bg, white text.
- **All states:** default, hover, disabled (50% opacity), loading (spinner replacing label).

### Inputs
- Background: `--bg-surface`
- Border: `--border-default`, focus: `--border-focus` + ring
- Label above, error message below in `--color-danger`
- Placeholder: `--text-disabled`

### Tables
- Sticky header row
- Sortable columns with indicator
- Server-side pagination (default 20, max 100)
- Row hover: `--bg-surface-raised`

### Status Pills
- Rounded badge: color bg (10% opacity) + matching text + optional icon
- Always pair color with text label (accessibility)

### File Upload
- States: idle, uploading (progress bar), success (checkmark), error (retry)
- Max 50MB per file
- Drag-and-drop + click-to-browse

---

## Screen Inventory (Phase 1)

### Buyer Screens
1. **Dashboard** — KPI cards (Open RFQs, Pending Quotes, Active Cases) + tables
2. **RFQ Wizard** — Commodity, Volume, Destination, Notes/AI input sections
3. **Quote View** — Quote details + accept/decline actions
4. **Trade Case View** — Header + Timeline (left) + Documents (center) + Activity (right)

### Ops Screens
1. **Queue** — All pending items across workflow
2. **RFQ Review + Quote Builder** — RFQ detail + quote creation form
3. **Document Review Inbox** — Table with inline approve/reject + rejection modal

### Supplier Screens
1. **Onboarding** — Basic verification flow
2. **Assigned Cases** — Cases assigned via lot allocation
3. **Document Upload Center** — Required docs list + upload progress

---

## Responsive Breakpoints
- Mobile: < 768px
- Tablet: 768–1024px
- Desktop: > 1024px
- Ops screens are desktop-optimized (not fully supported on mobile)

---

## Implementation Notes
- Use CSS custom properties for tokens (Tailwind config maps to these)
- Server Components for data display, Client Components for interactivity
- Shared components in `packages/ui/`, app-specific in `apps/web/components/`
- WCAG AA contrast minimum
- Keyboard navigable
- Priority: PRD + UI Spec > DESIGN.md > Stitch outputs
