'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Upload, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useImportSales, type SalesImportRow } from '@/hooks/use-sales';

interface ImportResult {
	imported: number;
	skipped: number;
	errors: string[];
	total: number;
}

const schema = z.object({
	csv: z.string().min(1, 'Paste your CSV data above'),
});

type FormValues = z.infer<typeof schema>;

function parseCsv(raw: string): {
	rows: SalesImportRow[];
	parseErrors: string[];
} {
	const lines = raw.trim().split(/\r?\n/);
	const rows: SalesImportRow[] = [];
	const parseErrors: string[] = [];

	// Try to detect if first line is header
	const firstLine = lines[0].toLowerCase();
	const startIdx =
		firstLine.includes('identifier') || firstLine.includes('product')
			? 1
			: 0;

	for (let i = startIdx; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;

		// Support comma or tab delimited
		const parts = line.includes('\t') ? line.split('\t') : line.split(',');
		const [identifier, year, month, quantity, revenue] = parts.map((p) =>
			p.trim().replace(/^"|"$/g, '')
		);

		if (!identifier || !year || !month || !quantity) {
			parseErrors.push(`Line ${i + 1}: missing fields — "${line}"`);
			continue;
		}

		const yr = parseInt(year, 10);
		const mo = parseInt(month, 10);
		const qty = parseInt(quantity, 10);
		const rev = revenue ? parseFloat(revenue) : undefined;

		if (isNaN(yr) || isNaN(mo) || isNaN(qty)) {
			parseErrors.push(
				`Line ${i + 1}: non-numeric year/month/qty — "${line}"`
			);
			continue;
		}

		rows.push({
			identifier,
			year: yr,
			month: mo,
			quantity: qty,
			revenue: rev,
		});
	}

	return { rows, parseErrors };
}

export function SalesImportDialog({
	children,
}: {
	children?: React.ReactNode;
}) {
	const [open, setOpen] = useState(false);
	const [result, setResult] = useState<ImportResult | null>(null);
	const {
		register,
		handleSubmit,
		formState: { errors },
		reset,
	} = useForm<FormValues>({
		resolver: zodResolver(schema),
	});
	const importMutation = useImportSales();

	function onClose(o: boolean) {
		setOpen(o);
		if (!o) {
			reset();
			setResult(null);
		}
	}

	async function onSubmit({ csv }: FormValues) {
		const { rows, parseErrors } = parseCsv(csv);

		if (rows.length === 0) {
			setResult({
				imported: 0,
				skipped: parseErrors.length,
				errors: parseErrors,
				total: parseErrors.length,
			});
			return;
		}

		const res = (await importMutation.mutateAsync(rows)) as {
			imported: number;
			skipped: number;
			errors: string[];
			total: number;
		};
		setResult({
			imported: res.imported,
			errors: [...parseErrors, ...res.errors],
			skipped: res.skipped + parseErrors.length,
			total: res.total + parseErrors.length,
		});
	}

	return (
		<Dialog open={open} onOpenChange={onClose}>
			<DialogTrigger asChild>
				{children ?? (
					<Button variant="outline" size="sm">
						<Upload className="mr-2 h-4 w-4" />
						Import Sales
					</Button>
				)}
			</DialogTrigger>

			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Import Sales Data</DialogTitle>
					<DialogDescription>
						Paste CSV with columns:{' '}
						<code className="bg-muted rounded px-1 text-xs">
							identifier, year, month, quantity, revenue
							(optional)
						</code>
						. The identifier can be a product SKU, barcode, or exact
						product name.
					</DialogDescription>
				</DialogHeader>

				{result ? (
					<div className="space-y-4 py-2">
						<div className="flex gap-3">
							<Badge
								className="gap-1.5 py-1 text-sm"
								variant="secondary"
							>
								<CheckCircle className="h-3.5 w-3.5 text-green-600" />
								{result.imported} imported
							</Badge>
							{result.skipped > 0 && (
								<Badge
									className="gap-1.5 py-1 text-sm"
									variant="secondary"
								>
									<XCircle className="h-3.5 w-3.5 text-red-500" />
									{result.skipped} skipped
								</Badge>
							)}
							<Badge
								className="gap-1.5 py-1 text-sm"
								variant="outline"
							>
								{result.total} total rows
							</Badge>
						</div>

						{result.errors.length > 0 && (
							<Alert variant="destructive">
								<AlertCircle className="h-4 w-4" />
								<AlertDescription>
									<div className="mb-1 font-medium">
										Errors ({result.errors.length}):
									</div>
									<ul className="max-h-48 list-disc space-y-0.5 overflow-y-auto pl-4 text-xs">
										{result.errors.map((e, i) => (
											<li key={i}>{e}</li>
										))}
									</ul>
								</AlertDescription>
							</Alert>
						)}

						<DialogFooter>
							<Button
								variant="outline"
								onClick={() => setResult(null)}
							>
								Import More
							</Button>
							<Button onClick={() => onClose(false)}>Done</Button>
						</DialogFooter>
					</div>
				) : (
					<form
						onSubmit={handleSubmit(onSubmit)}
						className="space-y-4"
					>
						<div className="space-y-2">
							<Label htmlFor="csv">CSV Data</Label>
							<Textarea
								id="csv"
								placeholder={`identifier,year,month,quantity,revenue\nTROI-001,2025,1,24,480.00\nBarcode123,2025,2,18`}
								className="h-52 resize-none font-mono text-xs"
								{...register('csv')}
							/>
							{errors.csv && (
								<p className="text-destructive text-sm">
									{errors.csv.message}
								</p>
							)}
						</div>

						<Alert>
							<AlertCircle className="h-4 w-4" />
							<AlertDescription className="text-xs">
								Existing records for the same product + year +
								month will be overwritten. Header row is
								optional and will be auto-detected.
							</AlertDescription>
						</Alert>

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => onClose(false)}
							>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={importMutation.isPending}
							>
								{importMutation.isPending
									? 'Importing…'
									: 'Import'}
							</Button>
						</DialogFooter>
					</form>
				)}
			</DialogContent>
		</Dialog>
	);
}
