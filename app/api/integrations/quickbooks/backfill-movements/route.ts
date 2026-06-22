/**
 * POST /api/integrations/quickbooks/backfill-movements
 *
 * Read-only against QuickBooks — no data is written to QB.
 * Reads QB Invoices and writes ADJUSTMENT_OUT records into BFS StockMovement
 * for any line items that match a BFS product, preserving the original invoice date.
 *
 * Safe to re-run: each movement is keyed by "QB-INV-{DocNumber}", so duplicate
 * line items are skipped if a movement with that reference already exists for the product.
 *
 * Body params:
 *   fromDate?: "YYYY-MM-DD"  — defaults to 2 years ago
 */

import { NextRequest, NextResponse } from "next/server";
import { fetchQboItems, fetchQboInvoices } from "@/lib/qbo";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

// ─── Product resolver (mirrors items/route.ts — kept local, no cross-route import) ──

function stripHierarchy(name: string) {
  const parts = name.split(":");
  return parts[parts.length - 1].trim();
}

async function resolveProduct(fqn: string, sku?: string) {
  const stripped = stripHierarchy(fqn);
  const candidates = [
    ...(sku ? [{ where: { sku:     { equals: sku.trim(), mode: "insensitive" as const } } }] : []),
    ...(sku ? [{ where: { barcode: { equals: sku.trim(), mode: "insensitive" as const } } }] : []),
    { where: { name: { equals: stripped,   mode: "insensitive" as const } } },
    { where: { name: { equals: fqn.trim(), mode: "insensitive" as const } } },
  ];

  for (const { where } of candidates) {
    const hit = await prisma.product.findFirst({
      where: { isActive: true, ...where },
      select: { id: true, name: true },
    });
    if (hit) return hit;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const auth = await requireRole("ADMIN");
  if (auth instanceof NextResponse) return auth;

  const body = await req.json().catch(() => ({}));

  // Default: 2 years back from today
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const fromDate: string = body.fromDate ?? twoYearsAgo.toISOString().slice(0, 10);

  const locationName: string = body.location ?? "BF Warehouse";

  // ── 1. Resolve warehouse location ──────────────────────────────────────────
  const loc = await prisma.location.findFirst({
    where: {
      isActive: true,
      OR: [
        { name: { equals: locationName, mode: "insensitive" } },
        { code: { equals: locationName, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  if (!loc) {
    return NextResponse.json({ error: `Location "${locationName}" not found` }, { status: 422 });
  }

  // ── 2. Build QB item ID → BFS product ID map ───────────────────────────────
  // Fetching all active QB items once and resolving them is far cheaper than
  // resolving per invoice line item (hundreds of DB queries vs one pass).
  let qboItems;
  try {
    qboItems = await fetchQboItems();
  } catch (err: unknown) {
    return NextResponse.json(
      { error: `QB items fetch failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 }
    );
  }

  const itemProductMap = new Map<string, { id: string; name: string }>();
  for (const item of qboItems) {
    const hit = await resolveProduct(item.FullyQualifiedName, item.Sku);
    if (hit) itemProductMap.set(item.Id, hit);
  }

  // ── 3. Fetch all invoices since fromDate ───────────────────────────────────
  let invoices;
  try {
    invoices = await fetchQboInvoices(fromDate);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: `QB invoice fetch failed: ${err instanceof Error ? err.message : String(err)}` },
      { status: 502 }
    );
  }

  // ── 4. Process each invoice ────────────────────────────────────────────────
  let written = 0, skipped = 0, noMatch = 0;
  const errors: string[] = [];

  for (const invoice of invoices) {
    const reference  = `QB-INV-${invoice.DocNumber}`;
    const invoicedTo = invoice.CustomerRef?.name ?? "Unknown";
    const txnDate    = new Date(invoice.TxnDate);

    // Group quantities by QB item ID (handles rare duplicate lines per product)
    const qtyByItemId = new Map<string, number>();
    for (const line of invoice.Line) {
      if (line.DetailType !== "SalesItemLineDetail") continue;
      const detail = line.SalesItemLineDetail;
      if (!detail || !detail.Qty || detail.Qty <= 0) continue;
      const itemId = detail.ItemRef.value;
      qtyByItemId.set(itemId, (qtyByItemId.get(itemId) ?? 0) + detail.Qty);
    }

    for (const [itemId, qty] of qtyByItemId) {
      const product = itemProductMap.get(itemId);
      if (!product) {
        noMatch++;
        continue;
      }

      try {
        // Idempotency: skip if this invoice line was already backfilled
        const exists = await prisma.stockMovement.findFirst({
          where: { reference, productId: product.id },
          select: { id: true },
        });
        if (exists) {
          skipped++;
          continue;
        }

        // Get current inventory balance to use as balanceAfter approximation.
        // Historical balances can't be reconstructed without full event replay,
        // so we record 0 for backfilled records. The "Stock on Hand After" column
        // will show 0 for these rows — a known limitation of backfill data.
        await prisma.stockMovement.create({
          data: {
            productId:    product.id,
            locationId:   loc.id,
            type:         "ADJUSTMENT_OUT",
            quantity:     qty,
            balanceAfter: 0,
            reference,
            notes:        `QB backfill: invoiced to ${invoicedTo}`,
            createdAt:    txnDate,
          },
        });
        written++;
      } catch (err: unknown) {
        errors.push(`INV-${invoice.DocNumber} / ${product.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  await prisma.syncLog.create({
    data: {
      provider:   "QUICKBOOKS",
      type:       "STOCK_SYNC",
      status:     errors.length > 0 && written === 0 ? "FAILED" : errors.length > 0 ? "PARTIAL" : "SUCCESS",
      message:    `QB invoice backfill (from ${fromDate}): ${written} movements written, ${skipped} already existed, ${noMatch} unmatched lines`,
      recordsIn:  invoices.length,
      recordsOut: written,
    },
  });

  return NextResponse.json({
    fromDate,
    invoicesProcessed: invoices.length,
    productsMatched:   itemProductMap.size,
    movements:         { written, skipped, noMatch },
    errors:            errors.slice(0, 50),
    note: "Read-only against QuickBooks. balanceAfter is 0 on backfilled records — historical balances cannot be reconstructed.",
  });
}
