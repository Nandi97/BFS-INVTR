import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';

export interface ProductImportRow {
	name: string;
	brand?: string;
	barcode?: string;
	sku?: string;
	size?: string; // appended to name if present
	type?: string; // P, R, PROFESSIONAL, RETAIL, or BOTH
	category?: string;
	supplier?: string;
	cost?: number;
}

interface ImportResult {
	created: number;
	updated: number;
	skipped: number;
	errors: string[];
	total: number;
}

function resolveType(raw?: string): 'PROFESSIONAL' | 'RETAIL' | 'BOTH' {
	const v = (raw ?? '').trim().toUpperCase();
	if (v === 'P' || v === 'PROFESSIONAL') return 'PROFESSIONAL';
	if (v === 'R' || v === 'RETAIL') return 'RETAIL';
	return 'BOTH';
}

async function getOrCreateBrand(name: string) {
	const n = name.trim();
	return prisma.brand.upsert({
		where: { name: n },
		update: {},
		create: { name: n },
		select: { id: true },
	});
}

async function getOrCreateCategory(name: string) {
	const n = name.trim();
	return prisma.category.upsert({
		where: { name: n },
		update: {},
		create: { name: n },
		select: { id: true },
	});
}

async function getOrCreateSupplier(name: string) {
	const n = name.trim();
	return prisma.supplier.upsert({
		where: { name: n },
		update: {},
		create: { name: n },
		select: { id: true },
	});
}

export async function POST(req: NextRequest) {
	const _auth = await requireRole('ADMIN');
	if (_auth instanceof NextResponse) return _auth;

	const body = await req.json();
	const { rows }: { rows: ProductImportRow[] } = body;

	if (!Array.isArray(rows) || rows.length === 0) {
		return NextResponse.json(
			{ error: 'rows array required' },
			{ status: 400 }
		);
	}

	const result: ImportResult = {
		created: 0,
		updated: 0,
		skipped: 0,
		errors: [],
		total: rows.length,
	};

	for (let i = 0; i < rows.length; i++) {
		const row = rows[i];
		try {
			if (!row.name?.trim()) {
				result.errors.push(`Row ${i + 1}: missing product name`);
				result.skipped++;
				continue;
			}

			const productName = row.size?.trim()
				? `${row.name.trim()} (${row.size.trim()})`
				: row.name.trim();

			const brandId = row.brand
				? (await getOrCreateBrand(row.brand)).id
				: undefined;
			const categoryId = row.category
				? (await getOrCreateCategory(row.category)).id
				: undefined;
			const productType = resolveType(row.type);

			// Try to find existing product by barcode, sku, or exact name
			const existing = await prisma.product.findFirst({
				where: {
					OR: [
						...(row.barcode
							? [{ barcode: row.barcode.trim() }]
							: []),
						...(row.sku ? [{ sku: row.sku.trim() }] : []),
						{ name: productName },
					],
				},
				select: { id: true },
			});

			if (existing) {
				await prisma.product.update({
					where: { id: existing.id },
					data: {
						name: productName,
						brandId: brandId ?? undefined,
						categoryId: categoryId ?? undefined,
						productType,
						...(row.barcode ? { barcode: row.barcode.trim() } : {}),
						...(row.sku ? { sku: row.sku.trim() } : {}),
						isActive: true,
					},
				});

				if (row.supplier) {
					const supplier = await getOrCreateSupplier(row.supplier);
					await prisma.productSupplier.upsert({
						where: {
							productId_supplierId: {
								productId: existing.id,
								supplierId: supplier.id,
							},
						},
						update: {
							...(row.cost != null
								? { cost: Number(row.cost), isPreferred: true }
								: {}),
						},
						create: {
							productId: existing.id,
							supplierId: supplier.id,
							cost: row.cost != null ? Number(row.cost) : null,
							isPreferred: true,
						},
					});
				}

				result.updated++;
			} else {
				const product = await prisma.product.create({
					data: {
						name: productName,
						brandId,
						categoryId,
						productType,
						barcode: row.barcode?.trim() || null,
						sku: row.sku?.trim() || null,
						isActive: true,
					},
				});

				if (row.supplier) {
					const supplier = await getOrCreateSupplier(row.supplier);
					await prisma.productSupplier.create({
						data: {
							productId: product.id,
							supplierId: supplier.id,
							cost: row.cost != null ? Number(row.cost) : null,
							isPreferred: true,
						},
					});
				}

				result.created++;
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			result.errors.push(`Row ${i + 1} ("${row.name}"): ${msg}`);
			result.skipped++;
		}
	}

	return NextResponse.json(result);
}
