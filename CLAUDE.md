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

## Component Structure Convention

All page routes under `app/(dashboard)` and `app/(auth)` are **thin entry points** (5–15 lines: route params, metadata, one component render). All UI logic lives in `components/<module>/`:

```
components/<module>/
  dashboard/   ← list/overview page component (e.g. products-dashboard.tsx)
  create/      ← shared add-or-edit form (e.g. product-form.tsx)
  view/        ← detail page component (e.g. product-view.tsx, po-detail-sheet.tsx)
```

Not every module uses all three subdirs — only what the feature requires.

Examples:
- `components/products/dashboard/products-dashboard.tsx` → rendered by `app/(dashboard)/products/page.tsx`
- `components/products/create/product-form.tsx` → shared add/edit form
- `components/products/view/product-view.tsx` → rendered by `app/(dashboard)/products/[id]/page.tsx`
- `components/auth/login-view.tsx` → rendered by `app/(auth)/login/page.tsx`

**Do not add logic back into `page.tsx` files** — they stay thin wrappers.

---

## Database Seed & Setup

```bash
npx prisma db seed              # seeds BF Warehouse location
npx prisma migrate deploy       # applies all migrations
npx tsx --env-file=.env scripts/seed-lead-times.ts   # brand lead times + disable direct-supply locations
npx tsx --env-file=.env scripts/set-local-target-months.ts  # sets local brands to 2-month stock target
```

## Warehouse Data Import

Product catalog (919 products) and opening stock (640 records) were imported from the Excel spreadsheet. QB is now the live source of truth — the scripts below were one-time bootstrap only.

```bash
python3 -m venv /tmp/bfs-venv
/tmp/bfs-venv/bin/pip install requests openpyxl xlrd
/tmp/bfs-venv/bin/python3 scripts/import_warehouse.py     # products + opening stock from Excel (one-time)
/tmp/bfs-venv/bin/python3 scripts/import_qb_data.py all  # stock + sales from QB exports (one-time bootstrap)
```

Stock quantities are now maintained by the **nightly QB API sync** (`/api/cron/sync`). Product names are overwritten monthly by the **name sync cron** (`/api/cron/sync-names`). Do not re-run these import scripts in production — they would overwrite live data.

---

## Current Data State (as of 2026-06-15)

- **847 active products** (81 Inverness products disabled — direct supplier to stores)
- **665 stock records** — live via nightly QB Items API sync
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
| 1–4 | Products, Brands, Categories, Dashboard | `components/products/`, `components/dashboard/`, `app/api/products/` |
| 5 | Stock & Locations | `app/api/stock/`, `app/api/locations/`, `components/stock/` |
| 6 | Reorder Management | `app/api/reorder/`, `components/reorder/` |
| 7 | Supplier Management | `app/api/suppliers/`, `components/suppliers/` |
| 8 | Purchase Orders | `app/api/purchase-orders/`, `components/purchase-orders/` |
| 9 | Email Notifications | `app/api/notifications/`, `lib/mailer.ts`, `lib/notification-engine.ts`, `components/notifications/` |
| 10 | Sales History / Analytics | `app/api/sales/`, `components/analytics/` |
| 11 | Reports | `app/api/reports/`, `components/reports/` |
| 12 | Import / Export | `app/api/import/`, `app/api/export/`, `components/import-export/` |
| 13 | QB Integration | `app/api/integrations/quickbooks/`, `hooks/use-integrations.ts`, `components/integrations/` |
| 15 | Settings | `app/api/settings/stock-policy/`, `components/settings/` |
| 16 | Authentication + RBAC | `lib/auth.ts`, `lib/auth-client.ts`, `lib/require-role.ts`, `components/auth/login-view.tsx`, `middleware.ts` |
| 17 | User admin panel | `app/api/users/`, `hooks/use-users.ts`, `components/settings/dashboard/user-table.tsx` — Team tab in Settings |
| 18 | QB refresh token alert | `lib/qb-token-check.ts` — runs in nightly cron, emails admin if ≤7 days |
| 19 | Empty states | `components/ui/empty-state.tsx` — used in products, stock, movements, email log, suppliers, reorder tables |
| 20 | QB Vendor sync | `app/api/integrations/quickbooks/vendors/route.ts`, Vendors tab in Integrations |
| 21 | QB Product name sync | `app/api/integrations/quickbooks/items/sync-names/route.ts`, monthly cron `0 7 1 * *` |

### ❌ Remaining

| # | Feature | Notes |
|---|---|---|
| 14 | Zenoti Fulfillment | Service locations raise POs in Zenoti → BFS pulls them via API → inventory associate fulfills → posts QB Invoice. Replaces planned Shopify integration. See "Zenoti Integration" section below. |

