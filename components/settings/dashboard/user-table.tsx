'use client';

import { toast } from 'sonner';
import { Shield, UserCog, Eye } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { useUsers, useUpdateUserRole, type AppUser } from '@/hooks/use-users';
import { useSession } from '@/lib/auth-client';
import { Skeleton } from '@/components/ui/skeleton';

const ROLE_META: Record<
	AppUser['role'],
	{ label: string; icon: React.ElementType; class: string }
> = {
	ADMIN: {
		label: 'Admin',
		icon: Shield,
		class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
	},
	MANAGER: {
		label: 'Manager',
		icon: UserCog,
		class: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
	},
	VIEWER: {
		label: 'Viewer',
		icon: Eye,
		class: 'bg-secondary text-secondary-foreground',
	},
};

function initials(name: string) {
	return name
		.split(' ')
		.map((n) => n[0])
		.join('')
		.toUpperCase()
		.slice(0, 2);
}

function timeAgo(iso: string | null) {
	if (!iso) return 'Never';
	const diff = Date.now() - new Date(iso).getTime();
	const mins = Math.floor(diff / 60_000);
	const hours = Math.floor(diff / 3_600_000);
	const days = Math.floor(diff / 86_400_000);
	if (mins < 1) return 'Just now';
	if (mins < 60) return `${mins}m ago`;
	if (hours < 24) return `${hours}h ago`;
	if (days < 30) return `${days}d ago`;
	return new Date(iso).toLocaleDateString();
}

export function UserTable() {
	const { data: users, isLoading } = useUsers();
	const { mutate: updateRole, isPending } = useUpdateUserRole();
	const { data: session } = useSession();
	const currentUserId = session?.user?.id;

	if (isLoading) {
		return (
			<div className="space-y-2">
				{[1, 2, 3].map((i) => (
					<Skeleton key={i} className="h-14 w-full rounded-md" />
				))}
			</div>
		);
	}

	if (!users?.length) {
		return (
			<p className="text-muted-foreground py-8 text-center text-sm">
				No users found.
			</p>
		);
	}

	function handleRoleChange(userId: string, role: AppUser['role']) {
		updateRole(
			{ id: userId, role },
			{
				onSuccess: (u) =>
					toast.success(`${u.name}'s role updated to ${role}`),
				onError: (e: unknown) =>
					toast.error(
						e instanceof Error ? e.message : 'Failed to update role'
					),
			}
		);
	}

	return (
		<div className="overflow-x-auto rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>User</TableHead>
						<TableHead>Role</TableHead>
						<TableHead>Last seen</TableHead>
						<TableHead>Member since</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{users.map((user) => {
						const meta = ROLE_META[user.role];
						const isSelf = user.id === currentUserId;

						return (
							<TableRow key={user.id}>
								<TableCell>
									<div className="flex items-center gap-3">
										<Avatar className="size-8">
											<AvatarImage
												src={user.image ?? undefined}
											/>
											<AvatarFallback className="text-xs">
												{initials(user.name)}
											</AvatarFallback>
										</Avatar>
										<div>
											<p className="text-sm leading-none font-medium">
												{user.name}
												{isSelf && (
													<span className="text-muted-foreground ml-2 text-xs">
														(you)
													</span>
												)}
											</p>
											<p className="text-muted-foreground mt-0.5 text-xs">
												{user.email}
											</p>
										</div>
									</div>
								</TableCell>

								<TableCell>
									{isSelf ? (
										<Badge
											className={`gap-1 text-xs ${meta.class}`}
										>
											<meta.icon className="size-3" />
											{meta.label}
										</Badge>
									) : (
										<Select
											value={user.role}
											onValueChange={(v) =>
												handleRoleChange(
													user.id,
													v as AppUser['role']
												)
											}
											disabled={isPending}
										>
											<SelectTrigger className="h-7 w-32 text-xs">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="ADMIN">
													<span className="flex items-center gap-1.5">
														<Shield className="size-3 text-red-500" />{' '}
														Admin
													</span>
												</SelectItem>
												<SelectItem value="MANAGER">
													<span className="flex items-center gap-1.5">
														<UserCog className="size-3 text-blue-500" />{' '}
														Manager
													</span>
												</SelectItem>
												<SelectItem value="VIEWER">
													<span className="flex items-center gap-1.5">
														<Eye className="text-muted-foreground size-3" />{' '}
														Viewer
													</span>
												</SelectItem>
											</SelectContent>
										</Select>
									)}
								</TableCell>

								<TableCell className="text-muted-foreground text-xs">
									{timeAgo(user.lastSeenAt)}
								</TableCell>

								<TableCell className="text-muted-foreground text-xs">
									{new Date(
										user.createdAt
									).toLocaleDateString()}
								</TableCell>
							</TableRow>
						);
					})}
				</TableBody>
			</Table>
		</div>
	);
}
