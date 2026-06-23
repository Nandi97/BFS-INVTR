import type { Metadata } from 'next';

export const metadata: Metadata = {
	title: 'Terms of Use — BFS Inventory',
};

export default function TermsPage() {
	return (
		<main className="mx-auto max-w-3xl px-6 py-16 text-sm leading-relaxed">
			<h1 className="mb-2 text-2xl font-semibold">
				End-User License Agreement
			</h1>
			<p className="text-muted-foreground mb-8">
				Last updated: June 2026
			</p>

			<section className="space-y-6">
				<div>
					<h2 className="mb-1 font-semibold">1. Acceptance</h2>
					<p>
						By accessing BFS Inventory you agree to these terms.
						Access is granted solely to authorized employees and
						contractors of Beauty Logix Inc. Unauthorized use is
						prohibited.
					</p>
				</div>

				<div>
					<h2 className="mb-1 font-semibold">2. License Grant</h2>
					<p>
						Beauty Logix Inc. grants you a non-exclusive,
						non-transferable, revocable license to use this
						application strictly for internal warehouse and
						inventory management purposes.
					</p>
				</div>

				<div>
					<h2 className="mb-1 font-semibold">3. Restrictions</h2>
					<ul className="mt-2 list-disc space-y-1 pl-5">
						<li>
							Do not share your login credentials with
							unauthorized parties
						</li>
						<li>
							Do not use the application to access data belonging
							to other companies
						</li>
						<li>
							Do not reverse-engineer, copy, or redistribute the
							application
						</li>
					</ul>
				</div>

				<div>
					<h2 className="mb-1 font-semibold">
						4. QuickBooks Integration
					</h2>
					<p>
						This application integrates with Intuit QuickBooks
						Online to read inventory and sales data. Use of this
						integration is subject to Intuit&apos;s Terms of
						Service. You are responsible for maintaining valid
						QuickBooks credentials and permissions.
					</p>
				</div>

				<div>
					<h2 className="mb-1 font-semibold">5. Data Accuracy</h2>
					<p>
						Inventory data is sourced from QuickBooks and manual
						entries. Beauty Logix Inc. makes no warranty regarding
						the accuracy or completeness of the data displayed.
						Always verify critical decisions against primary
						records.
					</p>
				</div>

				<div>
					<h2 className="mb-1 font-semibold">6. Termination</h2>
					<p>
						Access may be revoked at any time by an administrator.
						Upon termination you must cease all use of the
						application.
					</p>
				</div>

				<div>
					<h2 className="mb-1 font-semibold">
						7. Limitation of Liability
					</h2>
					<p>
						This software is provided &quot;as is&quot; for internal
						operational use. Beauty Logix Inc. is not liable for any
						business decisions made based on data displayed in this
						application.
					</p>
				</div>

				<div>
					<h2 className="mb-1 font-semibold">8. Contact</h2>
					<p>
						Questions:{' '}
						<a
							href="mailto:order@beautylogix.ca"
							className="underline"
						>
							order@beautylogix.ca
						</a>
					</p>
				</div>
			</section>
		</main>
	);
}