---

## QuickBooks Integration — Full Picture

QB is the **source of truth** for stock quantities and product names. All file-upload/CSV-paste routes are kept for emergency manual correction only.

### Sync modes

| Mode | Route | Trigger | What it does |
|---|---|---|---|
| **Live stock sync** | `POST /api/integrations/quickbooks/items` | UI button / nightly cron | Fetches `QtyOnHand` from QB Items API → upserts inventory |
| **Live sales sync** | `POST /api/integrations/quickbooks/sync-sales-api` | UI button / nightly cron | Fetches `SalesByProductServiceSummary` (last 12 months) → upserts SalesRecord |
| **Product name sync** | `POST /api/integrations/quickbooks/items/sync-names` | UI button / monthly cron | Overwrites `product.name` from QB canonical name, matched by SKU only |
| **Vendor sync** | `POST /api/integrations/quickbooks/vendors` | UI button (on-demand) | Imports active QB Vendors → upserts Suppliers; fills blank fields only, never overwrites manual edits |
| **XLS file import** | `POST /api/integrations/quickbooks/sync-stock` | UI file upload | Emergency: parse `ProductServiceList__*.xls` → upsert inventory |
| **CSV paste import** | `POST /api/integrations/quickbooks/sync-stock` | UI text area | Emergency: rows from CSV paste |
| **Sales CSV import** | `POST /api/integrations/quickbooks/sync-sales` | UI text area | Emergency: QB Sales Detail CSV (flat or wide format) |

### Cron jobs

| Schedule | Route | What it does |
|---|---|---|
| `0 6 * * *` (daily 06:00 UTC) | `GET /api/cron/sync` | Stock sync + sales sync + QB token expiry check |
| `0 7 1 * *` (monthly, 1st) | `GET /api/cron/sync-names` | Overwrites product names from QB by SKU match |

Both cron routes are protected by `Authorization: Bearer <CRON_SECRET>`. Vercel sends this header automatically; set `CRON_SECRET` in both `.env` and Vercel environment variables.

### Sales sync — quantity handling

`SalesByProductServiceSummary` may return only revenue columns (no unit qty) depending on QB report config. The sync route detects this via `qtyColumnsDetected` in the response. When `false`, existing `SalesRecord.quantity` values (from the Excel bootstrap) are preserved — the upsert only overwrites quantity when QB actually returns a non-zero qty. Revenue is always updated.

### Name sync — matching logic

Only items with a QB SKU are renamed. Matching priority: `product.sku` → `product.barcode`. Items matched by barcode have `product.sku` back-filled for future runs. Items with no QB SKU are counted as `noSku` and skipped to avoid ambiguous matches. The diff (old name → new name) is returned in the response and logged to SyncLog with type `NAME_SYNC`.

### Shared QB helpers in lib

- `QboItem` interface — `lib/qbo.ts`
- `fetchQboItems()` — paginated fetch of all active Inventory items — `lib/qbo.ts`
- **Do not import types or functions from route files into other route files.** Next.js App Router bundles each route independently; cross-route imports cause 502s. Put shared QB types/helpers in `lib/qbo.ts`.

### OAuth

Tokens live in `IntegrationConfig.config.oauth` (JSON). Access token auto-refreshes when <2 min from expiry. Refresh token expires ~Sep 2026 — if it expires, reconnect via `/integrations` → Settings tab. The nightly cron emails the admin (`GMAIL_USER`) if fewer than 7 days remain.

**QB redirect URI** (registered in Intuit portal):
```
https://bfs.kigtech.digital/api/integrations/quickbooks/callback
```

**Local dev**: shared Neon DB means local dev uses the same tokens as prod once QB is connected. Set `QBO_ENVIRONMENT=production` in `.env`.

---

## Authentication & RBAC

**Current state**: GitHub + Google OAuth. ADMIN/MANAGER/VIEWER roles enforced on all write routes.

- Login: `app/(auth)/login/page.tsx`
- better-auth config: `lib/auth.ts` (socialProviders: github + google)
- Middleware allowlist: `middleware.ts` — specific emails + `@beautylogix.ca` / `@beautyfirstspa.com` domains
- Session: 7-day expiry, 24-hour sliding update
- Role helper: `lib/require-role.ts` — `requireRole("ADMIN" | "MANAGER")`, returns `{ user }` or `NextResponse` 401/403

**Role split**:
- `ADMIN` — settings, locations, user role management, QB connect/disconnect, product/supplier/stock imports
- `MANAGER` — products, brands, categories, suppliers, purchase orders, stock adjustments, notifications, QB syncs
- `VIEWER` — read-only (all GET routes are public to any authenticated session)

