# Handoff

## Last session (2026-06-26)

### Completed

- **Responsive design polish** (feature #46) — 8 tasks across the full app:
    1. `min-w-0` on `SidebarInset` (`app/(dashboard)/layout.tsx`) — activates built-in `overflow-x-auto` on all 15 tables at once (root cause was flex ancestor, not tables)
    2. Movements summary cards `grid-cols-1 sm:grid-cols-3` — stack to 1-col on mobile
       3+4. All 5 sheet forms updated: `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` across `product-form`, `supplier-form`, `po-form` header, `pending-products-dashboard`, walk-in dialog in `fulfillment-view`
    3. `export const viewport: Viewport` added to `app/layout.tsx` (Next.js App Router requirement)
    4. Breadcrumbs: parent crumbs hidden on mobile (`hidden sm:flex`), page label truncates at `max-w-[14rem]`; header left-side gets `min-w-0 flex-1`
    5. Dashboard grid: KPI row `lg:grid-cols-4`; chart section gets `md:grid-cols-2` step before `lg:grid-cols-3`
    6. Login page `h-screen` → `min-h-dvh` (fixes iOS Safari address bar clipping)

- **Email / document design standards** (feature #47) — reviewed with `/ui-ux-pro-max`, then fixed:
    - All 4 HTML email sources now have `<!DOCTYPE html><html lang="en">` wrapper (bare `<div>` breaks Outlook)
    - `lib/email-templates.ts` rewritten: `base()` takes `headerBg` param; colour-coded headers (red / amber / purple / green / dark navy) per alert type; emoji icons (⚠️📦🚨✅) removed; table `<th>` gets uppercase + letter-spacing
    - `lib/zenoti-email.ts` — DOCTYPE wrapper, ⚠ emoji → `<strong>` text, label style aligned
    - `app/api/zenoti/orders/[id]/notify/route.ts` — DOCTYPE wrapper, label style aligned
    - `app/api/zenoti/fulfillments/[id]/send-email/route.ts` — packing list email body upgraded from plain `<p>/<ul>` list to full branded card (`#d4006e` header, summary table, CTA button); XLSX packing list gets freeze row (`ySplit: 5`)
    - `lib/email-xlsx.ts` — Summary sheet now has freeze row
    - PDF packing slip (`lib/packing-slip-pdf.tsx`) — already production quality, no changes needed

---

## Session before that (2026-06-25)

### Completed

- **Configurable email recipients** (feature #44) — `AppSetting` key-value store now drives all Zenoti email addresses. Six keys: warehouse / costco / inverness / other import notifications + packing list To/CC. `lib/email-recipients.ts` → `getEmailRecipients()` helper. `GET/PATCH /api/settings/email-recipients`. New **Email Recipients** tab in Settings (`components/settings/dashboard/email-recipients-form.tsx`). `lib/zenoti-email.ts` `TYPE_META` now uses `settingKey` instead of hardcoded addresses. `lib/mailer.ts` accepts optional `cc` field.

- **Decoupled email from order completion** (feature #45):
    - Submit route (`POST /fulfillments/[id]/submit`) stripped to just mark `SUBMITTED` — no PDF, no email
    - New `POST /api/zenoti/fulfillments/[id]/send-email` — explicit packing list trigger (PDF + XLSX, reads recipients from AppSetting)
    - New `POST /api/zenoti/orders/[id]/notify` — manual notification email per order, colour-coded by supplier type (green/blue/violet/grey), includes items table + "View Order →" button; reads recipient from AppSetting
    - `GET /api/zenoti/orders` now returns `fulfillment.id` (was missing)
    - **Fulfillment view** — "Submit & Email" → "Mark Complete" (AlertDialog, locks order only) + "Actions" dropdown: Download Packing Slip / Send Packing List Email / Send Order Notification
    - **Orders table** — ellipsis `DropdownMenu` per row; row click still navigates. Send Notification always available; Download + Send Packing List shown only when `fulfillment.id` exists
    - New hooks: `useSendPackingListEmail()`, `useSendOrderNotification()`

---

## Session before that (2026-06-25 — earlier)

- **Zenoti Excel import working** — Import Selected File and Scan Local Folder both parse order detail exports correctly.
- **ZenotiOrder.supplier field** — migration `20260625182009_add_zenoti_order_supplier`.
- **Supplier type classification** — `getSupplierType()` + coloured type badges + filter chips in dashboard.
- **Email on import** — `sendZenotiImportEmail()` fires fire-and-forget after each new order imported.
- **iPad packing UI** — `PackingCard` with `QtyStepperField`, debounced notes textarea, packed checkbox.
- **PDF packing slip** — `lib/packing-slip-pdf.tsx`, brand pink `#d4006e`, Helvetica built-in, `wrap={false}` on sign-off blocks, logo from `public/assets/images/Beauty_Logix_Logo.png`.
- **Hydration warning fixed** — `suppressHydrationWarning` on `<body>` in `app/layout.tsx`.
- **QB Sales API sync button removed** — card removed from Integrations; CSV paste remains.

---

## Session before that (2026-06-23 → 2026-06-25)

- Zenoti Excel import scaffolding (lib/zenoti-excel.ts, import-excel route, scan-uploads route, import panel, page tabs).
- Internal use / shrinkage tracking, ProductCombobox, Prettier + Husky — features #36–38 in CLAUDE.md.
- QB delta tracking, invoice attribution, cost sync, pending product staging, restocks/dispatches presets, Dispatch by Store report — features #28–35 in CLAUDE.md.

---

## Up next

### High priority

- [ ] **Zenoti API keys** — ticket BC-60590, check `alvinkigen@outlook.com`. If keys arrived: add `ZENOTI_BFS_API_KEY` + `ZENOTI_BL_API_KEY` to `.env` + Vercel, hit `GET /api/zenoti/centers`, test sync, verify PO endpoint path in `lib/zenoti.ts → fetchZenotiPOs()`. Excel import becomes fallback only.
- [ ] **QB Invoice posting** (`POST /api/zenoti/fulfillments/[id]/post-to-qb`) — QB OAuth already wired in. Needs QB customer names per store + accounting team sign-off. Next logical step after fulfillment.
- [ ] **Restore email routing** — use Email Recipients tab in Settings to update COSTCO + INVERNESS recipients to `accounting@beautyfirstspa.com` when testing is done.

### Medium priority

- [ ] Reorder bulk actions — multi-select → "Create PO for selected" or "Export selected"
- [ ] Dashboard KPI deltas — ±N trend vs prior week on each KPI card
- [ ] Analytics date range picker

---

## Active blockers

- Zenoti API subscription (ticket BC-60590) — check email, may already be resolved
- QB OAuth refresh token valid until ~Sep 2026 — nightly cron emails admin if ≤7 days remain

## Key gotchas for next session

- `useImportZenotiExcel` uses native `fetch` (not `api` from `lib/axios.ts`) — the `api` instance sets `Content-Type: application/json` globally, which overwrites FormData's `multipart/form-data` boundary. Do not switch it back to `api.post`.
- `@react-pdf/renderer` and `exceljs` are both in `serverExternalPackages` in `next.config.ts` — do not remove.
- React-pdf uses `Helvetica` / `Helvetica-Bold` built-in fonts. Do not add Google Fonts CDN URLs. Bold requires `fontFamily: 'Helvetica-Bold'`, not `fontWeight: 700`.
- `getEmailRecipients()` is in `lib/email-recipients.ts` — do not import `RECIPIENT_KEYS`/`RECIPIENT_DEFAULTS` from the settings route file (cross-route import → 502).
- Submit route no longer sends email — it only marks SUBMITTED. Email is triggered via `POST /fulfillments/[id]/send-email`.
- Zenoti order IDs from Excel: `MANUAL-{ORG}-{orderNumber}`. API-synced orders use Zenoti native IDs.
- All Zenoti import emails currently go to `order@beautylogix.ca` regardless of supplier type — intentional for testing.
- Use `pnpm` — never npm/yarn. Pre-commit runs lint-staged (prettier + eslint --fix), pre-push runs `tsc --noEmit`.
- `ProductCombobox` + `useProductsMinimal()` for all product pickers — not `useProducts()` (caps at 100).
- `chart.tsx`, `product-view.tsx`, `lib/auth.ts` have intentional `@ts-nocheck`/`@ts-ignore` — do not remove.
- Responsive: `SidebarInset` has `min-w-0` in `app/(dashboard)/layout.tsx` — do not remove, it's what activates table scroll on all 15 tables.
- Email HTML: all templates use `<!DOCTYPE html>` wrapper — do not revert to bare `<div>`.
- Email HTML: no emoji icons — use coloured text labels or `<strong>` tags instead.
