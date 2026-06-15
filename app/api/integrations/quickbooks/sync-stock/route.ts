import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

/**
 * QB Physical Inventory Worksheet import.
 *
 * Accepts rows in either format:
 *   { itemName, qty, reorderPoint? }           ← mapped from QB worksheet
 *   { itemName, sku?, description?, qty, ... } ← extended QB export
 *
 * itemName may be hierarchical: "Brand:Product Name" (QB sub-item format).
 * Resolution order: barcode match → SKU match → exact name → QB colon-stripped name.
 */

interface QbStockRow {
  itemName:     string;
  sku?:         string;
  qty:          number | string;
  reorderPoint?: number | string;
}

interface SyncResult {
  synced:   number;
  skipped:  number;
  errors:   string[];
  total:    number;
}

function stripQbHierarchy(name: string) {
  // QB stores sub-items as "Parent:Child" — take the child part
  const parts = name.split(":");
  return parts[parts.length - 1].trim();
}

async function resolveProduct(itemName: string, sku?: string) {
  const stripped = stripQbHierarchy(itemName);

  return prisma.product.findFirst({
    where: {
      isActive: true,
      OR: [
        // SKU from QB export
        ...(sku ? [{ sku: { equals: sku.trim(), mode: "insensitive" as const } }] : []),
        // barcode treated as SKU in QB sometimes
        ...(sku ? [{ barcode: { equals: sku.trim(), mode: "insensitive" as const } }] : []),
        // exact item name
        { name: { equals: stripped, mode: "insensitive" as const } },
        // full QB name (with parent prefix)
        { name: { equals: itemName.trim(), mode: "insensitive" as const } },
      ],
    },
    select: { id: true, name: true },
  });
}

async function resolveLocation(name: string) {
  return prisma.location.findFirst({
    where: {
      isActive: true,
      OR: [
        { name: { equals: name.trim(), mode: "insensitive" } },
        { code: { equals: name.trim(), mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true },
  });
}

export async function POST(req: NextRequest) {
  const _auth = await requireRole("MANAGER");
  if (_auth instanceof NextResponse) return _auth;

  const body = await req.json();
  const { rows, location: locationName = "BF Warehouse" }:
    { rows: QbStockRow[]; location?: string } = body;

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "rows required" }, { status: 400 });
  }

  const loc = await resolveLocation(locationName);
  if (!loc) {
    return NextResponse.json({ error: `Location "${locationName}" not found` }, { status: 422 });
  }

  const result: SyncResult = { synced: 0, skipped: 0, errors: [], total: rows.length };
  const startedAt = new Date();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.itemName?.trim()) { result.skipped++; continue; }

    const qty = parseFloat(String(row.qty));
    if (isNaN(qty)) {
      result.errors.push(`Row ${i + 1}: invalid qty "${row.qty}" for "${row.itemName}"`);
      result.skipped++;
      continue;
    }

    const safeQty = Math.max(0, qty);

    try {
      const product = await resolveProduct(row.itemName, row.sku);
      if (!product) {
        result.errors.push(`Not found: "${row.itemName}"`);
        result.skipped++;
        continue;
      }

      await prisma.$transaction(async (tx) => {
        const rp = row.reorderPoint != null ? Math.max(0, parseFloat(String(row.reorderPoint))) : undefined;

        await tx.inventory.upsert({
          where:  { productId_locationId: { productId: product.id, locationId: loc.id } },
          update: { quantity: safeQty, ...(rp != null ? { reorderPoint: rp } : {}) },
          create: { productId: product.id, locationId: loc.id, quantity: safeQty, reorderPoint: rp ?? 0, reorderQty: 0, minQuantity: 0 },
        });

        await tx.stockMovement.create({
          data: {
            productId:   product.id,
            locationId:  loc.id,
            type:        "RECONCILIATION",
            quantity:    safeQty,
            balanceAfter: safeQty,
            notes:       `QB sync — original qty: ${qty}${qty < 0 ? " (negative clamped to 0)" : ""}`,
          },
        });
      });

      result.synced++;
    } catch (err: unknown) {
      result.errors.push(`Row ${i + 1} "${row.itemName}": ${err instanceof Error ? err.message : String(err)}`);
      result.skipped++;
    }
  }

  // Record sync log
  await prisma.$transaction([
    prisma.syncLog.create({
      data: {
        provider:   "QUICKBOOKS",
        type:       "STOCK_SYNC",
        status:     result.errors.length > 0 && result.synced === 0 ? "FAILED" : result.errors.length > 0 ? "PARTIAL" : "SUCCESS",
        message:    `${result.synced} synced, ${result.skipped} skipped`,
        recordsIn:  result.total,
        recordsOut: result.synced,
      },
    }),
    prisma.integrationConfig.upsert({
      where:  { provider: "QUICKBOOKS" },
      update: { lastSyncAt: startedAt },
      create: { provider: "QUICKBOOKS", config: { defaultLocation: locationName }, isActive: true, lastSyncAt: startedAt },
    }),
  ]);

  return NextResponse.json({ ...result, errors: result.errors.slice(0, 30) });
}
