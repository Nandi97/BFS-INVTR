'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useQbSyncSales, type SyncResult } from '@/hooks/use-integrations';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const MONTH_NAMES = [
	'jan',
	'feb',
	'mar',
	'apr',
	'may',
	'jun',
	'jul',
	'aug',
	'sep',
	'oct',
	'nov',
	'dec',
];

/**
 * QB Sales by Product/Service Summary export parser.
 * Handles two QB export shapes:
 *
 *   Flat:  Item Name, Month (1-12 or "Jan"), Year, Quantity, Revenue
 *   Wide:  Item Name, Year, Jan, Feb, …, Dec  (revenue per month)
 */
function parseQbSalesCsv(
	raw: string,
	defaultYear: number
): Record<string, string>[] {
	const lines = raw.trim().split(/\r?\n/).filter(Boolean);
	if (!lines.length) return [];

	const normalise = (s: string) =>
		s
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9]/g, '');

	const HEADER_MAP: Record<string, string> = {
		itemname: 'itemName',
		name: 'itemName',
		item: 'itemName',
		month: 'month',
		revenue: 'revenue',
		amount: 'revenue',
		qty: 'quantity',
		quantity: 'quantity',
		units: 'quantity',
		year: 'year',
		sku: 'sku',
		barcode: 'sku',
		...Object.fromEntries(MONTH_NAMES.map((m) => [m, m])),
	};

	const firstCells = lines[0]
		.split(',')
		.map((c) => c.replace(/^"|"$/g, '').trim());
	const isHeader = firstCells.some((c) => HEADER_MAP[normalise(c)]);

	let colMap: Record<number, string>;
	let dataLines: string[];

	if (isHeader) {
		colMap = {};
		dataLines = lines.slice(1);
		firstCells.forEach((c, i) => {
			const key = HEADER_MAP[normalise(c)];
			if (key) colMap[i] = key;
		});
	} else {
		// Guess: Item Name, Month, Year, Qty, Revenue
		colMap = {
			0: 'itemName',
			1: 'month',
			2: 'year',
			3: 'quantity',
			4: 'revenue',
		};
		dataLines = lines;
	}

	return dataLines
		.map((line) => {
			const cells = line
				.split(',')
				.map((c) => c.replace(/^"|"$/g, '').trim());
			const row: Record<string, string> = { year: String(defaultYear) };
			Object.entries(colMap).forEach(([idx, key]) => {
				const v = cells[parseInt(idx)] ?? '';
				if (v !== '') row[key] = v;
			});

			// Normalise month name → number
			if (row.month) {
				const mn = MONTH_NAMES.indexOf(
					row.month.toLowerCase().slice(0, 3)
				);
				if (mn !== -1) row.month = String(mn + 1);
			}

			return row;
		})
		.filter((r) => r.itemName);
}

export function QbSalesImport() {
	const currentYear = new Date().getFullYear();
	const [csv, setCsv] = useState('');
	const [year, setYear] = useState(currentYear);
	const { mutate, isPending } = useQbSyncSales();

	const [result, setResult] = useState<{
		synced: number;
		skipped: number;
		errors: string[];
		total: number;
	} | null>(null);

	function handleSync() {
		const rows = parseQbSalesCsv(csv, year);
		if (!rows.length) {
			toast.error('No valid rows found — check your CSV');
			return;
		}
		mutate(rows, {
			onSuccess: (data: SyncResult) => {
				const synced = data.synced ?? data.upserted ?? 0;
				setResult({
					synced,
					skipped: data.skipped,
					errors: data.errors,
					total: data.total,
				});
				toast.success(`Synced ${synced} of ${data.total} rows`);
			},
			onError: () => toast.error('Sync failed'),
		});
	}

	return (
		<div className="space-y-4">
			<div className="max-w-[160px] space-y-1.5">
				<Label htmlFor="sales-year">Year</Label>
				<Input
					id="sales-year"
					type="number"
					min={2000}
					max={2100}
					value={year}
					onChange={(e) =>
						setYear(parseInt(e.target.value) || currentYear)
					}
				/>
				<p className="text-muted-foreground text-xs">
					Used when year column is absent.
				</p>
			</div>

			<div className="space-y-1.5">
				<Label htmlFor="qb-sales-csv">
					Paste QB Sales by Product/Service Summary CSV
				</Label>
				<p className="text-muted-foreground text-xs">
					Supports two QB export formats:
					<br />
					<strong>Wide:</strong> Item Name, Jan, Feb, …, Dec (revenue
					per month)
					<br />
					<strong>Flat:</strong> Item Name, Month, Year, Quantity,
					Revenue
				</p>
				<Textarea
					id="qb-sales-csv"
					className="min-h-[200px] font-mono text-xs"
					placeholder={
						'Item Name,Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec\nTROIAREUKE RX 35ml,320.00,240.00,400.00,,,,,,,,,,\nBanhada Cleanser,180.00,150.00,,,,,,,,,,,'
					}
					value={csv}
					onChange={(e) => {
						setCsv(e.target.value);
						setResult(null);
					}}
				/>
			</div>

			<Button onClick={handleSync} disabled={isPending || !csv.trim()}>
				{isPending ? 'Syncing…' : 'Sync sales'}
			</Button>

			{result && (
				<div
					className={cn(
						'space-y-2 rounded-md border p-4 text-sm',
						result.errors.length > 0 && result.synced === 0
							? 'border-destructive/40 bg-destructive/5'
							: result.errors.length > 0
								? 'border-yellow-500/40 bg-yellow-500/5'
								: 'border-green-500/40 bg-green-500/5'
					)}
				>
					<p>
						<span className="font-medium">{result.synced}</span>{' '}
						records synced,{' '}
						<span className="font-medium">{result.skipped}</span>{' '}
						skipped of{' '}
						<span className="font-medium">{result.total}</span> rows
					</p>
					{result.errors.length > 0 && (
						<ul className="text-muted-foreground list-inside list-disc space-y-0.5 text-xs">
							{result.errors.map((e, i) => (
								<li key={i}>{e}</li>
							))}
						</ul>
					)}
				</div>
			)}
		</div>
	);
}
