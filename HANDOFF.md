# Handoff

## Last session (2026-06-23)

### Completed

- **Internal use / shrinkage tracking** — `INTERNAL_USE` StockMovementType + `isReviewed/reviewNote/reviewedAt` on StockMovement (migration `20260622205144`). "Log Internal Use" sheet on Movements page. "Shrinkage" preset chip with amber badge. "Explain" button per row. QB sync reconciles INTERNAL_USE before writing ADJUSTMENT_OUT.
- **ProductCombobox** — `components/ui/product-combobox.tsx`, searches name + SKU + brand. `useProductsMinimal()` hook (`GET /api/products?minimal=true`) bypasses 100-product cap, returns all active products, 5-min stale time.
- **Prettier + Husky** — `pnpm format/format:check/typecheck` scripts. Pre-commit: lint-staged (prettier + eslint on staged files). Pre-push: `tsc --noEmit`. `trailingComma: "es5"`.
- **ESLint config tuned** — `no-explicit-any` → warn; `no-unescaped-entities` → warn; `ban-ts-comment` off for `chart.tsx`, `product-view.tsx`, `lib/auth.ts`; `set-state-in-effect` off for `use-mobile.ts` (shadcn boilerplate). Full codebase formatted and committed (`7ac7cf2`).
- **HANDOFF.md** — created and committed. Memory files updated (10 entries).

### Session before that (also 2026-06-23)

- QB delta tracking, invoice attribution, cost sync, pending product staging, restocks/dispatches presets, Dispatch by Store report — all complete. See CLAUDE.md features #28–35.

---

## Up next

### High priority

- [ ] **Zenoti API keys** — ticket BC-60590 ETA was 2026-06-23, may have arrived. Check `alvinkigen@outlook.com`. If yes: add `ZENOTI_BFS_API_KEY` + `ZENOTI_BL_API_KEY` to `.env` + Vercel, hit `GET /api/zenoti/centers`, test sync, verify PO endpoint path in `lib/zenoti.ts → fetchZenotiPOs()`.
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

- Use `pnpm` — never npm/yarn. Pre-push runs `tsc --noEmit`, fix type errors before pushing.
- `ProductCombobox` + `useProductsMinimal()` for all product pickers — not `useProducts()`
- `INTERNAL_USE` is in `SUBTRACT_TYPES` (reduces stock) but excluded from movements summary OUT totals — not a store dispatch
- `chart.tsx`, `product-view.tsx`, `lib/auth.ts` have intentional `@ts-nocheck`/`@ts-ignore` — ESLint config already exempts them, do not remove
- 86 ESLint warnings remain in codebase (unused imports, any types) — warnings only, won't block commits
