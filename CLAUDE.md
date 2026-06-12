@AGENTS.md

# BFS Inventory — Claude Code Context

## What this is

A Next.js 16 web app replacing the Excel-based inventory workflow for **Beauty First / Beauty Logix** warehouse (`order@beautylogix.ca`). The goal is stock-level visibility and automated low-stock notifications — transactions still happen in QuickBooks.

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

## Current Data State (as of 2026-06-12)

- **847 active products** (81 Inverness products disabled — direct supplier to stores)
- **665 stock records** synced from QB ProductServiceList export
- **3,480 monthly sales records** from QB Sales Detail (April 2025 – March 2026)
- **562 products** have calculated reorder points and reorder quantities
- **Local brands** (Beauty First, Desembre, Fernanda's, Refectocil) → 2-month stock target, 14-day lead time
- **International brands** (all others) → 6-month stock target, 45-day lead time
- **Disabled locations**: BF Inverness, BLX Inverness (direct-supply, `isActive = false`)

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

### ❌ Remaining

| # | Feature | Notes |
|---|---|---|
| 14 | Shopify Integration | Sync sales data from Shopify |
| 16 | Authentication | better-auth installed + schema ready; login/signup UI not built |

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

## Key Gotchas

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
