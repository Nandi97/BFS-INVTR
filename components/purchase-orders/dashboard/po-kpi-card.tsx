import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function PoKpiCard({
	title,
	value,
	icon: Icon,
	description,
}: {
	title: string;
	value: number;
	icon: React.ElementType;
	description?: string;
}) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between pb-2">
				<CardTitle className="text-muted-foreground text-sm font-medium">
					{title}
				</CardTitle>
				<Icon className="text-muted-foreground size-4" />
			</CardHeader>
			<CardContent>
				<div className="text-2xl font-bold">{value}</div>
				{description && (
					<p className="text-muted-foreground mt-1 text-xs">
						{description}
					</p>
				)}
			</CardContent>
		</Card>
	);
}
