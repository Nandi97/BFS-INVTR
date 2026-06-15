@AGENTS.md

# BFS Inventory — Claude Code Context

## What this is

A Next.js 16 web app replacing the Excel-based inventory workflow for **Beauty First / Beauty Logix** warehouse (`order@beautylogix.ca`). The goal is stock-level visibility and automated low-stock notifications — transactions still happen in QuickBooks.

**Production URL**: `https://bfs.kigtech.digital`
**Hosting**: Vercel (Pro — cron jobs enabled)
**Database**: Neon PostgreSQL (shared between local dev and prod — same `DATABASE_URL`)

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.2.9, App Router, React 19, TypeScript |
| Database | PostgreSQL via Prisma 7 (Neon) |
| Auth | better-auth 1.6 |
| UI | shadcn (radix-nova style) + Tailwind 4 |
| Data fetching | TanStack Query v5 + axios |
| Forms | react-hook-form + Zod 4 |
| Charts | recharts |
| Email | nodemailer (Gmail app password) |
| Font | Plus Jakarta Sans → `--font-sans` (variable set directly on `<body>`) |
| Excel generation | ExcelJS v4 (email attachments + reports) |

---

## Critical Prisma 7 Rules

- **No `url` in `datasource` block** — connection config lives in `prisma.config.ts`
- **Client generates to** `../generated/prisma/client.ts`
- **Adapter required** — uses `PrismaPg` with `pg.Pool`
- **Import path**: `import { prisma } from "@/lib/prisma"`
- **After schema changes**: run `npx prisma migrate deploy` then **restart the dev server** — the running server caches the old compiled Prisma client and won't see new fields until restart

## Critical Zod 4 Rules

- Use `z.number()` not `z.coerce.number()` (coerce returns `ZodPipe`, breaks resolver)
- Use `valueAsNumber` on number inputs: `onChange={(e) => field.onChange(e.target.valueAsNumber)}`
- `invalid_type_error` option removed — use `error` or omit

## radix-ui Bundled Package

All Radix imports come from the single bundled `radix-ui` package, **not** individual `@radix-ui/*` packages:

```ts
import { Label as LabelPrimitive, Slot } from "radix-ui";
// Use .Root sub-components:
<LabelPrimitive.Root />
<Slot.Root />
```

---

## Layout Structure

```
app/(dashboard)/layout.tsx          ← reads sidebar:state cookie, SidebarProvider
  AppSidebar                        ← collapsible="icon", cookie persisted
  SidebarInset
    AppHeader                       ← breadcrumbs + theme toggle + user nav
    <div className="flex flex-1 flex-col gap-6 p-6 overflow-y-auto">
      {children}                    ← all pages get p-6 gap-6 automatically
```

Each page uses `<div className="space-y-6">` — no extra padding wrapper needed.

---

## Database Seed & Setup

```bash
npx prisma db seed              # seeds BF Warehouse location
npx prisma migrate deploy       # applies all migrations
npx tsx --env-file=.env scripts/seed-lead-times.ts   # brand lead times + disable direct-supply locations
npx tsx --env-file=.env scripts/set-local-target-months.ts  # sets local brands to 2-month stock target
```

## Warehouse Data Import

Product catalog (919 products) and opening stock (640 records) were imported from the Excel spreadsheet:

```bash
python3 -m venv /tmp/bfs-venv
/tmp/bfs-venv/bin/pip install requests openpyxl xlrd
/tmp/bfs-venv/bin/python3 scripts/import_warehouse.py     # products + opening stock from Excel
/tmp/bfs-venv/bin/python3 scripts/import_qb_data.py all  # stock + sales from QB exports + recalculate
```

The QB import script reads two files from Google Drive:
- `ProductServiceList__*.xls` — current stock quantities from QB
- `Beauty Logix Inc_Sales by Product_Service Detail.xlsx` — 12-month sales history

```bash
# Run individual steps if needed:
/tmp/bfs-venv/bin/python3 scripts/import_qb_data.py stock     # stock quantities only
/tmp/bfs-venv/bin/python3 scripts/import_qb_data.py sales     # sales history only
/tmp/bfs-venv/bin/python3 scripts/import_qb_data.py minimums  # recalculate reorder points only
```

---

## Current Data State (as of 2026-06-15)

