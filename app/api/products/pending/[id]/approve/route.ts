import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';
import { z } from 'zod';

const ApproveSchema = z.object({
	name: z.string().min(1),
	brandId: z.string().optional(),
	categoryId: z.string().optional(),
	sku: z.string().optional(),
	barcode: z.string().optional(),
	unit: z.string().default('each'),
	locationId: z.string().min(1),
});

export async function POST(
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const auth = await requireRole('MANAGER');
	if (auth instanceof NextResponse) return auth;

	const { id } = await params;
	const pending = await prisma.pendingProduct.findUnique({ where: { id } });
	if (!pending)
		return NextResponse.json({ error: 'Not found' }, { status: 404 });

	const body = await req.json().catch(() => ({}));
	const parsed = ApproveSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: parsed.error.flatten() },
			{ status: 422 }
		);
	}

	const { name, brandId, categoryId, sku, barcode, unit, locationId } =
		parsed.data;

	// Check for SKU/barcode conflicts
	if (sku) {
		const conflict = await prisma.product.findUnique({ where: { sku } });
		if (conflict)
			return NextResponse.json(
				{ error: `SKU "${sku}" already in use` },
				{ status: 409 }
			);
	}
	if (barcode) {
		const conflict = await prisma.product.findUnique({
			where: { barcode },
		});
		if (conflict)
			return NextResponse.json(
				{ error: `Barcode "${barcode}" already in use` },
				{ status: 409 }
			);
	}

	const loc = await prisma.location.findUnique({
		where: { id: locationId },
		select: { id: true },
	});
	if (!loc)
		return NextResponse.json(
			{ error: 'Location not found' },
			{ status: 422 }
		);

	const product = await prisma.$transaction(async (tx) => {
		const p = await tx.product.create({
			data: {
				name,
				sku: sku || null,
				barcode: barcode || null,
				brandId: brandId || null,
				categoryId: categoryId || null,
				unit,
			},
		});

		await tx.inventory.create({
			data: {
				productId: p.id,
				locationId,
				quantity: pending.qtyOnHand,
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
				quantity: pending.qtyOnHand,
				balanceAfter: pending.qtyOnHand,
				notes: `Approved from QB staging (QB item: ${pending.qboName})`,
				reference: pending.qboSku ?? undefined,
			},
		});

		await tx.pendingProduct.delete({ where: { id } });

		return p;
	});

	return NextResponse.json({ product }, { status: 201 });
}
