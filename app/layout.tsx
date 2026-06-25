import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { fontVariables } from '@/lib/font';
import NextTopLoader from 'nextjs-toploader';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
	title: 'BFS Inventory',
	description: 'Beauty First / Beauty Logix inventory management',
};

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				suppressHydrationWarning
				className={cn(
					'bg-background overscroll-none font-sans antialiased',
					fontVariables
				)}
			>
				<NextTopLoader color="var(--primary)" showSpinner={false} />
				<NuqsAdapter>
					<Providers>{children}</Providers>
				</NuqsAdapter>
			</body>
		</html>
	);
}
