import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

const IMPORTS_DIR = path.join(process.cwd(), "qb-imports");

function findLatestFile(): string | null {
  if (!fs.existsSync(IMPORTS_DIR)) return null;
  const files = fs.readdirSync(IMPORTS_DIR)
    .filter((f) => f.startsWith("ProductServiceList") && (f.endsWith(".xls") || f.endsWith(".xlsx")))
    .sort()
    .reverse();
  return files.length ? path.join(IMPORTS_DIR, files[0]) : null;
}

/** Returns the filename of the latest ProductServiceList file in qb-imports/, or null. */
export async function GET() {
  const filePath = findLatestFile();
  return NextResponse.json({
    file: filePath ? path.basename(filePath) : null,
    dir: IMPORTS_DIR,
  });
}

function stripQbHierarchy(name: string) {
  const parts = name.split(":");
  return parts[parts.length - 1].trim();
}

async function resolveProduct(itemName: string, sku?: string) {
  const stripped = stripQbHierarchy(itemName);
  return prisma.product.findFirst({
    where: {
      isActive: true,
      OR: [
        ...(sku ? [{ sku: { equals: sku.trim(), mode: "insensitive" as const } }] : []),
        ...(sku ? [{ barcode: { equals: sku.trim(), mode: "insensitive" as const } }] : []),
        { name: { equals: stripped, mode: "insensitive" as const } },
        { name: { equals: itemName.trim(), mode: "insensitive" as const } },
      ],
    },
    select: { id: true, name: true },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const locationName: string = body.location ?? "BF Warehouse";

  const filePath = findLatestFile();
  if (!filePath) {
    return NextResponse.json(
      { error: `No ProductServiceList*.xls file found in ${IMPORTS_DIR}` },
      { status: 404 }
    );
  }

  const loc = await prisma.location.findFirst({
    where: {
      isActive: true,
      OR: [
        { name: { equals: locationName.trim(), mode: "insensitive" } },
        { code: { equals: locationName.trim(), mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true },
  });
  if (!loc) {
    return NextResponse.json({ error: `Location "${locationName}" not found` }, { status: 422 });
  }

  // Parse XLS — columns mirror the Python script:
  //   0: item name, 2: sku, 3: type, 13: qty on hand, 14: reorder point
  const wb = XLSX.readFile(filePath, { type: "file" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 });

  const parsed: { itemName: string; sku?: string; qty: number; reorderPoint?: number }[] = [];
  for (const r of rawRows.slice(1)) {
    const row = r as unknown[];
    const itemType = String(row[3] ?? "").trim().toLowerCase();
    if (itemType !== "inventory") continue;

    const itemName = String(row[0] ?? "").trim();
    if (!itemName) continue;

    const sku = String(row[2] ?? "").trim() || undefined;
    const qty = Math.max(0, parseFloat(String(row[13] ?? "0")) || 0);
    const rpRaw = parseFloat(String(row[14] ?? ""));
    const reorderPoint = isNaN(rpRaw) ? undefined : Math.max(0, rpRaw);

    parsed.push({ itemName, sku, qty, reorderPoint });
  }

  if (parsed.length === 0) {
    return NextResponse.json({ error: "No inventory rows found in file" }, { status: 422 });
  }

  let synced = 0, skipped = 0;
  const errors: string[] = [];
  const startedAt = new Date();

  for (let i = 0; i < parsed.length; i++) {
    const row = parsed[i];
    try {
      const product = await resolveProduct(row.itemName, row.sku);
      if (!product) {
        errors.push(`Not found: "${row.itemName}"`);
        skipped++;
        continue;
      }

      await prisma.$transaction(async (tx) => {
        await tx.inventory.upsert({
          where:  { productId_locationId: { productId: product.id, locationId: loc.id } },
          update: { quantity: row.qty, ...(row.reorderPoint != null ? { reorderPoint: row.reorderPoint } : {}) },
          create: { productId: product.id, locationId: loc.id, quantity: row.qty, reorderPoint: row.reorderPoint ?? 0, reorderQty: 0, minQuantity: 0 },
        });

        await tx.stockMovement.create({
          data: {
            productId:   product.id,
            locationId:  loc.id,
            type:        "RECONCILIATION",
            quantity:    row.qty,
            balanceAfter: row.qty,
            notes:       `QB XLS import — ${path.basename(filePath)}`,
          },
        });
      });

      synced++;
    } catch (err: unknown) {
      errors.push(`"${row.itemName}": ${err instanceof Error ? err.message : String(err)}`);
      skipped++;
    }
  }

  await prisma.$transaction([
    prisma.syncLog.create({
      data: {
        provider:   "QUICKBOOKS",
        type:       "STOCK_SYNC",
        status:     errors.length > 0 && synced === 0 ? "FAILED" : errors.length > 0 ? "PARTIAL" : "SUCCESS",
        message:    `XLS import: ${synced} synced, ${skipped} skipped — ${path.basename(filePath)}`,
        recordsIn:  parsed.length,
        recordsOut: synced,
      },
    }),
    prisma.integrationConfig.upsert({
      where:  { provider: "QUICKBOOKS" },
      update: { lastSyncAt: startedAt },
      create: { provider: "QUICKBOOKS", config: { defaultLocation: locationName }, isActive: true, lastSyncAt: startedAt },
    }),
  ]);

  return NextResponse.json({
    file:    path.basename(filePath),
    total:   parsed.length,
    synced,
    skipped,
    errors:  errors.slice(0, 30),
  });
}
