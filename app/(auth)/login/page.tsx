import { Metadata } from 'next';
import { LoginView } from '@/components/auth/login-view';

export const metadata: Metadata = {
	title: 'Sign in — BFS Inventory',
};

export default async function LoginPage({
	searchParams,
}: {
	searchParams: Promise<{ error?: string }>;
}) {
	const { error } = await searchParams;
	return <LoginView error={error} />;
}
