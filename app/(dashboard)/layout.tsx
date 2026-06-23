import { cookies } from 'next/headers';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { AppHeader } from '@/components/app-header';

export default async function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const cookieStore = await cookies();
	const sidebarOpen = cookieStore.get('sidebar:state')?.value !== 'false';

	return (
		<SidebarProvider defaultOpen={sidebarOpen}>
			<AppSidebar />
			<SidebarInset>
				<AppHeader />
				<div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
					{children}
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
