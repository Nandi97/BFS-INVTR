@AGENTS.md

# BFS Inventory — Claude Code Context

## What this is

A Next.js 16 web app replacing the Excel-based inventory workflow for **Beauty First / Beauty Logix** warehouse (`order@beautylogix.ca`). The goal is stock-level visibility and automated low-stock notifications — transactions still happen in QuickBooks.

**Production URL**: `https://bfs.kigtech.digital`
**Hosting**: Vercel (Pro — cron jobs enabled)
**Database**: Neon PostgreSQL (shared between local dev and prod — same `DATABASE_URL`)

---

## Tech Stack

| Layer            | Choice                                                                |
| ---------------- | --------------------------------------------------------------------- |
| Framework        | Next.js 16.2.9, App Router, React 19, TypeScript                      |
| Database         | PostgreSQL via Prisma 7 (Neon)                                        |
| Auth             | better-auth 1.6                                                       |
| UI               | shadcn (radix-nova style) + Tailwind 4                                |
| Data fetching    | TanStack Query v5 + axios                                             |
| Forms            | react-hook-form + Zod 4                                               |
| Charts           | recharts                                                              |
| Email            | nodemailer (Gmail app password)                                       |
| Font             | Plus Jakarta Sans → `--font-sans` (variable set directly on `<body>`) |
| Excel generation | ExcelJS v4 (email attachments + reports)                              |

---

## Critical Prisma 7 Rules

- **No `url` in `datasource` block** — connection config lives in `prisma.config.ts`
- **Client generates to** `../generated/prisma/client.ts`
- **Adapter required** — uses `PrismaPg` with `pg.Pool`
- **Import path**: `import { prisma } from "@/lib/prisma"`
- **After schema changes**: run `npx prisma migrate dev --name <name>` then `npx prisma generate` then **restart the dev server** — the running server caches the old compiled Prisma client and won't see new fields until restart

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
- `components/zenoti/dashboard/zenoti-orders-table.tsx` → rendered by `app/(dashboard)/zenoti/page.tsx`
- `components/zenoti/view/fulfillment-view.tsx` → rendered by `app/(dashboard)/zenoti/[id]/page.tsx`
- `components/auth/login-view.tsx` → rendered by `app/(auth)/login/page.tsx`

**Do not add logic back into `page.tsx` files** — they stay thin wrappers.

---

## Sheet Form UI Convention

All `<Sheet>` slide-over forms follow this pattern:

```tsx
<SheetContent className="sm:max-w-{size} w-full overflow-y-auto">
	<SheetHeader className="px-6 pt-6 pb-2">
		<SheetTitle>…</SheetTitle>
		<SheetDescription>…</SheetDescription>
	</SheetHeader>

	<form className="space-y-5 px-6 pb-6">
		{/* fields */}
		<div className="flex justify-end gap-3 border-t pt-5">
			<Button variant="outline">Cancel</Button>
			<Button type="submit">Save</Button>
		</div>
	</form>
</SheetContent>
```

**Width guide:**

- `sm:max-w-lg` — simple forms with 3–4 fields (Set Thresholds, Add Location)
- `sm:max-w-xl` — standard forms with 5+ fields (Alert Rule, Product, Adjust Stock, Supplier)
- `sm:max-w-2xl` — complex / table-heavy sheets (New PO, PO Detail, Receive PO)

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

## Current Data State (as of 2026-06-23)

