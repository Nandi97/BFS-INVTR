import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function escape(v: string | number | null | undefined) {
	const s = v == null ? '' : String(v);
	return s.includes(',') || s.includes('"') || s.includes('\n')
		? `"${s.replace(/"/g, '""')}"`
		: s;
}

function toCsv(
	headers: string[],
	rows: (string | number | null | undefined)[][]
) {
	return [
		headers.map(escape).join(','),
		...rows.map((r) => r.map(escape).join(',')),
	].join('\r\n');
}

export async function GET() {
	const products = await prisma.product.findMany({
		where: { isActive: true },
		include: {
			brand: true,
			category: true,
			productSuppliers: {
				where: { isPreferred: true },
				take: 1,
				include: { supplier: true },
			},
		},
		orderBy: [{ brand: { name: 'asc' } }, { name: 'asc' }],
	});

	const csv = toCsv(
		[
			'Name',
			'Brand',
			'Barcode',
			'SKU',
			'Category',
			'Type',
			'Unit',
			'Preferred Supplier',
			'Cost',
			'Active',
		],
		products.map((p) => {
			const ps = p.productSuppliers[0];
			return [
				p.name,
				p.brand?.name ?? '',
				p.barcode ?? '',
				p.sku ?? '',
				p.category?.name ?? '',
				p.productType,
				p.unit,
				ps?.supplier.name ?? '',
				ps?.cost ?? '',
				p.isActive ? 'Yes' : 'No',
			];
		})
	);

	return new NextResponse(csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="products-${new Date().toISOString().slice(0, 10)}.csv"`,
		},
	});
}
