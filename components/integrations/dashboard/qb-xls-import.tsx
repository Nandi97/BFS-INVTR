'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useLocations } from '@/hooks/use-locations';
import {
	useQbXlsFile,
	useQbImportXls,
	type XlsImportResult,
} from '@/hooks/use-integrations';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { FileSpreadsheet, RefreshCw, FolderOpen } from 'lucide-react';

export function QbXlsImport() {
	const [location, setLocation] = useState('BF Warehouse');
	const [result, setResult] = useState<XlsImportResult | null>(null);
	const { data: locationList = [] } = useLocations({ active: true });
	const { data: fileInfo, refetch: recheckFile } = useQbXlsFile();
	const { mutate, isPending } = useQbImportXls();

	function handleImport() {
		setResult(null);
		mutate(location, {
			onSuccess: (data) => {
				setResult(data);
				toast.success(
					`Synced ${data.synced} of ${data.total} rows from ${data.file}`
				);
			},
			onError: (err: unknown) => {
				const msg =
					err instanceof Error ? err.message : 'Import failed';
				toast.error(msg);
			},
		});
	}

	const hasFile = !!fileInfo?.file;

	return (
		<div className="space-y-5">
			{/* Drop folder info */}
			<div className="bg-muted/30 space-y-2 rounded-md border p-4">
				<div className="flex items-center gap-2 text-sm font-medium">
					<FolderOpen className="text-muted-foreground size-4" />
					Drop folder
				</div>
				<p className="text-muted-foreground font-mono text-xs break-all">
					{fileInfo?.dir ?? '…/qb-imports/'}
				</p>
				<p className="text-muted-foreground text-xs">
					Drop any{' '}
					<span className="font-mono">ProductServiceList__*.xls</span>{' '}
					file exported from QuickBooks into this folder. The most
					recent file will be used on each import.
				</p>
			</div>

			{/* File status */}
			<div className="flex items-center gap-3">
				<div
					className={cn(
						'flex flex-1 items-center gap-2 rounded-md border px-3 py-2 text-sm',
						hasFile
							? 'border-green-500/40 bg-green-500/5'
							: 'border-muted bg-muted/20'
					)}
				>
					<FileSpreadsheet
						className={cn(
							'size-4',
							hasFile ? 'text-green-600' : 'text-muted-foreground'
						)}
					/>
					{hasFile ? (
						<span className="font-mono text-xs">
							{fileInfo.file}
						</span>
					) : (
						<span className="text-muted-foreground text-xs">
							No ProductServiceList file found in folder
						</span>
					)}
				</div>
				<Button
					variant="ghost"
					size="icon"
					onClick={() => recheckFile()}
					title="Re-scan folder"
				>
					<RefreshCw className="size-4" />
				</Button>
			</div>

			{/* Location picker */}
			<div className="max-w-xs space-y-1.5">
				<Label>Target location</Label>
				<Select value={location} onValueChange={setLocation}>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{locationList.length > 0 ? (
							locationList.map((l) => (
								<SelectItem key={l.id} value={l.name}>
									{l.name}
								</SelectItem>
							))
						) : (
							<SelectItem value="BF Warehouse">
								BF Warehouse
							</SelectItem>
						)}
					</SelectContent>
				</Select>
			</div>

			<Button onClick={handleImport} disabled={isPending || !hasFile}>
				{isPending ? 'Importing…' : 'Import stock from file'}
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
					<p className="text-muted-foreground font-mono text-xs">
						{result.file}
					</p>
					<p>
						<span className="font-medium">{result.synced}</span>{' '}
						synced,{' '}
						<span className="font-medium">{result.skipped}</span>{' '}
						skipped of{' '}
						<span className="font-medium">{result.total}</span>{' '}
						inventory rows
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