**User admin**: Team tab in `/settings` (`components/settings/dashboard/user-table.tsx`). Role selector for others, read-only badge for self. Self-demotion blocked at API level.

**First admin**: must be set directly in DB (`UPDATE "user" SET role = 'ADMIN' WHERE email = '...'`). All new sign-ins default to `VIEWER`.

**What's still missing**:
- No email/password fallback — if Google/GitHub OAuth is down, no login path exists.

**Legal pages** (public, no auth required):
- `https://bfs.kigtech.digital/legal/privacy`
- `https://bfs.kigtech.digital/legal/terms`

---

## Settings Page

Three tabs at `/settings`:

**Stock Policy** (`/api/settings/stock-policy`):
- Per-product `targetStockMonths` (Int, default 6) — drives `reorderQty = ceil(avgMonthly × targetStockMonths)`
- Accordion grouped by brand; quick-set buttons (1/2/3/6/9/12 mo) per brand header
- Sticky save bar; "Recalculate" button calls `/api/inventory/calculate-minimums`

**Brand Lead Times**:
- Editable `leadTimeDays` per brand (inline edit, Enter/Escape)
- Drives `reorderPoint = ceil(avgMonthly × (leadTimeDays + 7) / 30)`

**Team**:
- Lists all users with avatar, role selector, last seen, member since
- ADMIN-only API (`GET/PATCH /api/users`, `PATCH /api/users/[id]`)

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

### Medium priority

| Item | Notes |
|---|---|
| QB unit cost sync | Pull `Item.PurchaseCost` during existing items sync → populate `ProductSupplier.cost`. Enables accurate stock valuation. Field already on `QboItem` in `lib/qbo.ts`. |
| Reorder bulk actions | Multi-select rows → "Create PO for selected" or "Export selected". Currently only per-row actions. |
| Dashboard KPI deltas | Add ±N trend vs prior week to each KPI card. Data already exists in StockMovement + SalesRecord. |
| Analytics date range picker | Analytics charts show fixed period. A date range selector would make it useful for ad-hoc queries. |
| Mobile table responsiveness | Wide tables (products, stock, reorder) need `overflow-x-auto` wrapper. Currently break layout at <768px. |
| Error boundaries | Pages use `<Suspense>` but no `error.tsx` boundaries. A single component throw crashes the whole page section. |

### Skipped (no QB writes policy)

| Item | Notes |
|---|---|
| PO → QB push | Would create QB PurchaseOrder when a BFS PO is sent. Skipped — app is read-only from QB's perspective. |

### Low priority / nice-to-have

| Item | Notes |
|---|---|
| Product image gallery | `Product.imageUrl` field exists, UploadThing wired. Just needs upload UI in product form + thumbnail in table. |
| PO status timeline | Show DRAFT → SENT → RECEIVED steps with timestamps on PO detail. |
| Email/password auth | Fallback login if OAuth providers are down. better-auth supports it natively. |
| Test alert button per rule | "Send test email" on each alert rule in notifications page. |
| AppSetting usage | Schema has `AppSetting` model but nothing uses it. Move hardcoded constants (SAFETY_DAYS=7, default location name) there. |
| Observability | No error tracking. Add Sentry or Axiom for production error monitoring. |
| Rate limiting on sync routes | QB sync routes can be called without throttle. Could exhaust Intuit API quota. |

---

## Zenoti Integration

Zenoti is the inventory/POS system used at all service locations (Square One, Burlington Mall, Limeridge Mall, Oakville Place). The warehouse (Beauty Logix Inc) is set up as a vendor in Zenoti. Service locations raise Purchase Orders in Zenoti directed at the warehouse. BFS pulls those POs and automates the fulfillment → QuickBooks invoice loop.

**Zenoti cannot be updated from BFS** — the Zenoti API has no write endpoint for stock quantities. Zenoti's warehouse stock levels are therefore permanently outdated; service locations may request products the warehouse doesn't have. BFS cross-references its own live stock levels to flag these at fulfillment time.

### Fulfillment flow

```
1. Service location raises PO in Zenoti (status: RAISED)
2. BFS sync pulls RAISED POs from all configured centers via Zenoti API
3. Inventory associate opens the order in BFS:
   - sees each line item with requested qty (retail + consumable)
   - sees current BFS stock level per product (matched by barcode)
   - items where stock < requested qty are flagged
   - adjusts "fulfil qty" per line (defaults to min(requested, stock))
4. Associate clicks "Create Invoice" → BFS Invoice created (DRAFT)
5. Accounts person reviews and clicks "Post to QuickBooks"
   → QB Invoice created (warehouse → service location as QB Customer)
   → BfsInvoice status → POSTED, QB invoice number stored
```

