import { NextRequest, NextResponse } from "next/server";
import { fetchQboItems, type QboItem } from "@/lib/qbo";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

export interface ItemMatchResult {
  qboId:              string;
  qboName:            string;
  sku:                string | null;
  qtyOnHand:          number;
  matched:            boolean;
  matchedProductId?:  string;
  matchedProductName?: string;
  matchMethod?:       "sku" | "barcode" | "exact" | "hierarchy-stripped";
}

export type { QboItem };

function stripHierarchy(name: string) {
  const parts = name.split(":");
  return parts[parts.length - 1].trim();
}

async function resolveProduct(fqn: string, sku?: string) {
  const stripped = stripHierarchy(fqn);

  const candidates = [
    ...(sku ? [{ field: "sku",     where: { sku:     { equals: sku.trim(), mode: "insensitive" as const } } }] : []),
    ...(sku ? [{ field: "barcode", where: { barcode: { equals: sku.trim(), mode: "insensitive" as const } } }] : []),
    { field: "exact",            where: { name: { equals: stripped, mode: "insensitive" as const } } },
    { field: "hierarchy-stripped", where: { name: { equals: fqn.trim(), mode: "insensitive" as const } } },
  ] as { field: string; where: object }[];

  for (const { field, where } of candidates) {
    const hit = await prisma.product.findFirst({
      where: { isActive: true, ...where },
      select: { id: true, name: true },
    });
    if (hit) return { ...hit, matchMethod: field as ItemMatchResult["matchMethod"] };
  }
  return null;
}

/**
 * GET  — fetch all QBO inventory items and run them through our product resolver.
 *        Returns a match report: which items matched, which didn't, and by what method.
 * POST — fetch + match + sync QtyOnHand into the DB (same as XLS import but live from QBO).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "9999"), 9999);

  let qboItems: QboItem[];
  try {
    qboItems = await fetchQboItems();
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }

  const subset = qboItems.slice(0, limit);
  const results: ItemMatchResult[] = [];

  for (const item of subset) {
    const hit = await resolveProduct(item.FullyQualifiedName, item.Sku);
    results.push({
      qboId:              item.Id,
      qboName:            item.FullyQualifiedName,
      sku:                item.Sku ?? null,
      qtyOnHand:          item.QtyOnHand ?? 0,
      matched:            !!hit,
      matchedProductId:   hit?.id,
      matchedProductName: hit?.name,
      matchMethod:        hit?.matchMethod,
    });
  }

  const matched   = results.filter((r) => r.matched);
  const unmatched = results.filter((r) => !r.matched);

  const byMethod = matched.reduce<Record<string, number>>((acc, r) => {
    const m = r.matchMethod ?? "unknown";
    acc[m] = (acc[m] ?? 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    summary: {
      total:    results.length,
      matched:  matched.length,
      unmatched: unmatched.length,
      matchRate: results.length ? `${Math.round(matched.length / results.length * 100)}%` : "0%",
      byMethod,
    },
    matched,
    unmatched,
  });
}

export async function POST(req: NextRequest) {
  const _auth = await requireRole("MANAGER");
  if (_auth instanceof NextResponse) return _auth;

  const body = await req.json().catch(() => ({}));
  const locationName: string = body.location ?? "BF Warehouse";

  let qboItems: QboItem[];
  try {
    qboItems = await fetchQboItems();
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }

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

  let synced = 0, skipped = 0, deactivated = 0;
  const errors: string[] = [];
  const startedAt = new Date();

  for (const item of qboItems) {
    const hit = await resolveProduct(item.FullyQualifiedName, item.Sku);
    if (!hit) {
      errors.push(`Not found: "${item.FullyQualifiedName}"`);
      skipped++;
      continue;
    }

    const qty = Math.max(0, item.QtyOnHand ?? 0);
    try {
      await prisma.$transaction(async (tx) => {
        await tx.inventory.upsert({
          where:  { productId_locationId: { productId: hit.id, locationId: loc.id } },
          update: { quantity: qty, ...(item.ReorderPoint != null ? { reorderPoint: item.ReorderPoint } : {}) },
          create: { productId: hit.id, locationId: loc.id, quantity: qty, reorderPoint: item.ReorderPoint ?? 0, reorderQty: 0, minQuantity: 0 },
        });
        await tx.stockMovement.create({
          data: {
            productId:    hit.id,
            locationId:   loc.id,
            type:         "RECONCILIATION",
            quantity:     qty,
            balanceAfter: qty,
            notes:        "QBO API live sync",
          },
        });
      });
      synced++;
    } catch (err: unknown) {
      errors.push(`"${item.FullyQualifiedName}": ${err instanceof Error ? err.message : String(err)}`);
      skipped++;
    }
  }

  // ── Deactivate BFS products whose QB item is now inactive ──────────────────
  // Only match by SKU/barcode (strict) to avoid false positives from name matches.
  // Products manually deactivated in BFS for other reasons (e.g. Inverness direct-supply)
  // are already isActive=false and therefore skipped by the findFirst below.
  try {
    const inactiveQboItems = await fetchQboItems(false);
    for (const item of inactiveQboItems) {
      if (!item.Sku) continue;
      const sku = item.Sku.trim();
      const hit = await prisma.product.findFirst({
        where: {
          isActive: true,
          OR: [
            { sku:     { equals: sku, mode: "insensitive" } },
            { barcode: { equals: sku, mode: "insensitive" } },
          ],
        },
        select: { id: true },
      });
      if (hit) {
        await prisma.product.update({ where: { id: hit.id }, data: { isActive: false } });
        deactivated++;
      }
    }
  } catch (err: unknown) {
    errors.push(`Deactivation pass failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  await prisma.syncLog.create({
    data: {
      provider:   "QUICKBOOKS",
      type:       "STOCK_SYNC",
      status:     errors.length > 0 && synced === 0 ? "FAILED" : errors.length > 0 ? "PARTIAL" : "SUCCESS",
      message:    `QBO API sync: ${synced} synced, ${skipped} skipped, ${deactivated} deactivated`,
      recordsIn:  qboItems.length,
      recordsOut: synced,
    },
  });

  await prisma.integrationConfig.update({
    where:  { provider: "QUICKBOOKS" },
    data:   { lastSyncAt: startedAt },
  });

  return NextResponse.json({
    total: qboItems.length, synced, skipped, deactivated, errors: errors.slice(0, 30),
  });
}
