# Handoff

## Last session (2026-06-25)

### Completed

- **Zenoti Excel import working** — confirmed functional after dev server restart. Import Selected File and Scan Local Folder both parse order detail exports correctly. Orders appear in Procurement Orders tab and fulfillment flow works on them.

- **ZenotiOrder.supplier field** — migration `20260625182009_add_zenoti_order_supplier` adds `supplier String?` to `ZenotiOrder`. `lib/zenoti-excel.ts` saves it on upsert. The `notes` field fallback (`"From: Beauty Logix Inc"`) is still read by the UI for older records.

- **Supplier type classification** — `lib/zenoti-email.ts` exports `SupplierType` (`WAREHOUSE | COSTCO | INVERNESS | OTHER`) and `getSupplierType()`. Dashboard shows coloured type badges (emerald/blue/violet/gray). Filter chips (All / Warehouse / Costco / Inverness) replace the org filter. "Org" column replaced by "Type" column.

- **Email on import** — `lib/zenoti-email.ts` → `sendZenotiImportEmail()`. Fires fire-and-forget after each new order is imported (created, not updated). Sends styled HTML email with order details, supplier type, unmatched product codes, and CTA button. **Currently all types route to `order@beautylogix.ca` for testing** — production routing (accounting@beautyfirstspa.com for non-warehouse orders) is commented in `TYPE_META`.

- **iPad packing UI** — `components/zenoti/view/fulfillment-view.tsx` rewritten. Old table rows → `PackingCard` cards. Each card has:
    - `QtyStepperField` (−/+ buttons flanking number input, saves on blur)
    - Notes textarea with 700ms debounced save via `useRef`
    - Packed checkbox (checked = green card)
    - ESLint override in `eslint.config.mjs` for `set-state-in-effect` (PackingCard syncs state from server in `useEffect`)

- **PDF packing slip** — `lib/packing-slip-pdf.tsx` using `@react-pdf/renderer` v4:
    - Built-in Helvetica/Helvetica-Bold (no external font fetch — avoids 404)
    - Beauty First brand pink `#d4006e` as accent throughout
    - A4: logo header, 5-col meta cards, status pills, items table with colour-coded rows (green/amber/red/violet), totals, legend, sign-off blocks (Warehouse + Store)
    - `wrap={false}` on legend + sign-off section prevents mid-box page breaks
    - `GET /api/zenoti/fulfillments/[id]/packing-slip` streams PDF download
    - Submit route now generates PDF + XLSX in `Promise.all` and attaches both to email
    - Logo: `public/assets/images/Beauty_Logix_Logo.png` (AVIF → PNG via `sips`)
    - `@react-pdf/renderer` added to `serverExternalPackages` in `next.config.ts`

- **Hydration warning fixed** — `suppressHydrationWarning` added to `<body>` in `app/layout.tsx` (browser extensions like ColorZilla inject `cz-shortcut-listen` attribute post-hydration)

- **QB Sales API sync button removed** — `SalesByProductServiceSummary` returns 403 (QB user lacks Reports permission) and is not in the cron. The card was removed from the Sales tab in `components/integrations/dashboard/integrations-dashboard.tsx`. CSV paste fallback remains.

---

## Session before that (2026-06-23 → 2026-06-25)

- Zenoti Excel import scaffolding (lib/zenoti-excel.ts, import-excel route, scan-uploads route, import panel, page tabs) — see commits for details.
- Internal use / shrinkage tracking, ProductCombobox, Prettier + Husky — features #36–38 in CLAUDE.md.
- QB delta tracking, invoice attribution, cost sync, pending product staging, restocks/dispatches presets, Dispatch by Store report — features #28–35 in CLAUDE.md.

---

## Up next

### High priority

- [ ] **Restore email routing** — when testing is done, update `TYPE_META` in `lib/zenoti-email.ts`:
    - `WAREHOUSE` → `order@beautylogix.ca` (current, correct)
    - `COSTCO` → `accounting@beautyfirstspa.com`
    - `INVERNESS` → `accounting@beautyfirstspa.com`
    - `OTHER` → decide with team
- [ ] **Zenoti API keys** — ticket BC-60590, check `alvinkigen@outlook.com`. If keys arrived: add `ZENOTI_BFS_API_KEY` + `ZENOTI_BL_API_KEY` to `.env` + Vercel, hit `GET /api/zenoti/centers`, test sync, verify PO endpoint path in `lib/zenoti.ts → fetchZenotiPOs()`. Excel import becomes fallback only.
- [ ] **Zenoti Phase 2** — QB Invoice posting (`POST /api/zenoti/fulfillments/[id]/post-to-qb`). Needs accounting team sign-off + QB customer names per store.

### Medium priority

- [ ] Reorder bulk actions — multi-select → "Create PO for selected" or "Export selected"
- [ ] Dashboard KPI deltas — ±N trend vs prior week on each KPI card
- [ ] Analytics date range picker
- [ ] Mobile table responsiveness — `overflow-x-auto` on wide tables

---

## Active blockers

- Zenoti API subscription (ticket BC-60590) — check email, may already be resolved
- QB OAuth refresh token valid until ~Sep 2026 — nightly cron emails admin if ≤7 days remain

## Key gotchas for next session

- `useImportZenotiExcel` uses native `fetch` (not `api` from `lib/axios.ts`) — the `api` instance sets `Content-Type: application/json` globally, which overwrites FormData's `multipart/form-data` boundary and causes the server to reject the file upload. Do not switch it back to `api.post`.
- `@react-pdf/renderer` and `exceljs` are both in `serverExternalPackages` in `next.config.ts` — required for native Node modules to work under Turbopack. Do not remove either.
- React-pdf uses `Helvetica` / `Helvetica-Bold` built-in fonts. Do not add Google Fonts CDN URLs — they 404. Bold requires `fontFamily: 'Helvetica-Bold'`, not `fontWeight: 700`.
- Zenoti order IDs from Excel imports: `MANUAL-{ORG}-{orderNumber}`. API-synced orders (once keys arrive) will use Zenoti's native IDs — no collision.
- All Zenoti import emails currently go to `order@beautylogix.ca` regardless of supplier type — intentional for testing. See `TYPE_META` in `lib/zenoti-email.ts`.
- Use `pnpm` — never npm/yarn. Pre-commit runs lint-staged (prettier + eslint --fix), pre-push runs `tsc --noEmit`.
- `ProductCombobox` + `useProductsMinimal()` for all product pickers — not `useProducts()` (caps at 100)
- `chart.tsx`, `product-view.tsx`, `lib/auth.ts` have intentional `@ts-nocheck`/`@ts-ignore` — ESLint config exempts them, do not remove
