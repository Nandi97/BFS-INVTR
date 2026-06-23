# BFS Inventory

Warehouse inventory management system for a multi-location beauty distribution company. Replaces an Excel-based workflow with real-time stock visibility, automated low-stock alerts, reorder calculations driven by actual sales history, and a Zenoti fulfillment loop — while keeping QuickBooks Online as the source of truth for transactions.

---

## Stack

|                   |                                               |
| ----------------- | --------------------------------------------- |
| **Framework**     | Next.js 16 (App Router), React 19, TypeScript |
| **Database**      | PostgreSQL (Neon) + Prisma 7                  |
| **Auth**          | better-auth 1.6 (GitHub + Google OAuth, RBAC) |
| **UI**            | shadcn + Tailwind 4 + recharts                |
| **Data fetching** | TanStack Query v5 + axios                     |
| **Email**         | nodemailer via Gmail app password             |
| **Excel**         | ExcelJS (email attachments + report exports)  |
| **File uploads**  | UploadThing                                   |

---

## Getting Started

```bash
npm install

cp .env.example .env
# Fill in required variables — see Environment Variables section below

npx prisma migrate deploy
npx prisma generate
npx prisma db seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **After any schema change** run `npx prisma migrate dev --name <name>` then `npx prisma generate`, then **restart the dev server** — it caches the compiled Prisma client and won't pick up new models until restarted.

---

## Initial Data Import

These scripts are one-time bootstrap only. Do not re-run against production — they overwrite live data.

```bash
# One-time Python env
python3 -m venv /tmp/bfs-venv
/tmp/bfs-venv/bin/pip install requests openpyxl xlrd

# 1. Product catalog + opening stock from Excel spreadsheet
/tmp/bfs-venv/bin/python3 scripts/import_warehouse.py

# 2. Brand lead times + disable direct-supply locations
npx tsx --env-file=.env scripts/seed-lead-times.ts

# 3. QB stock quantities + 12-month sales history
/tmp/bfs-venv/bin/python3 scripts/import_qb_data.py all

