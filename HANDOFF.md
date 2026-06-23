# Handoff

## Last session (2026-06-23)

### Completed

- **Internal use / shrinkage tracking** — new `INTERNAL_USE` StockMovementType + `isReviewed/reviewNote/reviewedAt` on StockMovement (migration `20260622205144`). "Log Internal Use" sheet on Movements page (product, qty, reason, notes). "Shrinkage" preset chip shows unreviewed `ADJUSTMENT_OUT` with no QB reference + amber badge count. "Explain" button on each row marks it reviewed. QB sync reconciles `INTERNAL_USE` movements before writing `ADJUSTMENT_OUT` to avoid double-counting.
- **ProductCombobox** — `components/ui/product-combobox.tsx`, searches name + SKU + brand. Used in Log Internal Use form and New PO form line items.
- **products?minimal=true endpoint** — bypasses the 100-product API cap, returns all active products as `[{ id, name, sku, brandName }]` with no pagination. `useProductsMinimal()` hook, 5-min stale time.
- **Prettier + Husky** — `pnpm format`, `pnpm format:check`, `pnpm typecheck` scripts. Pre-commit runs lint-staged (prettier + eslint on staged files). Pre-push runs `tsc --noEmit`. `trailingComma` changed from `"none"` to `"es5"`.

### Session before that (also 2026-06-23)

- QB delta tracking, invoice attribution, cost sync, pending product staging, restocks/dispatches presets, Dispatch by Store report, backfill button removed — all complete. See CLAUDE.md features #28–35.

---

## Up next

### High priority

- [ ] **Zenoti Phase 2** — QB Invoice posting (`POST /api/zenoti/fulfillments/[id]/post-to-qb`). Needs accounting team sign-off + QB customer names per store. API keys may have arrived (ticket BC-60590 ETA was 2026-06-23).
- [ ] **Verify Zenoti API keys** — check if ticket BC-60590 was resolved. If yes: add `ZENOTI_BFS_API_KEY` + `ZENOTI_BL_API_KEY` to `.env` + Vercel, hit `GET /api/zenoti/centers`, test sync, verify PO endpoint path in `lib/zenoti.ts → fetchZenotiPOs()`.

### Medium priority

- [ ] Reorder bulk actions — multi-select → "Create PO for selected" or "Export selected"
- [ ] Dashboard KPI deltas — ±N trend vs prior week on each KPI card
- [ ] Analytics date range picker
- [ ] Mobile table responsiveness — `overflow-x-auto` on wide tables

---

## Active blockers

- Zenoti API subscription (ticket BC-60590, `alvinkigen@outlook.com`) — may be resolved, check email
- QB OAuth refresh token valid until ~Sep 2026 — nightly cron emails admin if ≤7 days remain

## Key gotchas for next session

- `ProductCombobox` takes `products: ProductOption[]` where `ProductOption = { id, name, sku?, brandName? }` — use `useProductsMinimal()` not `useProducts()`
- `INTERNAL_USE` subtracts from stock (in `SUBTRACT_TYPES` in adjust route) but is excluded from `OUT_TYPES` in the movements summary SQL — intentional, it's not a store dispatch
- Husky pre-push runs `tsc --noEmit` — fix type errors before pushing or the push will be blocked
- Shared Neon DB — local dev and prod point to the same database. Don't run seed/import scripts locally
