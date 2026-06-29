import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';
import { z } from 'zod';

// DELETE /api/products/pending/batch — dismiss multiple pending products
export async function DELETE(req: NextRequest) {
	const auth = await requireRole('MANAGER');
	if (auth instanceof NextResponse) return auth;

	const body = await req.json().catch(() => ({}));
	const parsed = z
		.object({ ids: z.array(z.string()).min(1) })
		.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: 'ids array required' },
			{ status: 400 }
		);
	}

	const { count } = await prisma.pendingProduct.deleteMany({
		where: { id: { in: parsed.data.ids } },
	});

	return NextResponse.json({ dismissed: count });
}

const BatchApproveSchema = z.object({
	ids: z.array(z.string()).min(1),
	locationId: z.string().min(1),
	brandId: z.string().optional(),
	categoryId: z.string().optional(),
	unit: z.string().default('each'),
});

// PATCH /api/products/pending/batch — set ignored flag on multiple pending products
export async function PATCH(req: NextRequest) {
	const auth = await requireRole('MANAGER');
	if (auth instanceof NextResponse) return auth;

	const body = await req.json().catch(() => ({}));
	const parsed = z
		.object({ ids: z.array(z.string()).min(1), ignored: z.boolean() })
		.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: 'ids array and ignored boolean required' },
			{ status: 400 }
		);
	}

	const { count } = await prisma.pendingProduct.updateMany({
		where: { id: { in: parsed.data.ids } },
		data: { ignored: parsed.data.ignored },
	});

	return NextResponse.json({ updated: count });
}

// POST /api/products/pending/batch — approve multiple pending products with shared defaults
export async function POST(req: NextRequest) {
	const auth = await requireRole('MANAGER');
	if (auth instanceof NextResponse) return auth;

	const body = await req.json().catch(() => ({}));
	const parsed = BatchApproveSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: parsed.error.flatten() },
			{ status: 422 }
		);
	}

	const { ids, locationId, brandId, categoryId, unit } = parsed.data;

	const loc = await prisma.location.findUnique({
		where: { id: locationId },
		select: { id: true },
	});
	if (!loc) {
		return NextResponse.json(
			{ error: 'Location not found' },
			{ status: 422 }
		);
	}

	const pending = await prisma.pendingProduct.findMany({
		where: { id: { in: ids } },
	});

	const approved: string[] = [];
	const errors: { id: string; name: string; reason: string }[] = [];

	for (const item of pending) {
		const name = item.qboName.includes(':')
			? item.qboName.split(':').pop()!.trim()
			: item.qboName;

		const sku = item.qboSku ?? undefined;

		// Check SKU conflict — skip rather than block the entire batch
		if (sku) {
			const conflict = await prisma.product.findUnique({
				where: { sku },
			});
			if (conflict) {
				errors.push({
					id: item.id,
					name: item.qboName,
					reason: `SKU "${sku}" already in use`,
				});
				continue;
			}
		}

		try {
			await prisma.$transaction(async (tx) => {
				const p = await tx.product.create({
					data: {
						name,
						sku: sku || null,
						barcode: null,
						brandId: brandId || null,
						categoryId: categoryId || null,
						unit,
					},
				});

				await tx.inventory.create({
					data: {
						productId: p.id,
						locationId,
						quantity: item.qtyOnHand,
						minQuantity: 0,
						reorderPoint: 0,
						reorderQty: 0,
					},
				});

				await tx.stockMovement.create({
					data: {
						productId: p.id,
						locationId,
						type: 'OPENING_STOCK',
						quantity: item.qtyOnHand,
						balanceAfter: item.qtyOnHand,
						notes: `Approved from QB staging (QB item: ${item.qboName})`,
						reference: item.qboSku ?? undefined,
					},
				});

				await tx.pendingProduct.delete({ where: { id: item.id } });
			});

			approved.push(item.id);
		} catch {
			errors.push({
				id: item.id,
				name: item.qboName,
				reason: 'DB error',
			});
		}
	}

	return NextResponse.json(
		{ approved: approved.length, errors },
		{ status: 201 }
	);
}
