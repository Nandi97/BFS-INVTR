'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
	LayoutDashboard,
	Package,
	Layers,
	RefreshCcw,
	Truck,
	ShoppingCart,
	Bell,
	BarChart2,
	FileDown,
	Settings,
	Plug,
	ChevronRight,
	LogOut,
	ArrowLeftRight,
	MapPin,
	ClipboardList,
	Store,
	ShoppingBag,
} from 'lucide-react';
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarRail,
} from '@/components/ui/sidebar';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronsUpDown } from 'lucide-react';
import { useSession, signOut } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';

type NavItem = {
	title: string;
	href: string;
	icon: React.ElementType;
	items?: { title: string; href: string }[];
};

const navInventory: NavItem[] = [
	{ title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
	{
		title: 'Products',
		href: '/products',
		icon: Package,
		items: [
			{ title: 'All Products', href: '/products' },
			{ title: 'Pending from QB', href: '/products/pending' },
		],
	},
	{
		title: 'Stock & Locations',
		href: '/stock',
		icon: Layers,
		items: [
			{ title: 'Stock Overview', href: '/stock' },
			{ title: 'Movements Log', href: '/stock/movements' },
			{ title: 'Internal Use', href: '/stock/internal-use' },
			{ title: 'Locations', href: '/stock/locations' },
		],
	},
	{
		title: 'Reorder',
		href: '/reorder',
		icon: RefreshCcw,
		items: [
			{ title: 'Reorder List', href: '/reorder' },
			{ title: 'Formula Reference', href: '/reorder/formula' },
		],
	},
];

const navOperations: NavItem[] = [
	{ title: 'Zenoti Fulfillment', href: '/zenoti', icon: Store },
	{ title: 'Shopify Orders', href: '/shopify', icon: ShoppingBag },
	{ title: 'Suppliers', href: '/suppliers', icon: Truck },
	{ title: 'Purchase Orders', href: '/purchase-orders', icon: ShoppingCart },
	{ title: 'Notifications', href: '/notifications', icon: Bell },
];

const navInsights: NavItem[] = [
	{ title: 'Analytics', href: '/analytics', icon: BarChart2 },
	{ title: 'Reports', href: '/reports', icon: ClipboardList },
	{ title: 'Import / Export', href: '/import-export', icon: FileDown },
];

const navAdmin: NavItem[] = [
	{ title: 'Integrations', href: '/integrations', icon: Plug },
	{ title: 'Settings', href: '/settings', icon: Settings },
];

function NavGroup({ label, items }: { label: string; items: NavItem[] }) {
	const pathname = usePathname();
	return (
		<SidebarGroup>
			<SidebarGroupLabel>{label}</SidebarGroupLabel>
			<SidebarMenu>
				{items.map((item) =>
					item.items?.length ? (
						<Collapsible
							key={item.title}
							asChild
							defaultOpen={pathname.startsWith(item.href)}
							className="group/collapsible"
						>
							<SidebarMenuItem>
								<CollapsibleTrigger asChild>
									<SidebarMenuButton
										tooltip={item.title}
										isActive={pathname.startsWith(
											item.href
										)}
									>
										<item.icon className="size-4" />
										<span>{item.title}</span>
										<ChevronRight className="ml-auto size-3.5 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
									</SidebarMenuButton>
								</CollapsibleTrigger>
								<CollapsibleContent>
									<SidebarMenuSub>
										{item.items.map((sub) => (
											<SidebarMenuSubItem key={sub.title}>
												<SidebarMenuSubButton
													asChild
													isActive={
														pathname === sub.href
													}
												>
													<Link href={sub.href}>
														{sub.title}
													</Link>
												</SidebarMenuSubButton>
											</SidebarMenuSubItem>
										))}
									</SidebarMenuSub>
								</CollapsibleContent>
							</SidebarMenuItem>
						</Collapsible>
					) : (
						<SidebarMenuItem key={item.title}>
							<SidebarMenuButton
								asChild
								tooltip={item.title}
								isActive={pathname === item.href}
							>
								<Link href={item.href}>
									<item.icon className="size-4" />
									<span>{item.title}</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
					)
				)}
			</SidebarMenu>
		</SidebarGroup>
	);
}

function getInitials(name?: string | null) {
	if (!name) return '?';
	return name
		.split(' ')
		.map((n) => n[0])
		.slice(0, 2)
		.join('')
		.toUpperCase();
}

export function AppSidebar() {
	const router = useRouter();
	const { data: session } = useSession();
	const user = session?.user;

	async function handleSignOut() {
		await signOut({
			fetchOptions: { onSuccess: () => router.push('/login') },
		});
	}

	return (
		<Sidebar collapsible="icon">
			{/* Brand */}
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" asChild>
							<Link href="/dashboard">
								<div className="bg-primary text-primary-foreground flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold">
									BF
								</div>
								<div className="flex min-w-0 flex-col gap-0.5 leading-none">
									<span className="truncate text-sm font-semibold">
										BFS Inventory
									</span>
									<span className="text-muted-foreground truncate text-[11px]">
										Beauty First / Logix
									</span>
								</div>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>

			{/* Nav */}
			<SidebarContent className="overflow-x-hidden">
				<NavGroup label="Inventory" items={navInventory} />
				<NavGroup label="Operations" items={navOperations} />
				<NavGroup label="Insights" items={navInsights} />
				<NavGroup label="System" items={navAdmin} />
			</SidebarContent>

			{/* User footer */}
			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<SidebarMenuButton
									size="lg"
									className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
								>
									<Avatar className="size-7 rounded-lg">
										<AvatarImage
											src={user?.image ?? undefined}
											alt={user?.name ?? ''}
											className="rounded-lg"
										/>
										<AvatarFallback className="bg-primary text-primary-foreground rounded-lg text-xs">
											{getInitials(user?.name)}
										</AvatarFallback>
									</Avatar>
									<div className="flex min-w-0 flex-col gap-0.5 text-left text-sm leading-tight">
										<span className="truncate font-medium">
											{user?.name ?? '—'}
										</span>
										<span className="text-muted-foreground truncate text-xs">
											{user?.email ?? '—'}
										</span>
									</div>
									<ChevronsUpDown className="ml-auto size-4 shrink-0" />
								</SidebarMenuButton>
							</DropdownMenuTrigger>
							<DropdownMenuContent
								side="top"
								align="end"
								className="w-56 rounded-lg"
							>
								<DropdownMenuItem asChild>
									<Link href="/settings">
										<Settings className="mr-2 size-4" />
										Settings
									</Link>
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem
									className="text-destructive focus:text-destructive cursor-pointer"
									onClick={handleSignOut}
								>
									<LogOut className="mr-2 size-4" />
									Sign out
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>

			<SidebarRail />
		</Sidebar>
	);
}
