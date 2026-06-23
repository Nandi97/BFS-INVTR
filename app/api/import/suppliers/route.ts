import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';

export interface SupplierImportRow {
	name: string;
	contactName?: string;
	email?: string;
	phone?: string;
	address?: string;
	leadTimeDays?: number;
	notes?: string;
}

export async function POST(req: NextRequest) {
	const _auth = await requireRole('ADMIN');
	if (_auth instanceof NextResponse) return _auth;

	const body = await req.json();
	const { rows }: { rows: SupplierImportRow[] } = body;

	if (!Array.isArray(rows) || rows.length === 0) {
		return NextResponse.json(
			{ error: 'rows array required' },
			{ status: 400 }
		);
	}

	let created = 0,
		updated = 0,
		skipped = 0;
	const errors: string[] = [];

	for (let i = 0; i < rows.length; i++) {
		const row = rows[i];
		if (!row.name?.trim()) {
			errors.push(`Row ${i + 1}: missing supplier name`);
			skipped++;
			continue;
		}

		try {
			const name = row.name.trim();
			const existing = await prisma.supplier.findUnique({
				where: { name },
				select: { id: true },
			});

			const data = {
				contactName: row.contactName ?? undefined,
				email: row.email?.trim() || null,
				phone: row.phone?.trim() || null,
				address: row.address?.trim() || null,
				leadTimeDays:
					row.leadTimeDays != null
						? Number(row.leadTimeDays)
						: undefined,
				notes: row.notes?.trim() || null,
			};

			if (existing) {
				await prisma.supplier.update({
					where: { id: existing.id },
					data,
				});
				updated++;
			} else {
				await prisma.supplier.create({ data: { name, ...data } });
				created++;
			}
		} catch (err: unknown) {
			errors.push(
				`Row ${i + 1} ("${row.name}"): ${err instanceof Error ? err.message : String(err)}`
			);
			skipped++;
		}
	}

	return NextResponse.json({
		created,
		updated,
		skipped,
		errors: errors.slice(0, 20),
		total: rows.length,
	});
}
