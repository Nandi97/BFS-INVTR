'use client';

import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings, LogOut, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useSession, signOut } from '@/lib/auth-client';

function getInitials(name?: string | null) {
	if (!name) return '?';
	return name
		.split(' ')
		.map((n) => n[0])
		.slice(0, 2)
		.join('')
		.toUpperCase();
}

export function UserNav() {
	const router = useRouter();
	const { data: session, isPending } = useSession();
	const user = session?.user;

	async function handleSignOut() {
		await signOut({
			fetchOptions: { onSuccess: () => router.push('/login') },
		});
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="relative size-8 rounded-full"
				>
					{isPending ? (
						<Loader2 className="text-muted-foreground size-4 animate-spin" />
					) : (
						<Avatar className="size-8">
							<AvatarImage
								src={user?.image ?? undefined}
								alt={user?.name ?? ''}
							/>
							<AvatarFallback className="bg-primary text-primary-foreground text-xs">
								{getInitials(user?.name)}
							</AvatarFallback>
						</Avatar>
					)}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuLabel className="font-normal">
					<div className="flex flex-col space-y-1">
						<p className="text-sm leading-none font-medium">
							{user?.name ?? '—'}
						</p>
						<p className="text-muted-foreground mt-1 text-xs leading-none">
							{user?.email ?? '—'}
						</p>
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem asChild>
						<Link href="/settings">
							<Settings className="mr-2 size-4" />
							Settings
						</Link>
					</DropdownMenuItem>
				</DropdownMenuGroup>
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
	);
}
