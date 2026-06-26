import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';
import { sendInternalUseSlip } from '@/lib/internal-use-email';

interface LineItem {
	productId: string;
	locationId: string;
	quantity: number;
	reason: string;
	notes?: string;
}

export async function POST(req: NextRequest) {
	const auth = await requireRole('MANAGER');
	if (auth instanceof NextResponse) return auth;
	const { user } = auth;

	const body = await req.json();
	const { items, recipientEmail } = body as {
		items: LineItem[];
		recipientEmail?: string;
	};

	if (!Array.isArray(items) || items.length === 0) {
		return NextResponse.json(
			{ error: 'items array is required and must not be empty' },
			{ status: 400 }
		);
	}

	for (const item of items) {
		if (!item.productId || !item.locationId) {
			return NextResponse.json(
				{ error: 'Each item requires productId and locationId' },
				{ status: 400 }
			);
		}
		const qty = Number(item.quantity);
		if (isNaN(qty) || qty <= 0) {
			return NextResponse.json(
				{ error: 'Each item quantity must be a positive number' },
				{ status: 400 }
			);
		}
	}

	const now = new Date();

	const movements = await prisma.$transaction(async (tx) => {
		const created = [];

		for (const item of items) {
			const qty = Number(item.quantity);

			let inv = await tx.inventory.findUnique({
				where: {
					productId_locationId: {
						productId: item.productId,
						locationId: item.locationId,
					},
				},
			});

			if (!inv) {
				inv = await tx.inventory.create({
					data: {
						productId: item.productId,
						locationId: item.locationId,
						quantity: 0,
					},
				});
			}

			const newBalance = inv.quantity - qty;

			await tx.inventory.update({
				where: {
					productId_locationId: {
						productId: item.productId,
						locationId: item.locationId,
					},
				},
				data: { quantity: newBalance },
			});

			const movement = await tx.stockMovement.create({
				data: {
					productId: item.productId,
					locationId: item.locationId,
					type: 'INTERNAL_USE',
					quantity: qty,
					balanceAfter: newBalance,
					notes: item.reason
						? `${item.reason}${item.notes ? ` — ${item.notes}` : ''}`
						: (item.notes ?? null),
					userId: user.id === 'cron' ? null : user.id,
				},
				include: {
					product: {
						select: {
							name: true,
							sku: true,
							brand: { select: { name: true } },
						},
					},
					location: { select: { name: true } },
				},
			});

			created.push(movement);
		}

		return created;
	});

	// Send slip fire-and-forget
	const ccSetting = await prisma.appSetting.findUnique({
		where: { key: 'internal_use_cc' },
	});

	const submittedByName = await prisma.user
		.findUnique({ where: { id: user.id }, select: { name: true } })
		.then((u) => u?.name ?? user.email);

	sendInternalUseSlip({
		items: movements.map((m) => ({
			productName: m.product.name,
			brandName: m.product.brand?.name ?? null,
			sku: m.product.sku,
			locationName: m.location.name,
			quantity: m.quantity,
			reason:
				items.find((i) => i.productId === m.productId)?.reason ?? '',
			notes:
				items.find((i) => i.productId === m.productId)?.notes ?? null,
		})),
		recipientEmail: recipientEmail ?? null,
		submittedByName: submittedByName ?? user.email,
		cc: ccSetting?.value ?? '',
		date: now,
	}).catch(console.error);

	return NextResponse.json(
		{ movements: movements.map((m) => m.id) },
		{ status: 201 }
	);
}
