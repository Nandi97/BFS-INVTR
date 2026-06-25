'use client';

import { useRef, useState } from 'react';
import {
	Upload,
	FolderOpen,
	CheckCircle2,
	AlertTriangle,
	Info,
	FileSpreadsheet,
	Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useImportZenotiExcel, useScanZenotiUploads } from '@/hooks/use-zenoti';

interface ImportResult {
	ok?: boolean;
	// per-order detail response
	action?: 'created' | 'updated' | 'skipped';
	orderNumber?: string;
	supplier?: string;
	centerName?: string;
	status?: string;
	itemCount?: number;
	matchedProducts?: number;
	unmatchedCodes?: string[];
	// scan-uploads aggregate response
	files?: string[];
	results?: Record<string, ImportResult>;
	// scan-uploads debug info (returned when 0 files found)
	dir?: string;
	allFiles?: string[];
	// error
	error?: string;
}

interface OrgConfig {
	id: 'bfs' | 'bl';
	label: string;
	domain: string;
	colour: string;
	badgeClass: string;
	localDir: string;
}

const ORGS: OrgConfig[] = [
	{
		id: 'bfs',
		label: 'Beauty First Spa',
		domain: 'beautyfirstspa.zenoti.com',
		colour: 'bg-pink-50 border-pink-200 dark:bg-pink-950/20 dark:border-pink-900',
		badgeClass:
			'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
		localDir: 'uploads/zenoti/bfs/',
	},
	{
		id: 'bl',
		label: 'Beauty Logix',
		domain: 'beautylogix.zenoti.com',
		colour: 'bg-violet-50 border-violet-200 dark:bg-violet-950/20 dark:border-violet-900',
		badgeClass:
			'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
		localDir: 'uploads/zenoti/bl/',
	},
];

const ACTION_CONFIG = {
	created: {
		label: 'Imported',
		cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400',
	},
	updated: {
		label: 'Updated',
		cls: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
	},
	skipped: {
		label: 'No change',
		cls: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
	},
};

