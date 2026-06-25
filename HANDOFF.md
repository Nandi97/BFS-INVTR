# Handoff

## Last session (2026-06-25)

### Completed

- **Zenoti Excel import workflow** — temporary intake workflow while waiting for Zenoti API keys.
    - `lib/zenoti-excel.ts` — shared parse + upsert logic: `parseOrderFile(sheet)` + `upsertZenotiOrder(parsed, org)`. Handles Zenoti Order Details export format (merged header rows, dynamic row structure, supplier + center name extraction, CREATED→RAISED status mapping).
    - `app/api/zenoti/import-excel/route.ts` — `POST` accepts multipart form upload (file + org), parses and upserts.
    - `app/api/zenoti/scan-uploads/route.ts` — `POST` scans `uploads/zenoti/{org}/` directory directly (no sub-fetch, no auth issue); `GET ?org=bfs` debug endpoint shows cwd/dir/allFiles from server's perspective.
    - `hooks/use-zenoti.ts` — added `useImportZenotiExcel()` and `useScanZenotiUploads()` mutations.
    - `components/zenoti/import/zenoti-import-panel.tsx` — two org cards (BFS/BL) with drag-drop dropzone, Import Selected File, Scan Local Folder buttons, result display.
    - `components/zenoti/dashboard/zenoti-page-tabs.tsx` — tabs wrapper (Procurement Orders / Import from Excel).
    - `app/(dashboard)/zenoti/page.tsx` — now renders `ZenotiPageTabs` instead of `ZenotiOrdersTable` directly.
    - `uploads/zenoti/bfs/` + `uploads/zenoti/bl/` — staging directories (`.gitkeep` tracked, xlsx files gitignored).
    - **Excel format confirmed**: per-order detail files (not list exports). "From:" and "Billing address:" labels on same row; supplier + billing address on the next row. Line items delimited by `#` / `Code` header row and "Total quantity" footer.

- **ZenotiOrder ID convention**: `MANUAL-{ORG}-{orderNumber}` (e.g. `MANUAL-BFS-4072`) to distinguish manual imports from future API-synced orders.

### In progress / pending restart

The import workflow was still not working at end of session. Root cause traced to **ExcelJS being bundled by Turbopack** instead of running as a native Node module. Fixes applied, **require dev server restart**:

1. `next.config.ts` — added `'exceljs'` to `serverExternalPackages` (was only `['xlsx']`). **Must restart dev server for this to take effect.**
2. `app/api/zenoti/import-excel/route.ts` — Buffer conversion fixed: `Buffer.from(new Uint8Array(arrayBuf))` instead of `arrayBuf as any`. Single try/catch wraps the entire handler so all errors return JSON (not HTML 500).
3. `components/zenoti/import/zenoti-import-panel.tsx` — Scan toast now shows actual server path + allFiles when 0 files found, for debugging.

**After restarting dev server**, test with the 5 Excel files already in the staging dirs:

- `uploads/zenoti/bfs/`: Order Number 4064.xlsx, 4069.xlsx, 4072.xlsx, 4075.xlsx
- `uploads/zenoti/bl/`: Order Number 345.xlsx

DB is clean (0 MANUAL-\* orders). Use Import Selected File first, then Scan Local Folder.

---

## Session before that (2026-06-23)

- Internal use / shrinkage tracking, ProductCombobox, Prettier + Husky — complete. See CLAUDE.md features #36–38.
- QB delta tracking, invoice attribution, cost sync, pending product staging, restocks/dispatches presets, Dispatch by Store report — complete. See CLAUDE.md features #28–35.

---

## Up next

### High priority

- [ ] **Verify Zenoti Excel import works** after dev server restart (see above). Test both Import Selected File and Scan Local Folder. Confirm orders appear in Procurement Orders tab and fulfillment flow works on them.
- [ ] **Zenoti API keys** — ticket BC-60590, ETA was 2026-06-23, may have arrived. Check `alvinkigen@outlook.com`. If yes: add `ZENOTI_BFS_API_KEY` + `ZENOTI_BL_API_KEY` to `.env` + Vercel, hit `GET /api/zenoti/centers`, test sync, verify PO endpoint path in `lib/zenoti.ts → fetchZenotiPOs()`. The Excel workflow then becomes a fallback only.
- [ ] **Zenoti Phase 2** — QB Invoice posting (`POST /api/zenoti/fulfillments/[id]/post-to-qb`). Needs accounting team sign-off + QB customer names per store.

### Medium priority

- [ ] Reorder bulk actions — multi-select → "Create PO for selected" or "Export selected"
- [ ] Dashboard KPI deltas — ±N trend vs prior week on each KPI card
- [ ] Analytics date range picker
- [ ] Mobile table responsiveness — `overflow-x-auto` on wide tables

---

## Active blockers

- Zenoti API subscription (ticket BC-60590) — check email, may be resolved
- QB OAuth refresh token valid until ~Sep 2026 — nightly cron emails admin if ≤7 days remain

## Key gotchas for next session

- `exceljs` is now in `serverExternalPackages` in `next.config.ts` — required for ExcelJS to work correctly in API routes with Turbopack. Do not remove.
- Use `pnpm` — never npm/yarn. Pre-push runs `tsc --noEmit`, fix type errors before pushing.
- Zenoti order IDs from Excel imports: `MANUAL-{ORG}-{orderNumber}`. API-synced orders (once keys arrive) will use Zenoti's native IDs — no collision.
- `ProductCombobox` + `useProductsMinimal()` for all product pickers — not `useProducts()`
- `INTERNAL_USE` is in `SUBTRACT_TYPES` (reduces stock) but excluded from movements summary OUT totals — not a store dispatch
- `chart.tsx`, `product-view.tsx`, `lib/auth.ts` have intentional `@ts-nocheck`/`@ts-ignore` — ESLint config already exempts them, do not remove
- 86 ESLint warnings remain in codebase (unused imports, any types) — warnings only, won't block commits
