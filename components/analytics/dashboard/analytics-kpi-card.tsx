import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AnalyticsKpiCard({
	title,
	value,
	sub,
	icon: Icon,
}: {
	title: string;
	value: string;
	sub: string;
	icon: React.ElementType;
}) {
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between pb-2">
				<CardTitle className="text-muted-foreground text-sm font-medium">
					{title}
				</CardTitle>
				<Icon className="text-muted-foreground h-4 w-4" />
			</CardHeader>
			<CardContent>
				<div className="text-2xl font-semibold tracking-tight">
					{value}
				</div>
				<p className="text-muted-foreground mt-1 text-xs">{sub}</p>
			</CardContent>
		</Card>
	);
}