# 4. Set local brands to 2-month stock target
npx tsx --env-file=.env scripts/set-local-target-months.ts
```

Stock quantities are now maintained by the nightly QB API cron (`/api/cron/sync`). Product names are synced monthly via `/api/cron/sync-names`.

---

## Features

### ✅ Built

| Route              | Feature                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `/dashboard`       | KPI cards, stock health donut chart, urgent reorder list, recent movements                                                        |
| `/products`        | Product catalog — brand / category / type filters, search, inline stock levels, image upload, sales + stock charts on detail page |
| `/stock`           | Per-location inventory, stock adjustments, thresholds                                                                             |
| `/stock/movements` | Full audit log of every quantity change                                                                                           |
| `/stock/locations` | Manage warehouse and retail locations                                                                                             |
| `/reorder`         | Items below reorder point ranked by urgency; auto-calculate reorder points from sales data                                        |
| `/suppliers`       | Vendor contacts and preferred-supplier assignments                                                                                |
| `/purchase-orders` | Create POs, mark sent, receive items (auto-status: DRAFT → SENT → RECEIVED)                                                       |
| `/notifications`   | Alert rules for out-of-stock / low-stock / reorder / daily digest; emails with styled XLSX attachment                             |
| `/analytics`       | Monthly sales charts, top products, year-on-year comparison                                                                       |
| `/reports`         | Stock valuation, low stock, movements, PO history — all exportable                                                                |
| `/import-export`   | Bulk import products / suppliers / opening stock from CSV; export catalog + stock                                                 |
| `/integrations`    | QuickBooks OAuth sync (stock, product names, vendors), sync history log                                                           |
| `/zenoti`          | Fulfillment dashboard — pull RAISED/UPDATED procurement orders from Zenoti, pack on iPad, email packing list to accounting        |
| `/settings`        | Per-product target stock months, brand lead times, user/role management                                                           |

### ⏳ In Progress

| Feature                     | Notes                                                                                               |
| --------------------------- | --------------------------------------------------------------------------------------------------- |
| Zenoti → QB invoice posting | Phase 2: post fulfilled orders directly as QB Invoices. Currently sends packing list by email only. |
| Zenoti API verification     | Endpoint paths are assumed; verify once API keys are provisioned.                                   |

---

## QuickBooks Integration

QB is the **source of truth** for stock quantities and product names.

| Sync type           | Route                                                | Trigger                  |
| ------------------- | ---------------------------------------------------- | ------------------------ |
| Stock quantities    | `POST /api/integrations/quickbooks/items`            | UI button + nightly cron |
| Product names       | `POST /api/integrations/quickbooks/items/sync-names` | UI button + monthly cron |
| Vendors → Suppliers | `POST /api/integrations/quickbooks/vendors`          | UI button (on-demand)    |

Cron jobs run at `0 6 * * *` (stock) and `0 7 1 * *` (names). Both require `Authorization: Bearer <CRON_SECRET>` — set in `.env` and Vercel environment variables.

---

## Zenoti Integration

Service locations raise procurement orders in Zenoti. BFS pulls those orders and the inventory associate fulfills them, then emails a packing list to accounting.

Two Zenoti instances are supported (configured via separate API keys). The sync fans out one request per center across both instances and merges results.

**Fulfillment flow:**

1. "Sync from Zenoti" pulls RAISED + UPDATED orders across all centers
2. Associate opens an order → "Start Packing" pre-loads items with requested quantities, matched to warehouse stock by barcode
3. Associate adjusts fulfilled quantities, checks off packed items, adds any walk-in items
4. "Submit & Email" sends an XLSX packing list to accounting (CC: warehouse)
5. _(Phase 2)_ Accounting posts QB Invoice from the packing list

---

## Reorder Calculations

```
reorderPoint = ceil(avgMonthly × (leadTimeDays + 7) / 30)   ← stock level to trigger an order
reorderQty   = ceil(avgMonthly × targetStockMonths)          ← how much to order
minQuantity  = ceil(avgMonthly × 7 / 30)                    ← 1-week safety buffer
```

`avgMonthly` = average of last 12 months of sales quantity. Products with no sales history are skipped.

**Lead times** and **target stock months** are configurable per brand in Settings.

---

## Project Structure

```
app/
  (dashboard)/        # Page routes (thin wrappers only — no logic)
    dashboard/ products/ stock/ reorder/
    suppliers/ purchase-orders/ notifications/
    analytics/ reports/ import-export/
    integrations/ settings/ zenoti/
  api/                # API routes (mirrors page structure)
    products/ brands/ locations/ stock/ reorder/
    purchase-orders/ notifications/ sales/ reports/
    import/ export/ integrations/ settings/ zenoti/ cron/

components/           # All UI logic lives here, grouped by module
  <module>/
    dashboard/        # list/overview component
    create/           # add-or-edit form
    view/             # detail page component
  ui/                 # shadcn primitives

hooks/                # TanStack Query hooks (one file per domain)
lib/                  # prisma, axios, mailer, zenoti, qbo, notification-engine, email-xlsx
prisma/               # schema.prisma, seed.ts, migrations/
scripts/              # one-time data import scripts
```

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# Auth
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Email (Gmail app password)
GMAIL_USER=...
GMAIL_APP_PASSWORD=...

# QuickBooks
QBO_CLIENT_ID=...
QBO_CLIENT_SECRET=...
QBO_ENVIRONMENT=production
NEXT_PUBLIC_APP_URL=https://your-deployment-url.com

# Cron authentication
CRON_SECRET=...

# Zenoti (obtain from Zenoti Admin → Setup → Apps)
ZENOTI_BFS_API_KEY=...
ZENOTI_BL_API_KEY=...

# File uploads (UploadThing)
UPLOADTHING_TOKEN=...
```
