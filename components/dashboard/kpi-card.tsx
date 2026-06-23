import { type LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn, formatNumber } from '@/lib/utils';

interface KpiCardProps {
	title: string;
	value: number;
	icon: LucideIcon;
	description?: string;
	variant?: 'default' | 'destructive' | 'warning' | 'success';
}

const variantStyles = {
	default: 'text-foreground',
	destructive: 'text-destructive',
	warning: 'text-amber-600 dark:text-amber-400',
	success: 'text-emerald-600 dark:text-emerald-400',
};

const iconStyles = {
	default: 'text-muted-foreground',
	destructive: 'text-destructive',
	warning: 'text-amber-500',
	success: 'text-emerald-500',
};

export function KpiCard({
	title,
	value,
	icon: Icon,
	description,
	variant = 'default',
}: KpiCardProps) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between pb-2">
				<CardTitle className="text-muted-foreground text-sm font-medium">
					{title}
				</CardTitle>
				<Icon className={cn('size-4', iconStyles[variant])} />
			</CardHeader>
			<CardContent>
				<p
					className={cn(
						'text-2xl font-semibold tabular-nums',
						variantStyles[variant]
					)}
				>
					{formatNumber(value)}
				</p>
				{description && (
					<p className="text-muted-foreground mt-1 text-xs">
						{description}
					</p>
				)}
			</CardContent>
		</Card>
	);
}