### Two Zenoti instances

| Domain | Warehouse name in Zenoti | Env var |
|---|---|---|
| `beautyfirstspa.zenoti.com` | Beauty First Spa | `ZENOTI_BFS_API_KEY` |
| `beautylogix.zenoti.com` | Beauty Logix | `ZENOTI_BL_API_KEY` |

Both use the same API base URL (`https://api.zenoti.com`). The API key implicitly scopes all requests to that organization's data.

**beautyfirstspa.zenoti.com — service locations:**
- Corp-Owned: Burlington Mall, Limeridge Mall, Oakville Place, Square One
- Franchise: Dixie Outlet Mall, Hillcrest Mall, Upper Canada Mall, Yonge-Eglinton
- Excluded: Call Center (not a store)

**beautylogix.zenoti.com — service locations:**
- Franchise: Bolton, Burlington, Milton, Oakville, Ottawa-Kanata, Rymal

### Zenoti API

- **Auth**: `Authorization: apikey {key}` on every request — no OAuth, no token refresh
- **API key setup**: Zenoti Admin → Setup → Apps → create backend app → copy key

| Endpoint | Purpose |
|---|---|
| `GET /v1/inventory/purchase_orders?center_id=&start_date=&end_date=&status=2` | List RAISED POs for one center |
| `GET /v1/inventory/purchase_orders/{order_id}` | Full PO with line items |
| `GET /v1/inventory/transfer_orders?center_id=&start_date=&end_date=&status=2` | List RAISED transfer orders |

`status=2` = RAISED. No org-wide "all centers" endpoint — BFS fans out one request per `center_id` across both Zenoti instances and merges results.

### Product matching

Zenoti line items include `product_code` (barcode) and `product_name`. Match to BFS via `product.barcode`. No barcode match → flag for manual review; do not auto-skip.

### Planned DB additions

| Model | Purpose |
|---|---|
| `ZenotiOrg` | One row per Zenoti instance — stores domain label, API key reference, list of center objects `{centerId, name, qbCustomerName}` as JSON |
| `ZenotiOrder` | Cached PO header (order_id, order_number, center_name, org, raised_date, status) |
| `ZenotiOrderItem` | Line items (product_code, product_name, barcode, retail_qty, consumable_qty, unit_price) |
| `BfsInvoice` | Internal invoice linking ZenotiOrder → QB (status: DRAFT/POSTED, qb_invoice_id, qb_invoice_number) |
| `BfsInvoiceItem` | Fulfilled quantities (fulfilled_retail_qty, fulfilled_consumable_qty, unit_price) |

### Pending before build can start

- [ ] `ZENOTI_BFS_API_KEY` — from beautyfirstspa.zenoti.com Admin → Setup → Apps
- [ ] `ZENOTI_BL_API_KEY` — from beautylogix.zenoti.com Admin → Setup → Apps
- [ ] Zenoti `center_id` values for all ~14 service locations across both instances
- [ ] Confirm all service locations exist as QB Customers (needed for QB Invoice `CustomerRef`)
- [ ] Confirm QB transaction type: **Invoice** (AR) vs Sales Receipt

### Shopify

Shopify integration is **cancelled** — no longer needed. `IntegrationProvider.SHOPIFY` remains in the schema but is unused; ignore it.

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
- **QB sales sync quantity** — `SalesByProductServiceSummary` may omit unit qty columns. The sync upsert only overwrites `SalesRecord.quantity` when QB returns qty > 0; otherwise existing quantity (from Excel bootstrap) is preserved. Check `qtyColumnsDetected` in sync response to confirm whether QB is returning units.
- **Cross-route imports in App Router** — never import types or functions from `app/api/.../route.ts` files into other route files. Even `import type` can cause 502s due to bundler behaviour. Put shared QB types/helpers in `lib/qbo.ts` instead.
- **Shared Neon DB** — local dev and prod point to the same database. Destructive scripts (seed, reimport) run against live data. Always confirm before running import scripts locally.
- **Cron route auth** — `GET /api/cron/sync` and `GET /api/cron/sync-names` both require `Authorization: Bearer <CRON_SECRET>`. Must be set in both `.env` (local) and Vercel environment variables (prod). Vercel native cron sends this header automatically.
- **QB name sync — no-SKU items** — items without a QB `Sku` field are never renamed (counted as `noSku` in response). To rename those products, add SKUs to them in QB first, then re-run the sync.
- **Vendor sync — no overwrite** — existing supplier fields are only filled if currently blank. If a supplier's email was manually edited in BFS, QB vendor data will not overwrite it.
