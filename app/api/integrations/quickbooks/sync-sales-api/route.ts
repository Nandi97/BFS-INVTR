import { NextResponse } from "next/server";
import { qboFetch } from "@/lib/qbo";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

// "Apr 2025" → { month: 4, year: 2025 }
function parseMonthTitle(title: string): { month: number; year: number } | null {
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const m = title.match(/^(\w{3})\s+(\d{4})$/);
  if (!m) return null;
  const month = MONTHS.indexOf(m[1]) + 1;
  const year  = parseInt(m[2], 10);
  return month > 0 && !isNaN(year) ? { month, year } : null;
}

interface ColSlot {
  index:    number;
  dataType: "name" | "qty" | "amount" | "skip";
  month?:   number;
  year?:    number;
}

// QB SalesByProductServiceSummary with summarize_column_by=Month:
// [Account, (Month Qty)?, Month Amount, ..., Total]
// We detect column roles by title + ColType.
function buildColMap(columns: { ColTitle: string; ColType: string }[]): ColSlot[] {
  const slots: ColSlot[] = [];
  let lastMonth: { month: number; year: number } | null = null;

  for (let i = 0; i < columns.length; i++) {
    const { ColTitle: title = "", ColType: type = "" } = columns[i];
    const trimmed = title.trim();

    if (i === 0) { slots.push({ index: i, dataType: "name" }); continue; }

    const parsed = parseMonthTitle(trimmed);
    if (parsed) {
      lastMonth = parsed;
      slots.push({ index: i, dataType: type === "Money" ? "amount" : "qty", ...parsed });
      continue;
    }

    // Empty title = sibling column for the previous month
    if (trimmed === "" && lastMonth) {
      slots.push({ index: i, dataType: type === "Money" ? "amount" : "qty", ...lastMonth });
      continue;
    }

    slots.push({ index: i, dataType: "skip" });
  }
  return slots;
}

type QbRow = { ColData?: { value?: string }[]; type?: string; Rows?: { Row?: QbRow[] } };

function extractDataRows(rows: QbRow[]): { value?: string }[][] {
  const result: { value?: string }[][] = [];
  for (const row of rows) {
    if (row.type === "Data" && Array.isArray(row.ColData)) result.push(row.ColData);
    const nested = row.Rows?.Row;
    if (nested) result.push(...extractDataRows(nested));
  }
  return result;
}

function stripHierarchy(name: string) {
  const parts = name.split(":");
  return parts[parts.length - 1].trim();
}

async function resolveProduct(name: string) {
  const stripped = stripHierarchy(name);
  return prisma.product.findFirst({
    where: {
      isActive: true,
      OR: [
        { name: { equals: stripped,    mode: "insensitive" } },
        { name: { equals: name.trim(), mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
}

function fmtDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function POST() {
  const _auth = await requireRole("MANAGER");
  if (_auth instanceof NextResponse) return _auth;

  // 12 complete months ending last month
  const now       = new Date();
  const endDate   = new Date(now.getFullYear(), now.getMonth(), 0);       // last day of prev month
  const startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 11, 1); // 12 months back

  const url = `/reports/SalesByProductServiceSummary?start_date=${fmtDate(startDate)}&end_date=${fmtDate(endDate)}&summarize_column_by=Month`;

  let reportData: Record<string, unknown>;
  try {
    const res = await qboFetch(url);
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`QB Reports API: ${res.status} ${txt.slice(0, 300)}`);
    }
    reportData = await res.json();
  } catch (err) {
    await prisma.syncLog.create({
      data: {
        provider:   "QUICKBOOKS",
        type:       "SALES_SYNC",
        status:     "FAILED",
        message:    err instanceof Error ? err.message : String(err),
        recordsIn:  0,
        recordsOut: 0,
      },
    });
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 502 });
  }

  const columns  = (reportData.Columns as { Column: { ColTitle: string; ColType: string }[] } | undefined)?.Column ?? [];
  const colMap   = buildColMap(columns);
  const rawRows  = (reportData.Rows as { Row?: QbRow[] } | undefined)?.Row ?? [];
  const dataRows = extractDataRows(rawRows);

  let synced = 0, skipped = 0, qtyRecords = 0;
  const errors: string[] = [];
  const startedAt = new Date();

  type MonthKey = `${number}-${number}`;
  const accumulator = new Map<string, Map<MonthKey, { qty: number; amount: number }>>();

  for (const colData of dataRows) {
    const name = colData[0]?.value?.trim() ?? "";
    if (!name) continue;

    const product = await resolveProduct(name);
    if (!product) { errors.push(`Not found: "${name}"`); skipped++; continue; }

    if (!accumulator.has(product.id)) accumulator.set(product.id, new Map());
    const monthMap = accumulator.get(product.id)!;

    for (const slot of colMap) {
      if (slot.dataType === "skip" || slot.dataType === "name" || !slot.month || !slot.year) continue;
      const raw = colData[slot.index]?.value ?? "";
      const val = parseFloat(raw.replace(/[$,]/g, "")) || 0;
      if (!val) continue;
      const key = `${slot.year}-${slot.month}` as MonthKey;
      if (!monthMap.has(key)) monthMap.set(key, { qty: 0, amount: 0 });
      const entry = monthMap.get(key)!;
      if (slot.dataType === "qty")    { entry.qty += val; qtyRecords++; }
      if (slot.dataType === "amount") entry.amount += val;
    }
  }

  for (const [productId, monthMap] of accumulator) {
    for (const [key, { qty, amount }] of monthMap) {
      const [yearStr, monthStr] = key.split("-");
      const year  = parseInt(yearStr,  10);
      const month = parseInt(monthStr, 10);
      try {
        await prisma.salesRecord.upsert({
          where:  { productId_year_month: { productId, year, month } },
          // Only overwrite quantity if QB report actually returned one (>0).
          // SalesByProductServiceSummary may omit qty columns — preserving the
          // Excel-import quantity avoids silently zeroing out avgMonthly.
          update: {
            ...(qty > 0 ? { quantity: Math.round(qty) } : {}),
            revenue: amount,
            source: "QB_API",
            updatedAt: new Date(),
          },
          create: { productId, year, month, quantity: Math.round(qty), revenue: amount, source: "QB_API" },
        });
        synced++;
      } catch (err) {
        errors.push(`${key}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  await prisma.syncLog.create({
    data: {
      provider:   "QUICKBOOKS",
      type:       "SALES_SYNC",
      status:     errors.length > 0 && synced === 0 ? "FAILED" : errors.length > 0 ? "PARTIAL" : "SUCCESS",
      message:    `QB API: ${synced} records synced, ${skipped} products skipped (${fmtDate(startDate)} – ${fmtDate(endDate)})`,
      recordsIn:  dataRows.length,
      recordsOut: synced,
    },
  });

  await prisma.integrationConfig.update({
    where: { provider: "QUICKBOOKS" },
    data:  { lastSyncAt: startedAt },
  });

  return NextResponse.json({
    synced, skipped, total: dataRows.length,
    qtyColumnsDetected: qtyRecords > 0,
    errors: errors.slice(0, 30),
    period: { from: fmtDate(startDate), to: fmtDate(endDate) },
  });
}
