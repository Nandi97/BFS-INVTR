'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQbConfig, useQbDisconnect } from '@/hooks/use-integrations';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Loader2, ExternalLink } from 'lucide-react';

export function QbOAuthConnect() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { data, isLoading, refetch } = useQbConfig();
	const { mutate: disconnect, isPending: disconnecting } = useQbDisconnect();

	// Handle redirect-back from QBO
	useEffect(() => {
		const connected = searchParams.get('qbo_connected');
		const error = searchParams.get('qbo_error');
		if (connected) {
			toast.success('QuickBooks connected successfully');
			refetch();
			router.replace('/integrations');
		} else if (error) {
			toast.error(`QuickBooks connection failed: ${error}`);
			router.replace('/integrations');
		}
	}, [searchParams, refetch, router]);

	function handleDisconnect() {
		disconnect(undefined, {
			onSuccess: () => toast.success('QuickBooks disconnected'),
			onError: () => toast.error('Failed to disconnect'),
		});
	}

	if (isLoading) {
		return (
			<div className="text-muted-foreground flex items-center gap-2 text-sm">
				<Loader2 className="size-4 animate-spin" />
				Checking connection…
			</div>
		);
	}

	const connected = data?.connected ?? false;
	const realmId = data?.realmId;
	const expiresAt = data?.tokenExpiresAt
		? new Date(data.tokenExpiresAt)
		: null;

	return (
		<div className="space-y-3 rounded-md border p-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					{connected ? (
						<CheckCircle2 className="size-4 text-green-600" />
					) : (
						<XCircle className="text-muted-foreground size-4" />
					)}
					<span className="text-sm font-medium">
						{connected
							? 'Connected to QuickBooks'
							: 'Not connected'}
					</span>
					{process.env.NEXT_PUBLIC_QBO_ENVIRONMENT !==
						'production' && (
						<Badge variant="outline" className="text-xs">
							sandbox
						</Badge>
					)}
				</div>

				{connected ? (
					<Button
						variant="outline"
						size="sm"
						onClick={handleDisconnect}
						disabled={disconnecting}
					>
						{disconnecting ? 'Disconnecting…' : 'Disconnect'}
					</Button>
				) : (
					<Button size="sm" asChild>
						<a href="/api/integrations/quickbooks/connect">
							Connect QuickBooks
							<ExternalLink className="ml-1.5 size-3.5" />
						</a>
					</Button>
				)}
			</div>

			{connected && (
				<div className="text-muted-foreground space-y-0.5 text-xs">
					{realmId && (
						<p>
							Company ID:{' '}
							<span className="font-mono">{realmId}</span>
						</p>
					)}
					{expiresAt && (
						<p>
							Token valid until: {expiresAt.toLocaleDateString()}
						</p>
					)}
				</div>
			)}

			{!connected && (
				<p className="text-muted-foreground text-xs">
					Clicking Connect will open QuickBooks to authorise access.
					You&apos;ll be redirected back here automatically.
				</p>
			)}
		</div>
	);
}
