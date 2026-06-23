import { NextResponse } from 'next/server';
import { qboFetch } from '@/lib/qbo';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/require-role';

interface QbVendor {
	Id: string;
	DisplayName?: string;
	CompanyName?: string;
	GivenName?: string;
	FamilyName?: string;
	Active?: boolean;
	PrimaryEmailAddr?: { Address?: string };
	PrimaryPhone?: { FreeFormNumber?: string };
	BillAddr?: {
		Line1?: string;
		City?: string;
		CountrySubDivisionCode?: string;
		PostalCode?: string;
		Country?: string;
	};
}

function formatAddress(addr: QbVendor['BillAddr']): string | null {
	if (!addr) return null;
	return (
		[
			addr.Line1,
			addr.City,
			addr.CountrySubDivisionCode,
			addr.PostalCode,
			addr.Country,
		]
			.filter(Boolean)
			.join(', ') || null
	);
}

export async function POST() {
	const _auth = await requireRole('MANAGER');
	if (_auth instanceof NextResponse) return _auth;

	let vendors: QbVendor[];
	try {
		const res = await qboFetch(
			'/query?query=SELECT%20%2A%20FROM%20Vendor%20MAXRESULTS%201000&minorversion=65'
		);
		if (!res.ok) {
			const txt = await res.text();
			throw new Error(
				`QB Vendors API: ${res.status} ${txt.slice(0, 300)}`
			);
		}
		const json = await res.json();
		vendors = json?.QueryResponse?.Vendor ?? [];
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : String(err) },
			{ status: 502 }
		);
	}

	let created = 0,
		updated = 0,
		skipped = 0;

	for (const v of vendors) {
		if (!v.Active) {
			skipped++;
			continue;
		}

		const name = (v.DisplayName || v.CompanyName || '').trim();
		if (!name) {
			skipped++;
			continue;
		}

		const contactName =
			[v.GivenName, v.FamilyName].filter(Boolean).join(' ') || null;
		const email = v.PrimaryEmailAddr?.Address?.trim() || null;
		const phone = v.PrimaryPhone?.FreeFormNumber?.trim() || null;
		const address = formatAddress(v.BillAddr);

		const existing = await prisma.supplier.findFirst({
			where: { name: { equals: name, mode: 'insensitive' } },
		});

		if (existing) {
			// Only fill in fields that are currently blank — don't overwrite manual edits
			const patch: Record<string, unknown> = {};
			if (!existing.contactName && contactName)
				patch.contactName = contactName;
			if (!existing.email && email) patch.email = email;
			if (!existing.phone && phone) patch.phone = phone;
			if (!existing.address && address) patch.address = address;

			if (Object.keys(patch).length > 0) {
				await prisma.supplier.update({
					where: { id: existing.id },
					data: patch,
				});
				updated++;
			} else {
				skipped++;
			}
		} else {
			await prisma.supplier.create({
				data: {
					name,
					contactName,
					email,
					phone,
					address,
					isActive: true,
				},
			});
			created++;
		}
	}

	await prisma.syncLog.create({
		data: {
			provider: 'QUICKBOOKS',
			type: 'VENDOR_SYNC',
			status: 'SUCCESS',
			message: `QB vendors: ${created} created, ${updated} updated, ${skipped} skipped`,
			recordsIn: vendors.length,
			recordsOut: created + updated,
		},
	});

	return NextResponse.json({
		created,
		updated,
		skipped,
		total: vendors.length,
	});
}
