import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import { requireRole } from '@/lib/require-role';
import { parseOrderFile, upsertZenotiOrder } from '@/lib/zenoti-excel';
import { sendZenotiImportEmail } from '@/lib/zenoti-email';

export async function POST(request: NextRequest) {
	const auth = await requireRole('MANAGER');
	if (auth instanceof NextResponse) return auth;

	let formData: FormData;
	try {
		formData = await request.formData();
	} catch {
		return NextResponse.json(
			{ error: 'Expected multipart/form-data' },
			{ status: 400 }
		);
	}

	const file = formData.get('file') as File | null;
	const org = (formData.get('org') as string | null)?.toLowerCase();

	if (!file)
		return NextResponse.json(
			{ error: 'No file provided' },
			{ status: 400 }
		);
	if (!org || !['bfs', 'bl'].includes(org))
		return NextResponse.json(
			{ error: 'org must be "bfs" or "bl"' },
			{ status: 400 }
		);

	try {
		const arrayBuf = await file.arrayBuffer();
		const workbook = new ExcelJS.Workbook();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		await workbook.xlsx.load(Buffer.from(new Uint8Array(arrayBuf)) as any);

		const sheet = workbook.worksheets[0];
		if (!sheet)
			return NextResponse.json(
				{ error: 'No worksheet found in workbook' },
				{ status: 400 }
			);

		const parsed = parseOrderFile(sheet);

		if (!parsed.orderNumber) {
			return NextResponse.json(
				{
					error: 'Could not find order number. Expected "Purchase order (Ref no: XXXX)" near the top of the file.',
				},
				{ status: 422 }
			);
		}

		const result = await upsertZenotiOrder(parsed, org);

		if (result.action === 'created') {
			sendZenotiImportEmail(result, org).catch((e) =>
				console.error('[import-excel] email failed:', e)
			);
		}

		return NextResponse.json({ ok: true, ...result });
	} catch (err) {
		console.error('[import-excel] error:', err);
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : String(err) },
			{ status: 500 }
		);
	}
}