function SingleResult({ result }: { result: ImportResult }) {
	if (result.error) {
		return (
			<div className="flex items-start gap-2 text-sm text-red-700 dark:text-red-400">
				<AlertTriangle className="mt-0.5 size-4 shrink-0" />
				<span>{result.error}</span>
			</div>
		);
	}

	const cfg = result.action ? ACTION_CONFIG[result.action] : null;
	return (
		<div className="space-y-1.5 text-sm">
			<div className="flex flex-wrap items-center gap-2">
				{cfg && (
					<span
						className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.cls}`}
					>
						{result.action === 'created' && (
							<CheckCircle2 className="size-3" />
						)}
						{cfg.label}
					</span>
				)}
				{result.supplier && (
					<span className="text-muted-foreground text-xs">
						From: <strong>{result.supplier}</strong>
					</span>
				)}
				{result.centerName && (
					<span className="text-muted-foreground text-xs">
						→ {result.centerName}
					</span>
				)}
			</div>
			{result.itemCount != null && (
				<p className="text-muted-foreground text-xs">
					{result.itemCount} line item
					{result.itemCount !== 1 ? 's' : ''} —{' '}
					{result.matchedProducts ?? 0} matched to BFS products
					{(result.unmatchedCodes?.length ?? 0) > 0 && (
						<>
							,{' '}
							<span className="text-amber-600 dark:text-amber-400">
								{result.unmatchedCodes!.length} unmatched codes
							</span>
						</>
					)}
				</p>
			)}
			{(result.unmatchedCodes?.length ?? 0) > 0 && (
				<details>
					<summary className="cursor-pointer text-xs text-amber-600 dark:text-amber-400">
						Unmatched product codes
					</summary>
					<p className="mt-1 pl-3 font-mono text-xs break-all text-gray-500">
						{result.unmatchedCodes!.join(', ')}
					</p>
				</details>
			)}
		</div>
	);
}

function ResultDisplay({ result }: { result: ImportResult }) {
	if (result.error) {
		return (
			<div className="mt-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
				<AlertTriangle className="mt-0.5 size-4 shrink-0" />
				<span>{result.error}</span>
			</div>
		);
	}

	// Scan-uploads returns a results map keyed by filename
	if (result.results) {
		const entries = Object.entries(result.results);
		return (
			<div className="mt-3 space-y-3">
				{entries.map(([filename, r]) => (
					<div key={filename} className="rounded-md border p-2">
						<p className="mb-1 truncate text-xs font-medium text-gray-600 dark:text-gray-400">
							{filename}
						</p>
						<SingleResult result={r} />
					</div>
				))}
			</div>
		);
	}

	return (
		<div className="mt-3 rounded-md border p-3">
			<SingleResult result={result} />
		</div>
	);
}

function OrgUploadCard({ org }: { org: OrgConfig }) {
	const fileRef = useRef<HTMLInputElement>(null);
	const [dragging, setDragging] = useState(false);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [result, setResult] = useState<ImportResult | null>(null);

	const importMutation = useImportZenotiExcel();
	const scanMutation = useScanZenotiUploads();

	function handleFiles(files: FileList | null) {
		if (!files?.length) return;
		const file = files[0];
		if (!/\.(xlsx|xls)$/i.test(file.name)) {
			toast.error('Please select an .xlsx or .xls file');
			return;
		}
		setSelectedFile(file);
		setResult(null);
	}

	async function handleImport() {
		if (!selectedFile) return;
		const fd = new FormData();
		fd.append('file', selectedFile);
		fd.append('org', org.id);
		try {
			const res: ImportResult = await importMutation.mutateAsync(fd);
			setResult(res);
			if (res.action === 'created') {
				toast.success(
					`Order #${res.orderNumber} imported — ${res.itemCount} items from ${res.centerName}`
				);
			} else if (res.action === 'updated') {
				toast.success(`Order #${res.orderNumber} status updated`);
			} else {
				toast.info(`Order #${res.orderNumber} already up to date`);
			}
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : 'Import failed';
			setResult({ error: msg });
			toast.error(msg);
		}
	}

	async function handleScan() {
		try {
			const res = await scanMutation.mutateAsync(org.id);
			const fileCount = res.files?.length ?? 0;
			if (fileCount === 0) {
				// Show the actual path the server checked so we can debug
				const detail = res.dir ? ` (checked: ${res.dir})` : '';
				const found = res.allFiles?.length
					? `, found: ${res.allFiles.join(', ')}`
					: '';
				toast.info(`No Excel files found${detail}${found}`);
			} else {
				const created = Object.values(res.results ?? {}).filter(
					(r) => (r as ImportResult).action === 'created'
				).length;
				toast.success(
					`Scanned ${fileCount} file(s) — ${created} new orders imported`
				);
			}
			setResult(res as ImportResult);
		} catch (err) {
			toast.error(
				err instanceof Error
					? err.message
					: 'Scan failed — make sure the dev server can read the uploads folder'
			);
		}
	}

	const isLoading = importMutation.isPending || scanMutation.isPending;

	return (
		<Card className={cn('border-2 transition-colors', org.colour)}>
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between gap-2">
					<div>
						<CardTitle className="text-base">{org.label}</CardTitle>
						<p className="text-muted-foreground mt-0.5 font-mono text-xs">
							{org.domain}
						</p>
					</div>
					<span
						className={cn(
							'rounded-full px-2.5 py-0.5 text-xs font-semibold',
							org.badgeClass
						)}
					>
						{org.id.toUpperCase()}
					</span>
				</div>
			</CardHeader>

			<CardContent className="space-y-4">
				{/* Drop zone */}
				<div
					className={cn(
						'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors',
						dragging
							? 'border-primary bg-primary/5'
							: 'border-muted-foreground/20 hover:border-muted-foreground/40',
						selectedFile &&
							'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20'
					)}
					onClick={() => fileRef.current?.click()}
					onDragOver={(e) => {
						e.preventDefault();
						setDragging(true);
					}}
					onDragLeave={() => setDragging(false)}
					onDrop={(e) => {
						e.preventDefault();
						setDragging(false);
						handleFiles(e.dataTransfer.files);
					}}
				>
					{selectedFile ? (
						<>
							<FileSpreadsheet className="size-8 text-emerald-600 dark:text-emerald-400" />
							<p className="max-w-[180px] truncate text-sm font-medium">
								{selectedFile.name}
							</p>
							<p className="text-muted-foreground text-xs">
								{(selectedFile.size / 1024).toFixed(0)} KB —
								click to replace
							</p>
						</>
					) : (
						<>
							<Upload className="text-muted-foreground size-8" />
							<div>
								<p className="text-sm font-medium">
									Drop Excel file here
								</p>
								<p className="text-muted-foreground text-xs">
									or click to browse (.xlsx, .xls)
								</p>
							</div>
						</>
					)}
					<input
						ref={fileRef}
						type="file"
						accept=".xlsx,.xls"
						className="hidden"
						onChange={(e) => handleFiles(e.target.files)}
					/>
				</div>

				{/* Actions */}
				<div className="flex flex-col gap-2">
					<Button
						onClick={handleImport}
						disabled={!selectedFile || isLoading}
						className="w-full gap-2"
					>
						{importMutation.isPending ? (
							<Loader2 className="size-4 animate-spin" />
						) : (
							<Upload className="size-4" />
						)}
						Import Selected File
					</Button>

					<Button
						variant="outline"
						onClick={handleScan}
						disabled={isLoading}
						className="w-full gap-2 text-xs"
						title={`Scans uploads/zenoti/${org.id}/ — local dev only`}
					>
						{scanMutation.isPending ? (
							<Loader2 className="size-4 animate-spin" />
						) : (
							<FolderOpen className="size-4" />
						)}
						Scan Local Folder
					</Button>
				</div>

				{/* Result */}
				{result && <ResultDisplay result={result} />}

				{/* Local dir hint */}
				<div className="flex items-start gap-1.5 rounded-md bg-white/60 p-2 dark:bg-black/20">
					<Info className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
					<p className="text-muted-foreground text-xs">
						Drop files into{' '}
						<code className="rounded bg-gray-100 px-1 dark:bg-gray-800">
							{org.localDir}
						</code>{' '}
						then use &ldquo;Scan Local Folder&rdquo; to process all
						at once.
					</p>
				</div>
			</CardContent>
		</Card>
	);
}

