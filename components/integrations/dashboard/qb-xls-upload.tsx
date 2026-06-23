'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
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
import { useUploadThing } from '@/lib/uploadthing';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { FileSpreadsheet, UploadCloud, X, Loader2 } from 'lucide-react';
import axios from 'axios';

interface ImportResult {
	file: string;
	total: number;
	synced: number;
	skipped: number;
	errors: string[];
}

export function QbXlsUpload() {
	const [location, setLocation] = useState('BF Warehouse');
	const [file, setFile] = useState<File | null>(null);
	const [result, setResult] = useState<ImportResult | null>(null);
	const [importing, setImporting] = useState(false);

	const { data: locationList = [] } = useLocations({ active: true });

	const { startUpload, isUploading } = useUploadThing('xlsUploader', {
		onUploadError: (err) => {
			toast.error(`Upload failed: ${err.message}`);
		},
	});

	const onDrop = useCallback((accepted: File[]) => {
		if (accepted[0]) {
			setFile(accepted[0]);
			setResult(null);
		}
	}, []);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: {
			'application/vnd.ms-excel': ['.xls'],
			'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
				['.xlsx'],
		},
		maxFiles: 1,
		multiple: false,
	});

	async function handleImport() {
		if (!file) return;
		setImporting(true);
		setResult(null);

		try {
			// 1. Upload to UploadThing
			const uploaded = await startUpload([file]);
			if (!uploaded?.[0]) throw new Error('Upload returned no file');
			const { ufsUrl, name } = uploaded[0];

			// 2. Trigger the sync with the CDN URL
			const { data } = await axios.post<ImportResult>(
				'/api/integrations/quickbooks/import-xls',
				{ fileUrl: ufsUrl, fileName: name, location }
			);

			setResult(data);
			toast.success(`Synced ${data.synced} of ${data.total} rows`);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : 'Import failed';
			toast.error(msg);
		} finally {
			setImporting(false);
		}
	}

	const busy = isUploading || importing;

	return (
		<div className="space-y-4">
			{/* Dropzone */}
			<div
				{...getRootProps()}
				className={cn(
					'relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 transition-colors',
					isDragActive
						? 'border-primary bg-primary/5'
						: file
							? 'border-green-500/50 bg-green-500/5'
							: 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30'
				)}
			>
				<input {...getInputProps()} />

				{file ? (
					<>
						<FileSpreadsheet className="size-8 text-green-600" />
						<div className="text-center">
							<p className="text-sm font-medium">{file.name}</p>
							<p className="text-muted-foreground mt-0.5 text-xs">
								{(file.size / 1024).toFixed(0)} KB
							</p>
						</div>
						<button
							type="button"
							onClick={(e) => {
								e.stopPropagation();
								setFile(null);
								setResult(null);
							}}
							className="text-muted-foreground hover:text-foreground hover:bg-muted absolute top-2 right-2 rounded-md p-1 transition-colors"
						>
							<X className="size-3.5" />
						</button>
					</>
				) : (
					<>
						<UploadCloud
							className={cn(
								'size-8',
								isDragActive
									? 'text-primary'
									: 'text-muted-foreground'
							)}
						/>
						<div className="text-center">
							<p className="text-sm font-medium">
								{isDragActive
									? 'Drop it here'
									: 'Drop your XLS file here'}
							</p>
							<p className="text-muted-foreground mt-0.5 text-xs">
								or click to browse —{' '}
								<span className="font-mono">.xls</span> /{' '}
								<span className="font-mono">.xlsx</span>, max 16
								MB
							</p>
						</div>
					</>
				)}
			</div>

			{/* Location + action */}
			<div className="flex items-end gap-3">
				<div className="max-w-xs flex-1 space-y-1.5">
					<Label>Target location</Label>
					<Select
						value={location}
						onValueChange={setLocation}
						disabled={busy}
					>
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

				<Button
					onClick={handleImport}
					disabled={busy || !file}
					className="mb-0.5"
				>
					{isUploading ? (
						<>
							<Loader2 className="mr-2 size-4 animate-spin" />
							Uploading…
						</>
					) : importing ? (
						<>
							<Loader2 className="mr-2 size-4 animate-spin" />
							Syncing…
						</>
					) : (
						'Upload & import'
					)}
				</Button>
			</div>

			{/* Result */}
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
