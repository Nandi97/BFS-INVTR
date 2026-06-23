'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { signIn } from '@/lib/auth-client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

function GitHubIcon() {
	return (
		<svg
			viewBox="0 0 24 24"
			className="mr-2 size-4"
			fill="currentColor"
			aria-hidden="true"
		>
			<path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
		</svg>
	);
}

function GoogleIcon() {
	return (
		<svg viewBox="0 0 24 24" className="mr-2 size-4" aria-hidden="true">
			<path
				fill="#4285F4"
				d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
			/>
			<path
				fill="#34A853"
				d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z"
			/>
			<path
				fill="#FBBC05"
				d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 0 0 0 10.76l3.98-3.09z"
			/>
			<path
				fill="#EA4335"
				d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.69 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
			/>
		</svg>
	);
}

export function SignInButtons() {
	const searchParams = useSearchParams();
	const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard';
	const [loading, setLoading] = useState<'github' | 'google' | null>(null);

	async function handleSignIn(provider: 'github' | 'google') {
		setLoading(provider);
		try {
			await signIn.social({ provider, callbackURL: callbackUrl });
		} catch {
			toast.error('Sign in failed. Please try again.');
			setLoading(null);
		}
	}

	return (
		<div className="flex w-full flex-col gap-3">
			<Button
				variant="outline"
				className="h-11 w-full cursor-pointer"
				onClick={() => handleSignIn('github')}
				disabled={!!loading}
			>
				{loading === 'github' ? (
					<Loader2 className="mr-2 size-4 animate-spin" />
				) : (
					<GitHubIcon />
				)}
				Continue with GitHub
			</Button>

			<Button
				variant="outline"
				className="h-11 w-full cursor-pointer"
				onClick={() => handleSignIn('google')}
				disabled={!!loading}
			>
				{loading === 'google' ? (
					<Loader2 className="mr-2 size-4 animate-spin" />
				) : (
					<GoogleIcon />
				)}
				Continue with Google
			</Button>
		</div>
	);
}
