import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import ExcelJS from 'exceljs';
import { requireRole } from '@/lib/require-role';
import { parseOrderFile, upsertZenotiOrder } from '@/lib/zenoti-excel';
import { sendZenotiImportEmail } from '@/lib/zenoti-email';

// Debug endpoint — hit /api/zenoti/scan-uploads?org=bfs in the browser to see
// exactly what path the server is resolving to and what files it sees.
export async function GET(request: NextRequest) {
	const { searchParams } = request.nextUrl;
	const org = searchParams.get('org') ?? 'bfs';
	const cwd = process.cwd();
	const dir = path.join(cwd, 'uploads', 'zenoti', org);
	const exists = fs.existsSync(dir);
	const allFiles = exists ? fs.readdirSync(dir) : [];
	return NextResponse.json({ cwd, dir, exists, allFiles });
}

// Scans uploads/zenoti/{org}/ and processes every .xlsx file directly.
// Works in local dev; Vercel has no persistent FS — use the browser upload there.
export async function POST(request: NextRequest) {
	const auth = await requireRole('MANAGER');
	if (auth instanceof NextResponse) return auth;

	const org = request.nextUrl.searchParams.get('org')?.toLowerCase();

	if (!org || !['bfs', 'bl'].includes(org)) {
		return NextResponse.json(
			{ error: 'org must be "bfs" or "bl"' },
			{ status: 400 }
		);
	}

	const cwd = process.cwd();
	const dir = path.join(cwd, 'uploads', 'zenoti', org);

	console.log('[scan-uploads] cwd:', cwd);
	console.log('[scan-uploads] dir:', dir);
	console.log('[scan-uploads] exists:', fs.existsSync(dir));

	if (!fs.existsSync(dir)) {
		return NextResponse.json({
			files: [],
			cwd,
			dir,
			message: `Upload directory not found: ${dir}`,
		});
	}

	const allDirFiles = fs.readdirSync(dir);
	console.log('[scan-uploads] all files in dir:', allDirFiles);

	const xlsxFiles = allDirFiles.filter((f) => /\.(xlsx|xls)$/i.test(f));
	console.log('[scan-uploads] xlsx files:', xlsxFiles);

	if (xlsxFiles.length === 0) {
		return NextResponse.json({
			files: [],
			cwd,
			dir,
			allFiles: allDirFiles,
			message: 'No Excel files found in upload directory',
		});
	}

	const results: Record<string, unknown> = {};

	for (const filename of xlsxFiles) {
		const filePath = path.join(dir, filename);
		try {
			const workbook = new ExcelJS.Workbook();
			await workbook.xlsx.readFile(filePath);
			const sheet = workbook.worksheets[0];
			if (!sheet) {
				results[filename] = { error: 'No worksheet found' };
				continue;
			}
			const parsed = parseOrderFile(sheet);
			if (!parsed.orderNumber) {
				results[filename] = {
					error: 'Could not find order number in file',
				};
				continue;
			}
			const r = await upsertZenotiOrder(parsed, org);
			results[filename] = r;
			if (r.action === 'created') {
				sendZenotiImportEmail(r, org).catch((e) =>
					console.error('[scan-uploads] email failed:', e)
				);
			}
		} catch (err) {
			results[filename] = {
				error: err instanceof Error ? err.message : String(err),
			};
		}
	}

	return NextResponse.json({ files: xlsxFiles, results });
}