export function ZenotiImportPanel() {
	return (
		<div className="space-y-6">
			{/* Instructions */}
			<div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20">
				<AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
				<div className="space-y-1 text-sm">
					<p className="font-medium text-amber-800 dark:text-amber-300">
						Temporary workflow — Zenoti API keys pending
					</p>
					<p className="text-amber-700 dark:text-amber-400">
						Open each order in Zenoti and click the{' '}
						<strong>Export</strong> icon to download the order
						detail as <code>.xlsx</code>. Upload those files here —
						all line items (product code, retail qty, consumable
						qty, price) are imported automatically.
					</p>
					<p className="text-amber-700 dark:text-amber-400">
						All order types are imported.{' '}
						<strong>Beauty Logix Inc</strong> orders go to warehouse
						packing; Costco and Inverness orders are imported for
						visibility only (accounting handles those separately).
					</p>
				</div>
			</div>

			{/* How to export from Zenoti */}
			<div className="rounded-lg border p-4">
				<p className="mb-3 text-sm font-medium">
					How to download from Zenoti
				</p>
				<ol className="text-muted-foreground space-y-1 pl-4 text-xs [counter-reset:steps] [&>li]:list-none [&>li]:[counter-increment:steps] [&>li]:before:mr-2 [&>li]:before:font-semibold [&>li]:before:content-[counter(steps)'.']">
					<li>
						Log into Zenoti (beautyfirstspa.zenoti.com or
						beautylogix.zenoti.com)
					</li>
					<li>
						Go to <strong>Inventory → Manage Procurement</strong>
					</li>
					<li>Select a center from the top-right center picker</li>
					<li>
						Find orders with status <strong>Raised</strong> — click
						a <strong>REF #</strong> to open the order detail
					</li>
					<li>
						On the order detail page, click the{' '}
						<strong>Export</strong> icon to download as{' '}
						<code>.xlsx</code>
					</li>
					<li>
						Repeat for each order, then upload all files below under
						the matching organization
					</li>
				</ol>
			</div>

			{/* Two org upload cards */}
			<div className="grid gap-6 md:grid-cols-2">
				{ORGS.map((org) => (
					<OrgUploadCard key={org.id} org={org} />
				))}
			</div>

			{/* Format notice */}
			<div className="text-muted-foreground flex items-start gap-1.5 text-xs">
				<Info className="mt-0.5 size-3.5 shrink-0" />
				<p>
					Each file is one order. The importer reads the Zenoti{' '}
					<em>Order Details</em> export format and maps product codes
					(barcodes) to BFS products automatically. Unmatched codes
					are reported in the result.
				</p>
			</div>
		</div>
	);
}
