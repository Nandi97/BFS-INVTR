'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function ProductsError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error('[products] page error:', error);
	}, [error]);

	return (
		<div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
			<p className="text-destructive text-sm font-medium">
				Something went wrong on this page
			</p>
			<pre className="text-muted-foreground bg-muted max-w-xl rounded p-3 text-xs break-all whitespace-pre-wrap">
				{error.message}
				{error.digest ? `\n\nDigest: ${error.digest}` : ''}
			</pre>
			<Button variant="outline" size="sm" onClick={reset}>
				Try again
			</Button>
		</div>
	);
}