- **847 active products** (81 Inverness products disabled — direct supplier to stores)
- **665 stock records** synced from QB ProductServiceList export
- **3,480 monthly sales records** from QB Sales Detail (April 2025 – March 2026)
- **562 products** have calculated reorder points and reorder quantities
- **Local brands** (Beauty First, Desembre, Fernanda's, Refectocil) → 2-month stock target, 14-day lead time
- **International brands** (all others) → 6-month stock target, 45-day lead time
- **Disabled locations**: BF Inverness, BLX Inverness (direct-supply, `isActive = false`)
- **QB Integration**: Production OAuth connected (Realm ID: 123145858555379), refresh token valid until ~Sep 2026

---

## Feature Status

### ✅ Done

| # | Feature | Key files |
|---|---|---|
| — | UI Shell | `components/app-header.tsx`, `components/app-sidebar.tsx`, `app/(dashboard)/layout.tsx`, `lib/font.ts` |
| 1–4 | Products, Brands, Categories, Dashboard | `app/(dashboard)/products/`, `app/(dashboard)/dashboard/` |
| 5 | Stock & Locations | `app/api/stock/`, `app/api/locations/`, `app/(dashboard)/stock/` |
| 6 | Reorder Management | `app/api/reorder/`, `app/(dashboard)/reorder/` |
| 7 | Supplier Management | `app/api/suppliers/`, `app/(dashboard)/suppliers/` |
| 8 | Purchase Orders | `app/api/purchase-orders/`, `app/(dashboard)/purchase-orders/` |
| 9 | Email Notifications | `app/api/notifications/`, `lib/mailer.ts`, `lib/notification-engine.ts` |
| 10 | Sales History / Analytics | `app/api/sales/`, `app/(dashboard)/analytics/` |
| 11 | Reports | `app/api/reports/`, `app/(dashboard)/reports/` |
| 12 | Import / Export | `app/api/import/`, `app/api/export/`, `app/(dashboard)/import-export/` |
| 13 | QB Integration | `app/api/integrations/quickbooks/`, `hooks/use-integrations.ts`, `components/integrations/`, `app/(dashboard)/integrations/` |
| 15 | Settings | `app/api/settings/stock-policy/`, `components/settings/`, `app/(dashboard)/settings/` |
| 16 | Authentication | `lib/auth.ts`, `lib/auth-client.ts`, `app/(auth)/login/`, `middleware.ts` |

### ❌ Remaining

| # | Feature | Notes |
|---|---|---|
| 14 | Shopify Integration | Sync sales from Shopify. `IntegrationProvider.SHOPIFY` exists in schema. No routes, no UI, no sync logic. |

---

## QuickBooks Integration — Full Picture

QB is now live in production. Three sync modes exist:

| Mode | Route | Trigger | What it does |
|---|---|---|---|
| **Live stock sync** | `POST /api/integrations/quickbooks/items` | UI button / cron | Fetches `QtyOnHand` from QB Items API → upserts inventory |
| **Live sales sync** | `POST /api/integrations/quickbooks/sync-sales-api` | UI button / cron | Fetches `SalesByProductServiceSummary` report (last 12 months) → upserts SalesRecord |
| **XLS file import** | `POST /api/integrations/quickbooks/sync-stock` | UI file upload | Parses uploaded `ProductServiceList__*.xls` → upserts inventory |
| **CSV paste import** | `POST /api/integrations/quickbooks/sync-stock` | UI text area | Same route, rows from CSV paste |
| **Sales CSV import** | `POST /api/integrations/quickbooks/sync-sales` | UI text area | Parses QB Sales Detail CSV (flat or wide format) |

**Nightly cron**: `GET /api/cron/sync` — runs at 06:00 UTC (02:00 EST). Protected by `CRON_SECRET` env var (`Authorization: Bearer <secret>`). Calls both live sync routes sequentially.

**OAuth token storage**: tokens live in `IntegrationConfig.config.oauth` (JSON). Access token auto-refreshes when <2 min from expiry. Refresh token expires ~Sep 2026 — if it expires, user must re-connect via `/integrations` → Settings tab.

**Local dev**: same Neon DB as prod. Once QB is connected on prod, local dev can make live QB API calls without re-authenticating (tokens are in shared DB). Set `QBO_ENVIRONMENT=production` in `.env`.

**QB redirect URI** (must be registered in Intuit portal):
```
https://bfs.kigtech.digital/api/integrations/quickbooks/callback
```

### QB API Opportunities (not yet built)

| Opportunity | Value | Effort |
|---|---|---|
| Pull QB Vendors → auto-populate Suppliers | High — keeps vendor data in sync | Low |
| Pull `Item.UnitCost` during stock sync | Medium — enables stock valuation without manual cost entry | Low (add to existing items sync) |
| Push BFS Purchase Orders → QB POs | High — closes procurement loop, prevents duplicate orders | Medium |
| Email admin if refresh token <7 days from expiry | High — prevents silent integration breakage | Low |

---

## Authentication

**Current state**: GitHub + Google OAuth working. Email/password auth not implemented.

- Login page: `app/(auth)/login/page.tsx`
- better-auth config: `lib/auth.ts` (socialProviders: github + google)
- Middleware allowlist: `middleware.ts` — specific emails + `@beautylogix.ca` / `@beautyfirstspa.com` domains
- Session: 7-day expiry, 24-hour sliding update

**What's missing**:
- No user role management UI — all new users default to `VIEWER`. No way for admin to promote to `MANAGER`/`ADMIN` without direct DB edit.
- No role enforcement in API routes — middleware checks auth + email, but routes don't verify `user.role` before allowing PO creation, supplier deletion, etc.
- No email/password fallback — if Google/GitHub OAuth is down, no login path exists.

**Legal pages** (public, no auth required):
- `https://bfs.kigtech.digital/legal/privacy`
- `https://bfs.kigtech.digital/legal/terms`
- Added to `PUBLIC_PATHS` in middleware. Required by Intuit for production QB OAuth approval.

---

## Settings Page — Stock Policy

The `/settings` page has two tabs:

**Stock Policy tab** (`/api/settings/stock-policy`):
- Per-product `targetStockMonths` (Int, default 6) — drives `reorderQty = ceil(avgMonthly × targetStockMonths)`
- Accordion grouped by brand; quick-set buttons (1/2/3/6/9/12 mo) per brand header
- Sticky save bar appears when there are unsaved changes
- "Recalculate" button calls `/api/inventory/calculate-minimums` to push values to inventory

**Brand Lead Times tab**:
- Editable `leadTimeDays` per brand (inline edit, Enter/Escape)
- Drives `reorderPoint = ceil(avgMonthly × (leadTimeDays + 7) / 30)`

---

## Reorder / Minimums Formulas

```
reorderPoint  = ceil(avgMonthly × (leadTimeDays + 7) / 30)   ← when to trigger an order
minQuantity   = ceil(avgMonthly × 7 / 30)                    ← 1-week safety buffer
reorderQty    = ceil(avgMonthly × targetStockMonths)          ← how much to order
```

`avgMonthly` = average of last 12 months of `SalesRecord.quantity`.
Products with no sales data are skipped by calculate-minimums.

---

## Backlog (Prioritised)

### High priority

| Item | Notes |
|---|---|
| Role-based API checks | Routes don't verify `user.role`. Any authenticated allowlisted user can create/delete POs, suppliers, etc. Add ADMIN/MANAGER check on write routes. |
| User admin panel | No UI to view users or change roles. First admin must be set directly in DB. |
| QB refresh token expiry alert | Email admin if `refreshTokenExpiresAt` < 7 days. Can run in the nightly cron. |
| Empty states | Tables show blank space when empty. Add icon + message + action button (e.g. "No suppliers yet — Add one"). |

### Medium priority

| Item | Notes |
|---|---|
| QB Vendor sync | `GET /api/integrations/quickbooks/vendors` → auto-populate Suppliers. One-time + on-demand. |
| QB unit cost sync | Pull `Item.UnitCost` during existing items sync → populate `ProductSupplier.cost`. Enables accurate stock valuation. |
| Reorder bulk actions | Multi-select rows → "Create PO for selected" or "Export selected". Currently only per-row actions. |
| PO → QB push | Create QB PurchaseOrder when a BFS PO is sent. Requires QB PO API + vendor/item ID mapping. |
| Dashboard KPI deltas | Add ±N trend vs prior week to each KPI card. Data already exists in StockMovement + SalesRecord. |
| Analytics date range picker | Analytics charts show fixed period. A date range selector would make it useful for ad-hoc queries. |
| Mobile table responsiveness | Wide tables (products, stock, reorder) need `overflow-x-auto` wrapper. Currently break layout at <768px. |
| Error boundaries | Pages use `<Suspense>` but no `error.tsx` boundaries. A single component throw crashes the whole page section. |

### Low priority / nice-to-have

| Item | Notes |
|---|---|
| Shopify integration | Sync Shopify sales → SalesRecord (complements QB). `IntegrationProvider.SHOPIFY` already in schema. |
| Product image gallery | `Product.imageUrl` field exists, UploadThing wired. Just needs upload UI in product form + thumbnail in table. |
| PO status timeline | Show DRAFT → SENT → RECEIVED steps with timestamps on PO detail. |
| Email/password auth | Fallback login if OAuth providers are down. better-auth supports it natively. |
| Test alert button per rule | "Send test email" on each alert rule in notifications page. |
| AppSetting usage | Schema has `AppSetting` model but nothing uses it. Move hardcoded constants (SAFETY_DAYS=7, default location name) there. |
| Observability | No error tracking. Add Sentry or Axiom for production error monitoring. |
| Rate limiting on sync routes | QB sync routes can be called without throttle. Could exhaust Intuit API quota. |

---

## Known Issues / Gotchas

- **axios baseURL is `/api`** — all hook paths must NOT include `/api/` prefix (e.g. `/stock` not `/api/stock`). Double prefix causes 404s.
- **Font variable** — `lib/font.ts` sets `variable: "--font-sans"` directly on `<body>`. Never add an intermediate CSS variable; `:root` (`<html>`) cannot see variables set on its children.
- **Prisma client cache** — after any `prisma generate` / schema change, the dev server must be restarted. New fields return as `undefined` until restart even though the DB column exists.
- **Low stock filter (notification engine)** — uses `prisma.$queryRaw` for DB-level filtering. Do not revert to in-memory — it loads the entire table.
- **Low stock filter (stock page)** — Prisma ORM can't compare two columns. Fetch all, filter in JS. Fine for warehouse scale.
- **PO number generation** — queries last PO `startsWith` current year, increments + zero-pads to 3 digits (`PO-2026-001`).
- **Receive PO** — re-fetches all items after update to recalculate RECEIVED / PARTIALLY_RECEIVED status.
- **Negative QB quantities** — clamped to 0 on import. 96 rows in original spreadsheet were negative.
- **BF Inverness / BLX Inverness locations** — `isActive = false`. Direct-supply locations. Reorder page has "Include direct-supply locations" toggle.
- **Inverness products (81)** — `isActive = false`. Piercing/jewellery items delivered direct to stores; not warehoused.
- **Brand lead times** — local brands (Beauty First, Desembre, Fernanda's, Refectocil) = 14 days; all others = 45 days. Set via `scripts/seed-lead-times.ts`.
- **targetStockMonths** — per-product field (not brand). Local brands set to 2 via `scripts/set-local-target-months.ts`. International default = 6.
- **Email notifications** — alerts attach a styled XLSX (ExcelJS) instead of inline product tables. `lib/email-xlsx.ts` → `lib/mailer.ts` (`attachments?: MailAttachment[]`).
- **TanStack Query v5 `onSuccess`** — inline callbacks need explicit type annotations: `onSuccess: (result: MyType) => { ... }`.
- **chart.tsx** — has `// @ts-nocheck` (recharts type incompatibilities with shadcn-starter copy). Do not remove.
- **`qty < 0` guard in adjust route** — allows correction-to-zero; `qty < 0` not `qty <= 0`.
- **QB sales sync stores quantity: 0 when QB API returns no qty** — `SalesByProductServiceSummary` report may not include unit qty for some report configurations; revenue is stored but quantity may be 0. Reorder formulas use `SalesRecord.quantity` — verify QB report returns Qty column after first live sales sync.
- **Shared Neon DB** — local dev and prod point to the same database. Destructive scripts (seed, reimport) run against live data. Always confirm before running import scripts locally.
- **Cron route auth** — `GET /api/cron/sync` requires `Authorization: Bearer <CRON_SECRET>`. Must be set in both `.env` (local) and Vercel environment variables (prod). Vercel native cron sends this header automatically.
