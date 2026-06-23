import { Plus_Jakarta_Sans, Geist_Mono } from 'next/font/google';
import { cn } from '@/lib/utils';

const fontSans = Plus_Jakarta_Sans({
	subsets: ['latin'],
	variable: '--font-sans',
	weight: ['300', '400', '500', '600', '700'],
});

const fontMono = Geist_Mono({
	subsets: ['latin'],
	variable: '--font-mono',
});

export const fontVariables = cn(fontSans.variable, fontMono.variable);
