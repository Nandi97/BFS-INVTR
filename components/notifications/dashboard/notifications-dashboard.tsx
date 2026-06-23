'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Play, Send, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertRulesList } from './alert-rules-list';
import { EmailLogTable } from './email-log-table';
import { TestEmailDialog } from './test-email-dialog';
import { AlertRuleForm } from '@/components/notifications/create/alert-rule-form';
import { useRunAlerts } from '@/hooks/use-notifications';

export function NotificationsDashboard() {
	const [ruleFormOpen, setRuleFormOpen] = useState(false);
	const [testDialogOpen, setTestDialogOpen] = useState(false);
	const [runResult, setRunResult] = useState<{
		processed: number;
		sent: number;
		skipped: number;
		errors: string[];
	} | null>(null);

	const runAlerts = useRunAlerts();

	async function handleRunNow() {
		try {
			const result = await runAlerts.mutateAsync();
			setRunResult(result);
			if (result.sent > 0) {
				toast.success(
					`Sent ${result.sent} email${result.sent !== 1 ? 's' : ''}`
				);
			} else if (result.errors.length > 0) {
				toast.error(
					`${result.errors.length} rule${result.errors.length !== 1 ? 's' : ''} failed`
				);
			} else {
				toast.info(
					'No alerts triggered — all stock levels are within thresholds'
				);
			}
		} catch {
			toast.error('Failed to run alerts');
		}
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">
						Notifications
					</h1>
					<p className="text-muted-foreground mt-0.5 text-sm">
						Configure email alerts for stock events
					</p>
				</div>
				<div className="flex gap-2">
					<Button
						variant="outline"
						onClick={() => setTestDialogOpen(true)}
					>
						<Send className="mr-2 size-4" />
						Test Email
					</Button>
					<Button
						variant="outline"
						onClick={handleRunNow}
						disabled={runAlerts.isPending}
					>
						<Play className="mr-2 size-4" />
						{runAlerts.isPending ? 'Running…' : 'Run Now'}
					</Button>
					<Button onClick={() => setRuleFormOpen(true)}>
						<Plus className="mr-2 size-4" />
						Add Rule
					</Button>
				</div>
			</div>

			{/* Last run result */}
			{runResult && (
				<div className="space-y-1 rounded-lg border p-4 text-sm">
					<p className="font-medium">Last run result</p>
					<div className="text-muted-foreground mt-1 flex flex-wrap gap-4 text-xs">
						<span>
							Rules processed:{' '}
							<strong className="text-foreground">
								{runResult.processed}
							</strong>
						</span>
						<span className="text-emerald-600 dark:text-emerald-400">
							Emails sent: <strong>{runResult.sent}</strong>
						</span>
						<span>
							Skipped:{' '}
							<strong className="text-foreground">
								{runResult.skipped}
							</strong>
						</span>
					</div>
					{runResult.errors.length > 0 && (
						<div className="mt-2 space-y-1">
							{runResult.errors.map((e, i) => (
								<p
									key={i}
									className="text-destructive flex items-start gap-1 text-xs"
								>
									<XCircle className="mt-0.5 size-3 shrink-0" />
									{e}
								</p>
							))}
						</div>
					)}
				</div>
			)}

			{/* Gmail config hint */}
			<div className="bg-muted/50 text-muted-foreground flex items-start gap-2 rounded-lg border px-4 py-3 text-xs">
				<CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
				<span>
					Emails are sent via Gmail (<strong>GMAIL_USER</strong> in
					your .env). Make sure <strong>GMAIL_APP_PASSWORD</strong> is
					set to a Google App Password (not your regular password).{' '}
					Use "Test Email" to verify the connection before creating
					rules.
				</span>
			</div>

			<Separator />

			{/* Tabs: Rules | Log */}
			<Tabs defaultValue="rules">
				<TabsList>
					<TabsTrigger value="rules">Alert Rules</TabsTrigger>
					<TabsTrigger value="log">Email Log</TabsTrigger>
				</TabsList>

				<TabsContent value="rules" className="mt-4">
					<AlertRulesList onAdd={() => setRuleFormOpen(true)} />
				</TabsContent>

				<TabsContent value="log" className="mt-4">
					<EmailLogTable />
				</TabsContent>
			</Tabs>

			{/* New rule sheet */}
			<AlertRuleForm open={ruleFormOpen} onOpenChange={setRuleFormOpen} />

			{/* Test email dialog */}
			<TestEmailDialog
				open={testDialogOpen}
				onOpenChange={setTestDialogOpen}
			/>
		</div>
	);
}