- **847 active products** (81 Inverness products disabled — direct supplier to stores)
- **665 stock records** — live via nightly QB Items API sync
- **3,480 monthly sales records** from QB Sales Detail (April 2025 – March 2026)
- **562 products** have calculated reorder points and reorder quantities
- **Local brands** (Beauty First, Desembre, Fernanda's, Refectocil) → 2-month stock target, 14-day lead time
- **International brands** (all others) → 6-month stock target, 45-day lead time
- **Disabled locations**: BF Inverness, BLX Inverness (direct-supply, `isActive = false`)
- **QB Integration**: Production OAuth connected (Realm ID: 123145858555379), refresh token valid until ~Sep 2026
- **Dispatch movements**: 10,435 `ADJUSTMENT_OUT` records — 10,405 (99.7%) with QB invoice reference + store attribution; 30 pre-attribution sync movements without reference

---

## Feature Status

### ✅ Done

| #   | Feature                                        | Key files                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| —   | UI Shell                                       | `components/app-header.tsx`, `components/app-sidebar.tsx`, `app/(dashboard)/layout.tsx`, `lib/font.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 1–4 | Products, Brands, Categories, Dashboard        | `components/products/`, `components/dashboard/`, `app/api/products/`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 5   | Stock & Locations                              | `app/api/stock/`, `app/api/locations/`, `components/stock/`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 6   | Reorder Management                             | `app/api/reorder/`, `components/reorder/`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 7   | Supplier Management                            | `app/api/suppliers/`, `components/suppliers/`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 8   | Purchase Orders                                | `app/api/purchase-orders/`, `components/purchase-orders/`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 9   | Email Notifications                            | `app/api/notifications/`, `lib/mailer.ts`, `lib/notification-engine.ts`, `components/notifications/`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 10  | Sales History / Analytics                      | `app/api/sales/`, `components/analytics/`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 11  | Reports                                        | `app/api/reports/`, `components/reports/`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 12  | Import / Export                                | `app/api/import/`, `app/api/export/`, `components/import-export/`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 13  | QB Integration                                 | `app/api/integrations/quickbooks/`, `hooks/use-integrations.ts`, `components/integrations/`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 14  | Zenoti Fulfillment (Phase 1)                   | `app/api/zenoti/`, `hooks/use-zenoti.ts`, `components/zenoti/` — see section below                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 15  | Settings                                       | `app/api/settings/stock-policy/`, `components/settings/`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 16  | Authentication + RBAC                          | `lib/auth.ts`, `lib/auth-client.ts`, `lib/require-role.ts`, `components/auth/login-view.tsx`, `middleware.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 17  | User admin panel                               | `app/api/users/`, `hooks/use-users.ts`, `components/settings/dashboard/user-table.tsx` — Team tab in Settings                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 18  | QB refresh token alert                         | `lib/qb-token-check.ts` — runs in nightly cron, emails admin if ≤7 days                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 19  | Empty states                                   | `components/ui/empty-state.tsx` — used in products, stock, movements, email log, suppliers, reorder tables                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 20  | QB Vendor sync                                 | `app/api/integrations/quickbooks/vendors/route.ts`, Vendors tab in Integrations                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 21  | QB Product name sync                           | `app/api/integrations/quickbooks/items/sync-names/route.ts`, monthly cron `0 7 1 * *`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 22  | Product detail page                            | `components/products/view/product-view.tsx` — image, sales bar chart, stock balance line chart, recent movements table                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 23  | Product image upload                           | UploadThing endpoint `productImage` in `app/api/uploadthing/core.ts`; CDN at `utfs.io` (added to `next.config.ts` remotePatterns)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 24  | QB inactive product deactivation               | Stock sync (`POST /api/integrations/quickbooks/items`) now runs a second pass fetching inactive QB items and setting matching BFS products `isActive = false`. Matches by SKU/barcode only.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 25  | Sales calc shared helper                       | `lib/sales-calc.ts` — `computeAvgMonthly()` with trailing-zero trimming + linear recency weighting + `confident` flag. Imported by reorder route, calculate-minimums route, and stock-policy route.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 26  | Email XLSX brand-per-sheet                     | `lib/email-xlsx.ts` rewritten — one sheet per brand (alphabetical), both Out-of-Stock and Low-Stock items together per sheet, Status column with red/amber coloring, Summary sheet with brand breakdown.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 27  | QB stock sync delta tracking                   | `POST /api/integrations/quickbooks/items` now reads existing inventory qty before upserting. Writes `ADJUSTMENT_OUT` when QB qty drops (dispatched), `ADJUSTMENT_IN` when it rises (restocked), nothing when unchanged. `RECONCILIATION` is now only written for a product's first-ever sync (opening snapshot). Response includes `movements: { dispatched, restocked, unchanged }` counts.                                                                                                                                                                                                                                                                                                         |
| 28  | QB invoice backfill (done, button removed)     | `POST /api/integrations/quickbooks/backfill-movements` — read-only one-time route that reconstructed 2 years of `ADJUSTMENT_OUT` movements from QB Invoices. 10,405 movements written with `reference = "QB-INV-{DocNumber}"` and `notes = "QB backfill: invoiced to {store}"`. Route and UI button retained in codebase but button removed from Integrations UI after confirming data (10,405/10,435 = 99.7% attributed).                                                                                                                                                                                                                                                                           |
| 29  | Movements Log — brand filter + By Product view | Brand dropdown filter. Summary cards (Received / Dispatched / Net change) when date range active. **By Product** toggle: one row per product with `totalIn`, `totalOut`, `netChange`, `currentStock`, `movementCount`. `GET /api/stock/movements/summary` uses `$queryRaw`. `RECONCILIATION` and `OPENING_STOCK` excluded from both totals.                                                                                                                                                                                                                                                                                                                                                          |
| 30  | Movements export — Excel download              | **Export Excel** button on By Product view. `GET /api/stock/movements/summary/export` — same filters as summary, ExcelJS output with coloured Total In/Out/Net columns, meta rows (brand, period), totals row. Filename: `movements-{dateFrom}-{dateTo}.xlsx`.                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 31  | QB unit cost sync                              | During stock sync loop, if `item.PurchaseCost != null && > 0`, calls `updateMany` on `ProductSupplier` for that product. `costUpdated` count in sync response and SyncLog message.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 32  | QB invoice attribution on movements            | Before the sync loop in `POST /api/integrations/quickbooks/items`, fetches QB Invoices since `lastSyncAt` (default 48h on first run). Builds `Map<qboItemId, [{docNumber, customerName}]>`. `ADJUSTMENT_OUT` movements now get `reference = "QB-INV-1023"` and `notes = "QBO sync: dispatched to Square One"`. Non-fatal if invoice fetch fails — movements still written without attribution.                                                                                                                                                                                                                                                                                                       |
| 33  | Pending product staging workflow               | `PendingProduct` table (migration `20260622180459_add_pending_product`). QB sync upserts unmatched items here instead of silently skipping. `/products/pending` page: table sorted by qty desc, with QB name, SKU, cost, suggested brand (parsed from QB hierarchy), first seen, seen count. **Add** button opens Sheet to validate name/SKU/barcode/brand/category/location → creates Product + Inventory + `OPENING_STOCK` movement + deletes pending record. **Dismiss** removes from list (reappears on next sync if still unmatched). Sidebar: Products now has sub-items (All Products / Pending from QB). API: `GET/DELETE /api/products/pending`, `POST /api/products/pending/[id]/approve`. |
| 34  | Restocks / Dispatches preset views             | Movements Log now has three preset chips: **All Movements** / **Restocks** / **Dispatches**. Each sets the type filter (movements view) and `typeGroup` param (By Product view). Summary API supports `typeGroup=in\|out` to scope SQL to IN or OUT types only. By Product view in Restocks mode shows: Units Restocked, Restock Events, Avg per Restock, Current Stock, Last Restock. Dispatches mode mirrors with OUT columns.                                                                                                                                                                                                                                                                     |
| 35  | Dispatch by Store report                       | New tab in Reports → **Dispatch by Store**. `GET /api/reports/dispatch-by-store` parses store name from `notes` field of `ADJUSTMENT_OUT` movements, pivots product × store. Table: product rows, store columns (sorted alpha, Unknown last), per-store totals sub-header, Total + Unit Cost + Total Value columns. ExcelJS export with frozen headers and totals row. Filter: date range + brand.                                                                                                                                                                                                                                                                                                   |

### ⏳ Zenoti Phase 2 (post-meeting)

| Item                     | Blocker                                                                                                                                                 | Notes                                                                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Live sync active         | API subscription not yet enabled — ticket **BC-60590** raised 2026-06-18, ETA ~2026-06-23 (3–4 business days). Registered email: alvinkigen@outlook.com | Once activated, get API key from Zenoti Admin → Setup → Apps, add `ZENOTI_BFS_API_KEY` + `ZENOTI_BL_API_KEY` to `.env` + Vercel, then hit `GET /api/zenoti/centers` to discover center IDs |
| QB Invoice posting       | Confirm accounting team sign-off + QB customer names per store                                                                                          | `POST /api/zenoti/fulfillments/[id]/submit` currently emails only; QB posting is the next step                                                                                             |
| Confirm PO endpoint path | Need real API key to test                                                                                                                               | Current assumption: `GET /v1/procurement/purchase_orders?center_id=&statuses=Raised,Updated` — verify once keys arrive, adjust `lib/zenoti.ts` `fetchZenotiPOs` if path differs            |

---

## QuickBooks Integration — Full Picture

QB is the **source of truth** for stock quantities and product names. All file-upload/CSV-paste routes are kept for emergency manual correction only.

### Sync modes

| Mode                  | Route                                                | Trigger                  | What it does                                                                                                                                                                                                                                                                                                                                               |
| --------------------- | ---------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Live stock sync**   | `POST /api/integrations/quickbooks/items`            | UI button / nightly cron | Fetches `QtyOnHand` from QB Items API → upserts inventory. Writes `ADJUSTMENT_OUT`/`ADJUSTMENT_IN` for deltas; `RECONCILIATION` only on first-ever sync. Attributes `ADJUSTMENT_OUT` to QB invoice number + store name via invoice fetch before the loop. Updates `ProductSupplier.cost` from `PurchaseCost`. Upserts unmatched items to `PendingProduct`. |
| **Live sales sync**   | `POST /api/integrations/quickbooks/sync-sales-api`   | UI button / nightly cron | Fetches `SalesByProductServiceSummary` (last 12 months) → upserts SalesRecord                                                                                                                                                                                                                                                                              |
| **Product name sync** | `POST /api/integrations/quickbooks/items/sync-names` | UI button / monthly cron | Overwrites `product.name` from QB canonical name, matched by SKU only                                                                                                                                                                                                                                                                                      |
| **Vendor sync**       | `POST /api/integrations/quickbooks/vendors`          | UI button (on-demand)    | Imports active QB Vendors → upserts Suppliers; fills blank fields only, never overwrites manual edits                                                                                                                                                                                                                                                      |
| **XLS file import**   | `POST /api/integrations/quickbooks/sync-stock`       | UI file upload           | Emergency: parse `ProductServiceList__*.xls` → upsert inventory                                                                                                                                                                                                                                                                                            |
| **CSV paste import**  | `POST /api/integrations/quickbooks/sync-stock`       | UI text area             | Emergency: rows from CSV paste                                                                                                                                                                                                                                                                                                                             |
| **Sales CSV import**  | `POST /api/integrations/quickbooks/sync-sales`       | UI text area             | Emergency: QB Sales Detail CSV (flat or wide format)                                                                                                                                                                                                                                                                                                       |

### Cron jobs

| Schedule                      | Route                      | What it does                                                                         |
| ----------------------------- | -------------------------- | ------------------------------------------------------------------------------------ |
| `0 6 * * *` (daily 06:00 UTC) | `GET /api/cron/sync`       | Stock sync + QB token expiry check (sales sync removed — QB Reports API returns 403) |
| `0 7 1 * *` (monthly, 1st)    | `GET /api/cron/sync-names` | Overwrites product names from QB by SKU match                                        |

Both cron routes are protected by `Authorization: Bearer <CRON_SECRET>`. Vercel sends this header automatically; set `CRON_SECRET` in both `.env` and Vercel environment variables.

The middleware and `requireRole` both accept the `Bearer <CRON_SECRET>` header so cron sub-fetches bypass session auth cleanly.

### Sales sync — quantity handling

`SalesByProductServiceSummary` may return only revenue columns (no unit qty) depending on QB report config. The sync route detects this via `qtyColumnsDetected` in the response. When `false`, existing `SalesRecord.quantity` values (from the Excel bootstrap) are preserved — the upsert only overwrites quantity when QB actually returns a non-zero qty. Revenue is always updated.

**Sales sync is not in the cron** — QB OAuth user lacks Reports permission (403). The bootstrapped 12 months of data is sufficient for reorder calculations.

### Name sync — matching logic

Only items with a QB SKU are renamed. Matching priority: `product.sku` → `product.barcode`. Items matched by barcode have `product.sku` back-filled for future runs. Items with no QB SKU are counted as `noSku` and skipped to avoid ambiguous matches. The diff (old name → new name) is returned in the response and logged to SyncLog with type `NAME_SYNC`.

### Shared QB helpers in lib

- `QboItem` interface — `lib/qbo.ts`
- `fetchQboItems(activeOnly = true)` — paginated fetch of QB Inventory items — `lib/qbo.ts`. Pass `false` to fetch inactive items (used by the deactivation pass in the stock sync route).
- `QboInvoice` / `QboInvoiceLine` interfaces + `fetchQboInvoices(fromDate: string)` — paginated fetch of QB Invoices since a given date — `lib/qbo.ts`. Used by the backfill route.
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
- `MANAGER` — products, brands, categories, suppliers, purchase orders, stock adjustments, notifications, QB syncs, Zenoti fulfillment
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
- Note: `reorderPoint` on the reorder page is now computed live — "Recalculate" is only needed to refresh stored `inventory.reorderPoint`/`reorderQty` values used elsewhere (e.g. stock page thresholds)

**Brand Lead Times**:

- Editable `leadTimeDays` per brand (inline edit, Enter/Escape)
- Drives `reorderPoint = ceil(avgMonthly × (leadTimeDays + 7) / 30)`

**Team**:

- Lists all users with avatar, role selector, last seen, member since
- ADMIN-only API (`GET/PATCH /api/users`, `PATCH /api/users/[id]`)

---

## Reorder / Minimums Formulas

```
reorderPoint  = ceil(avgMonthly × (leadTimeDays + SAFETY_DAYS) / 30)   ← when to trigger an order
minQuantity   = ceil(avgMonthly × SAFETY_DAYS / 30)                    ← 1-week safety buffer
reorderQty    = ceil(avgMonthly × targetStockMonths)                    ← how much to order
```

`SAFETY_DAYS = 7` — defined in `lib/sales-calc.ts`.

### avgMonthly calculation — `computeAvgMonthly()` in `lib/sales-calc.ts`

Sales records are ordered DESC (most recent first). The function:

1. **Trims trailing zeros** — strips leading zero-quantity months before computing. These represent products on legal/distribution hold or extended zero-demand periods. The trim starts from index 0 (most recent) until a non-zero month is found.
2. **Linear recency weighting** — weight[i] = (n − i), so index 0 (most recent non-zero month) carries the highest weight. Trending-up products score higher than flat; trending-down score lower.
3. **`confident` flag** — `true` if ≥ 3 non-zero months remain after trimming. Reorder table shows `~{qty}` (greyed, with tooltip) when `!confident`.

Products with no non-zero sales after trimming return `{ avgMonthly: 0, monthsUsed: 0, confident: false }` and are skipped by calculate-minimums.

### Live vs stored reorderPoint

The reorder route (`GET /api/reorder`) computes `reorderPoint` live from `avgMonthly` and the brand's current `leadTimeDays`. The stored `inventory.reorderPoint` (set by Recalculate) is used as fallback only when `avgMonthly = 0`. This means changing a brand's lead time or a product's `targetStockMonths` is reflected immediately on the reorder page without running Recalculate.

---

## Zenoti Integration

Zenoti is the inventory/POS system used at all service locations. Service locations raise Purchase Orders in Zenoti directed at the warehouse. BFS pulls those POs and the inventory associate fulfills them on an iPad, then emails a packing list to accounting.

**Zenoti cannot be updated from BFS** — the Zenoti API has no write endpoint for stock quantities. BFS cross-references its own live stock levels (from QB sync) to flag shortfalls at fulfillment time.

### Two Zenoti instances

| Domain                      | Label            | Env var              |
| --------------------------- | ---------------- | -------------------- |
| `beautyfirstspa.zenoti.com` | Beauty First Spa | `ZENOTI_BFS_API_KEY` |
| `beautylogix.zenoti.com`    | Beauty Logix     | `ZENOTI_BL_API_KEY`  |

Both use base URL `https://api.zenoti.com`. Auth: `Authorization: apikey {key}` header on every request. No OAuth, no token refresh.

**beautyfirstspa.zenoti.com — service locations:**

- Corp-Owned: Burlington Mall, Limeridge Mall, Oakville Place, Square One
- Franchise: Dixie Outlet Mall, Hillcrest Mall, Upper Canada Mall, Yonge-Eglinton
- Excluded: Call Center (not a store)

**beautylogix.zenoti.com — service locations:**

- Franchise: Bolton, Burlington, Milton, Oakville, Ottawa-Kanata, Rymal

### Fulfillment flow (as built)

```
1. Service location raises PO in Zenoti (RAISED or UPDATED status)
2. Inventory associate clicks "Sync from Zenoti" on /zenoti dashboard
   → POST /api/zenoti/sync pulls RAISED+UPDATED POs from all centers across both orgs
3. Associate clicks an order → /zenoti/[id]
   → "Start Packing" calls POST /api/zenoti/orders/[id]/fulfillment
   → Creates BfsFulfillment (status: IN_PROGRESS) with items pre-loaded from Zenoti,
     quantities defaulted to requested, products matched by barcode to BFS Product
4. Associate packs each item:
   - Adjusts fulfilled retail qty and consumable qty (pre-loaded, editable)
   - Checks the checkbox when physically packed
   - Adds walk-in items via "Add Walk-in Item" dialog (POST /api/zenoti/fulfillments/[id]/items)
   - Stock-on-hand shown per item; shortfalls highlighted amber/red
5. Associate clicks "Submit & Email"
   → POST /api/zenoti/fulfillments/[id]/submit
   → Sends XLSX packing list to accounting@beautyfirstspa.com (CC: order@beautylogix.ca)
   → BfsFulfillment status → SUBMITTED
```

### Phase 2 (post-meeting, pending accounting team approval)

```
6. Accounts person reviews email → clicks "Post to QuickBooks" (not yet built)
   → QB Invoice created (warehouse as vendor → service location as QB Customer)
   → BfsFulfillment status → INVOICED, QB invoice number stored
```

### Zenoti API endpoints (assumed — verify with real keys)

| Endpoint                                                                 | Purpose                                                    |
| ------------------------------------------------------------------------ | ---------------------------------------------------------- |
| `GET /v1/centers`                                                        | List all centers for the org (used to discover center IDs) |
| `GET /v1/procurement/purchase_orders?center_id=&statuses=Raised,Updated` | List RAISED+UPDATED POs for one center                     |

No org-wide "all centers" endpoint — BFS fans out one request per `center_id` and merges results.

The actual endpoint path was assumed based on Zenoti API patterns. **Verify once API keys are obtained** — it may differ (e.g. `/v1/inventory/purchase_orders`). The helper is in `lib/zenoti.ts` → `fetchZenotiPOs()`.

### Product matching

Zenoti line items include `product_code` (barcode) and `product_name`. BFS matches by `product.barcode`. Unmatched items are still fulfilable (fulfillment item has `productId: null`, stock-on-hand shows as null rather than crashing).

### Key files

```
lib/zenoti.ts                                      ← API helper (fetchZenotiCenters, fetchZenotiPOs, mapZenotiStatus)
app/api/zenoti/sync/route.ts                       ← POST — pull RAISED+UPDATED from both orgs
app/api/zenoti/centers/route.ts                    ← GET — discover center IDs (run once after getting keys)
app/api/zenoti/orders/route.ts                     ← GET — list orders with fulfillment status
app/api/zenoti/orders/[id]/route.ts                ← GET — order detail + live stock per item
app/api/zenoti/orders/[id]/fulfillment/route.ts    ← POST — create fulfillment from Zenoti order
app/api/zenoti/fulfillments/[id]/route.ts          ← PATCH — update fulfillment status
app/api/zenoti/fulfillments/[id]/items/route.ts    ← POST — add walk-in item
app/api/zenoti/fulfillments/[id]/items/[itemId]/route.ts  ← PATCH/DELETE — update/remove item
app/api/zenoti/fulfillments/[id]/submit/route.ts   ← POST — email packing list, mark SUBMITTED
hooks/use-zenoti.ts                                ← TanStack Query hooks
components/zenoti/dashboard/zenoti-orders-table.tsx ← orders list with sync button + stat cards
components/zenoti/view/fulfillment-view.tsx         ← iPad packing UI
app/(dashboard)/zenoti/page.tsx                    ← thin wrapper
app/(dashboard)/zenoti/[id]/page.tsx               ← thin wrapper
```

### DB models added (migration: `20260617033633_add_zenoti_fulfillment`)

```
ZenotiOrder       — cached PO header (zenotiOrderId unique, org "bfs"|"bl", zenotiStatus enum)
ZenotiOrderItem   — line items (productCode=barcode, retailRaised, consumableRaised, unitPrice)
BfsFulfillment    — fulfillment per order (status: PENDING|IN_PROGRESS|SUBMITTED|INVOICED)
BfsFulfillmentItem — packed quantities, isPacked checkbox, isWalkIn flag
```

Enums added: `ZenotiOrderStatus`, `FulfillmentStatus`. `IntegrationProvider` enum extended with `ZENOTI`.

### Getting started after the meeting

1. Get API keys: Zenoti Admin → Setup → Apps → create backend app → copy key
    - `ZENOTI_BFS_API_KEY` from beautyfirstspa.zenoti.com
    - `ZENOTI_BL_API_KEY` from beautylogix.zenoti.com
2. Add both to `.env` and Vercel environment variables
3. Hit `GET /api/zenoti/centers` (authenticated) — returns center IDs for both orgs
4. Test sync: "Sync from Zenoti" button on `/zenoti` dashboard
5. If the sync endpoint path is wrong (lib/zenoti.ts `fetchZenotiPOs`), adjust the path there
6. Once sync works: confirm with accounting team whether QB invoice auto-posting is wanted
7. If yes: build `POST /api/zenoti/fulfillments/[id]/post-to-qb` — creates QB Invoice using existing QB OAuth tokens

### Pricing note

BeautyLogix Zenoti has unit prices on POs; BeautyFirstSpa Zenoti doesn't. QB is the authoritative source for pricing. Phase 1 packing list email contains quantities only (no prices). Phase 2 QB Invoice should pull prices from QB Product `PurchaseCost`.

### Shopify

Shopify integration is **cancelled** — replaced by Zenoti. `IntegrationProvider.SHOPIFY` remains in the schema but is unused; ignore it.

---

## Backlog (Prioritised)

### High priority (Zenoti Phase 2)

| Item                            | Notes                                                                                                                                        |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| QB Invoice posting              | Build `POST /api/zenoti/fulfillments/[id]/post-to-qb`. Needs QB customer names per store + accounting team sign-off. Uses existing QB OAuth. |
| Zenoti PO endpoint verification | Confirm actual endpoint path once API keys arrive. Update `lib/zenoti.ts` `fetchZenotiPOs` if needed.                                        |

### Medium priority

| Item                        | Notes                                                                                                                                                                  |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reorder bulk actions        | Multi-select rows → "Create PO for selected" or "Export selected". Currently only per-row actions.                                                                     |
| Dashboard KPI deltas        | Add ±N trend vs prior week to each KPI card. Data already exists in StockMovement + SalesRecord.                                                                       |
| Analytics date range picker | Analytics charts show fixed period. A date range selector would make it useful for ad-hoc queries.                                                                     |
| Mobile table responsiveness | Wide tables (products, stock, reorder) need `overflow-x-auto` wrapper. Currently break layout at <768px.                                                               |
| Error boundaries            | Pages use `<Suspense>` but no `error.tsx` boundaries. A single component throw crashes the whole page section. `app/(dashboard)/products/error.tsx` exists as example. |

### Skipped (no QB writes policy)

| Item         | Notes                                                                                                                                                |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| PO → QB push | Would create QB PurchaseOrder when a BFS PO is sent. Skipped — app is read-only from QB's perspective (except Zenoti invoices which are AR, not AP). |

### Low priority / nice-to-have

| Item                         | Notes                                                                                                                                                                               |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product image gallery        | `Product.imageUrl` field exists, UploadThing wired, upload UI in product form works. Still missing: thumbnail column in products table.                                             |
| PO status timeline           | Show DRAFT → SENT → RECEIVED steps with timestamps on PO detail.                                                                                                                    |
| Email/password auth          | Fallback login if OAuth providers are down. better-auth supports it natively.                                                                                                       |
| Test alert button per rule   | "Send test email" on each alert rule in notifications page.                                                                                                                         |
| AppSetting usage             | Schema has `AppSetting` model but nothing uses it. `SAFETY_DAYS` is now centralised in `lib/sales-calc.ts`; remaining candidates: default location name, email recipients fallback. |
| Observability                | No error tracking. Add Sentry or Axiom for production error monitoring.                                                                                                             |
| Rate limiting on sync routes | QB sync routes can be called without throttle. Could exhaust Intuit API quota.                                                                                                      |

---

## Known Issues / Gotchas

- **axios baseURL is `/api`** — all hook paths must NOT include `/api/` prefix (e.g. `/stock` not `/api/stock`). Double prefix causes 404s.
- **Font variable** — `lib/font.ts` sets `variable: "--font-sans"` directly on `<body>`. Never add an intermediate CSS variable; `:root` (`<html>`) cannot see variables set on its children.
- **Prisma client cache** — after any `prisma generate` / schema change, the dev server must be restarted. New fields return as `undefined` until restart even though the DB column exists. This will cause API routes using new models to throw 500 and return HTML, which axios stores as `data` (not an array) — guard with `Array.isArray()` in hooks if needed.
- **Low stock filter (notification engine)** — uses `prisma.$queryRaw` for DB-level filtering. Do not revert to in-memory — it loads the entire table.
- **Low stock filter (stock page)** — Prisma ORM can't compare two columns. Fetch all, filter in JS. Fine for warehouse scale.
- **PO number generation** — queries last PO `startsWith` current year, increments + zero-pads to 3 digits (`PO-2026-001`).
- **Receive PO** — re-fetches all items after update to recalculate RECEIVED / PARTIALLY_RECEIVED status.
- **Negative QB quantities** — clamped to 0 on import. 96 rows in original spreadsheet were negative.
- **BF Inverness / BLX Inverness locations** — `isActive = false`. Direct-supply locations. Reorder page has "Include direct-supply locations" toggle.
- **Inverness products (81)** — `isActive = false`. Piercing/jewellery items delivered direct to stores; not warehoused.
- **Brand lead times** — local brands (Beauty First, Desembre, Fernanda's, Refectocil) = 14 days; all others = 45 days. Set via `scripts/seed-lead-times.ts`.
- **targetStockMonths** — per-product field (not brand). Local brands set to 2 via `scripts/set-local-target-months.ts`. International default = 6.
- **Email notifications** — alerts attach a styled XLSX (ExcelJS) instead of inline product tables. `lib/email-xlsx.ts` → `lib/mailer.ts` (`attachments?: MailAttachment[]`). XLSX is structured as one sheet per brand (alphabetical) + a Summary sheet; both Out-of-Stock and Low-Stock items appear together per brand sheet.
- **TanStack Query v5 `onSuccess`** — inline callbacks need explicit type annotations: `onSuccess: (result: MyType) => { ... }`.
- **chart.tsx** — has `// @ts-nocheck` (recharts type incompatibilities with shadcn-starter copy). Do not remove.
- **`qty < 0` guard in adjust route** — allows correction-to-zero; `qty < 0` not `qty <= 0`.
- **QB sales sync quantity** — `SalesByProductServiceSummary` may omit unit qty columns. The sync upsert only overwrites `SalesRecord.quantity` when QB returns qty > 0; otherwise existing quantity (from Excel bootstrap) is preserved. Check `qtyColumnsDetected` in sync response to confirm whether QB is returning units.
- **QB sales sync removed from cron** — QB OAuth user lacks Reports permission (403). Sales sync can still be triggered manually from the Integrations UI.
- **Cross-route imports in App Router** — never import types or functions from `app/api/.../route.ts` files into other route files. Even `import type` can cause 502s due to bundler behaviour. Put shared helpers in `lib/` instead (e.g. `lib/qbo.ts`, `lib/zenoti.ts`).
- **Shared Neon DB** — local dev and prod point to the same database. Destructive scripts (seed, reimport) run against live data. Always confirm before running import scripts locally.
- **Cron route auth** — `GET /api/cron/sync` and `GET /api/cron/sync-names` both require `Authorization: Bearer <CRON_SECRET>`. Must be set in both `.env` (local) and Vercel environment variables (prod). Vercel native cron sends this header automatically.
- **QB name sync — no-SKU items** — items without a QB `Sku` field are never renamed (counted as `noSku` in response). To rename those products, add SKUs to them in QB first, then re-run the sync.
- **Vendor sync — no overwrite** — existing supplier fields are only filled if currently blank. If a supplier's email was manually edited in BFS, QB vendor data will not overwrite it.
- **Zenoti sync endpoint path** — `lib/zenoti.ts` assumes `/v1/procurement/purchase_orders`. This is unverified — confirm with real API keys and adjust if the actual path differs.
- **Zenoti BfsFulfillmentItem.zenotiItemId** — stores the BFS-internal cuid of the `ZenotiOrderItem` record (not Zenoti's native item ID). Naming is slightly misleading but consistent internally.
- **recharts width(-1) warning** — pre-existing, appears when charts are in hidden/collapsed containers. `// @ts-nocheck` already on chart.tsx; ignore this warning.
- **next/image `sizes` prop** — required for `fill` images. Product view uses `sizes="(max-width: 1024px) 100vw, 33vw"`, product form uses `sizes="(max-width: 640px) 100vw, 512px"`. Always include `sizes` when using `fill`.
- **`NEXT_PUBLIC_APP_URL` must be set in Vercel** — cron routes validate this isn't localhost before making sub-fetches. Set to `https://bfs.kigtech.digital`.
- **`lib/sales-calc.ts` is the single source for avgMonthly** — `computeAvgMonthly()` and `SAFETY_DAYS` are imported by `app/api/reorder/route.ts`, `app/api/inventory/calculate-minimums/route.ts`, and `app/api/settings/stock-policy/route.ts`. Do not redefine SAFETY_DAYS or an inline average calculation in those routes; change it in `lib/sales-calc.ts` only.
- **QB inactive deactivation is SKU/barcode-only** — the deactivation pass in the stock sync matches by `product.sku` or `product.barcode` against the QB item's `Sku` field. Items with no QB SKU are skipped. Already-inactive BFS products (e.g. Inverness) are not touched (query filters `isActive: true`).
- **StockMovement type classification** — `RECONCILIATION` and `OPENING_STOCK` are balance snapshots, not real stock events. Both are excluded from `totalIn` in the movements summary and cards aggregation. Only `PURCHASE_RECEIPT`, `ADJUSTMENT_IN`, `TRANSFER_IN` count as received; only `SALE`, `ADJUSTMENT_OUT`, `TRANSFER_OUT` count as dispatched. Do not add `RECONCILIATION` or `OPENING_STOCK` back to either `IN_TYPES` (movements route) or the summary SQL.
- **QB stock sync delta tracking** — `POST /api/integrations/quickbooks/items` compares `existing.quantity` to `item.QtyOnHand` before upserting. Writes `ADJUSTMENT_OUT` (dispatched) when delta < 0, `ADJUSTMENT_IN` (restocked) when delta > 0, nothing when delta = 0. Only writes `RECONCILIATION` when `existing === null` (first-ever sync for that product). The nightly cron and the manual UI button both use this route.
- **Backfill movements `balanceAfter = 0`** — movements written by the QB invoice backfill route (`POST /api/integrations/quickbooks/backfill-movements`) have `balanceAfter: 0`. Historical balances cannot be reconstructed without full event replay. The "Stock on Hand After" column in the individual movements view will show 0 for these rows — this is expected and noted in the route.
- **QB invoice attribution — multi-store notes** — if the same product is on multiple invoices in one sync cycle, notes reads `"QBO sync: dispatched to Square One, Limeridge Mall"`. The Dispatch by Store report parses this as a single combined key rather than splitting qty between stores. For accurate per-store attribution, the per-invoice movement data (from the backfill, one movement per invoice) is more reliable.
- **Pending product `suggestedBrandName`** — derived by splitting QB `FullyQualifiedName` on `:` (e.g. `"Zensa:Numbing Cream"` → `"Zensa"`). This is a hint only — confirm against real brand list before approving.
- **Dispatch by Store report — `Unknown` store** — movements with `notes = "QBO sync: dispatched"` (pre-attribution or failed invoice fetch) are grouped under `Unknown`. These 30 records are pre-dating the invoice attribution feature (feature 32) and cannot be retroactively attributed.
- **`ProductSupplier.cost` update is `updateMany`** — the cost sync updates ALL `ProductSupplier` records for a product with the same `PurchaseCost` value, regardless of which supplier. QB's `PurchaseCost` is a single global cost; if products have multiple suppliers at different costs, prefer the preferred-supplier record.
- **PendingProduct `seenCount` increments** — the Prisma upsert uses `{ increment: 1 }` on `seenCount` each sync. This only works in Prisma 7 with the raw `increment` syntax on `update`; do not change to a manual `seenCount + 1` read-modify-write.
