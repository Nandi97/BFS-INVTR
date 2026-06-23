import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
	const { searchParams } = new URL(req.url);
	const year = searchParams.get('year')
		? parseInt(searchParams.get('year')!, 10)
		: undefined;
	const month = searchParams.get('month')
		? parseInt(searchParams.get('month')!, 10)
		: undefined;
	const productId = searchParams.get('productId') ?? undefined;
	const brandId = searchParams.get('brandId') ?? undefined;
	const categoryId = searchParams.get('categoryId') ?? undefined;
	const page = parseInt(searchParams.get('page') ?? '1', 10);
	const limit = parseInt(searchParams.get('limit') ?? '50', 10);
	const skip = (page - 1) * limit;

	const where = {
		...(year ? { year } : {}),
		...(month ? { month } : {}),
		...(productId ? { productId } : {}),
		product: {
			isActive: true,
			...(brandId ? { brandId } : {}),
			...(categoryId ? { categoryId } : {}),
		},
	};

	const [records, total] = await Promise.all([
		prisma.salesRecord.findMany({
			where,
			include: { product: { include: { brand: true, category: true } } },
			orderBy: [{ year: 'desc' }, { month: 'desc' }],
			skip,
			take: limit,
		}),
		prisma.salesRecord.count({ where }),
	]);

	return NextResponse.json({ data: records, total, page, limit });
}
