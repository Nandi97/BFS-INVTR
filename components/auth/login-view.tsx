import { Suspense } from 'react';
import { SignInButtons } from '@/components/auth/sign-in-buttons';
import { Package2 } from 'lucide-react';

export function LoginView({ error }: { error?: string }) {
	return (
		<div className="relative flex min-h-dvh flex-col items-center justify-center md:grid lg:max-w-none lg:grid-cols-2 lg:px-0">
			{/* Left panel — hidden below lg */}
			<div className="relative hidden h-full flex-col bg-zinc-900 p-10 text-white lg:flex">
				<div className="absolute inset-0 bg-zinc-900" />

				{/* Logo */}
				<div className="relative z-20 flex items-center gap-2 text-lg font-semibold">
					<div className="flex size-7 items-center justify-center rounded-md bg-white/10">
						<Package2 className="size-4" />
					</div>
					BFS Inventory
				</div>

				{/* Bottom quote */}
				<div className="relative z-20 mt-auto">
					<blockquote className="space-y-2">
						<p className="text-base leading-relaxed text-zinc-200">
							Real-time stock visibility, automated reorder
							alerts, and purchase order tracking — purpose-built
							for the Beauty First warehouse.
						</p>
						<footer className="text-sm text-zinc-400">
							Beauty Logix Inc.
						</footer>
					</blockquote>
				</div>
			</div>

			{/* Right panel */}
			<div className="flex h-full items-center justify-center p-6 lg:p-10">
				<div className="flex w-full max-w-sm flex-col gap-8">
					{/* Mobile logo */}
					<div className="flex items-center gap-2 lg:hidden">
						<div className="bg-foreground text-background flex size-7 items-center justify-center rounded-md">
							<Package2 className="size-4" />
						</div>
						<span className="text-base font-semibold">
							BFS Inventory
						</span>
					</div>

					{/* Heading */}
					<div className="flex flex-col gap-1">
						<h1 className="text-2xl font-semibold tracking-tight">
							Welcome back
						</h1>
						<p className="text-muted-foreground text-sm">
							Sign in to access the inventory dashboard.
						</p>
					</div>

					{/* Unauthorized error */}
					{error === 'unauthorized' && (
						<div className="border-destructive/40 bg-destructive/5 text-destructive rounded-md border px-4 py-3 text-sm">
							Your account is not authorised to access BFS
							Inventory. Contact your administrator.
						</div>
					)}

					{/* OAuth buttons */}
					<Suspense fallback={null}>
						<SignInButtons />
					</Suspense>

					<p className="text-muted-foreground text-center text-xs">
						Access is restricted to authorised Beauty Logix team
						members.
					</p>
				</div>
			</div>
		</div>
	);
}
