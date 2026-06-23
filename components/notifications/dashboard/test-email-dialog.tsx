'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from '@/components/ui/dialog';
import { useSendTestEmail } from '@/hooks/use-notifications';

export function TestEmailDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const [testEmail, setTestEmail] = useState('');
	const sendTest = useSendTestEmail();

	async function handleSendTest() {
		if (!testEmail.trim()) return;
		try {
			const result = await sendTest.mutateAsync(testEmail.trim());
			toast.success(result.message);
			onOpenChange(false);
			setTestEmail('');
		} catch (err: unknown) {
			const msg =
				err && typeof err === 'object' && 'response' in err
					? (err as { response?: { data?: { error?: string } } })
							.response?.data?.error
					: undefined;
			toast.error(
				msg ??
					'Failed to send test email. Check your Gmail app password.'
			);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>Send Test Email</DialogTitle>
					<DialogDescription>
						Verify your Gmail SMTP connection by sending a test
						message.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-3 py-2">
					<Input
						type="email"
						placeholder="your@email.com"
						value={testEmail}
						onChange={(e) => setTestEmail(e.target.value)}
						onKeyDown={(e) => e.key === 'Enter' && handleSendTest()}
						autoFocus
					/>
				</div>
				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<Button
						onClick={handleSendTest}
						disabled={sendTest.isPending || !testEmail.trim()}
					>
						{sendTest.isPending ? 'Sending…' : 'Send Test'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
