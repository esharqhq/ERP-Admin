"use client"

import {usePathname} from "next/navigation"
import {SidebarTrigger} from "@/components/ui/sidebar"
import {Separator} from "@/components/ui/separator"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {Button} from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {Skeleton} from "@/components/ui/skeleton"
import {navItems} from "@/lib/nav-items"
import {Bell} from "lucide-react"
import {LanguageSwitcher} from "./language-switcher";
import {useTranslations} from "next-intl";
import {useRouter} from "@/i18n/navigation";
import {
    useNotificationList,
    useUnreadCount,
    useMarkRead,
    useMarkAllRead,
} from "@/hooks/use-notifications";
import type {NotificationEntityType} from "@/lib/types/notification.types";

function relativeTime(createdAt: string): string {
    const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

function entityRoute(entityType: NotificationEntityType | null, entityId: string | null): string | null {
    if (!entityType || !entityId) return null;
    if (entityType === "Worker") return `/dashboard/workers/${entityId}`;
    if (entityType === "OwnerProfile") return `/dashboard/kyc`;
    if (entityType === "Property") return `/dashboard/properties/${entityId}`;
    return null;
}

export function DashboardHeader() {
    const pathname = usePathname()
    const t = useTranslations()
    const router = useRouter()

    const {data: infiniteData, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage} = useNotificationList();
    const {data: unreadCount = 0} = useUnreadCount();
    const markRead = useMarkRead();
    const markAllRead = useMarkAllRead();

    const notifications = infiniteData?.pages.flat() ?? [];

    const current = navItems.find(
        (item) =>
            pathname === item.url ||
            (item.url !== "/dashboard" && pathname.startsWith(item.url))
    ) ?? navItems[0]

    return (
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1"/>
            <Separator orientation="vertical" className="mr-2 h-4"/>
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                        <BreadcrumbLink href="/dashboard">ERP Admin</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block"/>
                    <BreadcrumbItem>
                        <BreadcrumbPage>{t(current.labelKey)}</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>

            <div className="ml-auto flex items-center gap-2">
                <LanguageSwitcher/>
                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={
                            <Button
                                variant="ghost"
                                size="icon-lg"
                                className="relative text-foreground bg-secondary"
                            />
                        }
                    >
                        <Bell className="size-6 text-primary"/>
                        {unreadCount > 0 && (
                            <span
                                className="absolute -right-1 top-5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground ring-2 ring-background">
                                {unreadCount}
                            </span>
                        )}
                        <span className="sr-only">Notifications</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" sideOffset={8} className="w-80 p-0">
                        <DropdownMenuLabel className="flex items-center justify-between px-3 py-2.5">
                            <span className="text-sm font-semibold">{t('layout.notifications.title')}</span>
                            {unreadCount > 0 && (
                                <span className="text-[11px] text-muted-foreground">
                                    {t('layout.notifications.newCount', {count: unreadCount})}
                                </span>
                            )}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="my-0"/>
                        <div className="max-h-96 overflow-y-auto">
                            {isLoading ? (
                                Array.from({length: 3}).map((_, i) => (
                                    <div key={i} className="flex items-start gap-2.5 px-3 py-2.5">
                                        <Skeleton className="mt-1.5 size-2 shrink-0 rounded-full"/>
                                        <div className="flex flex-1 flex-col gap-1.5">
                                            <Skeleton className="h-3 w-3/4"/>
                                            <Skeleton className="h-2.5 w-full"/>
                                            <Skeleton className="h-2 w-1/4"/>
                                        </div>
                                    </div>
                                ))
                            ) : notifications.length === 0 ? (
                                <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                                    {t('layout.notifications.empty')}
                                </p>
                            ) : (
                                <>
                                    {notifications.map((n) => {
                                        const route = entityRoute(n.entityType, n.entityId);
                                        return (
                                            <DropdownMenuItem
                                                key={n.id}
                                                className="flex cursor-pointer items-start gap-2.5 px-3 py-2.5"
                                                onClick={() => {
                                                    if (!n.isRead) markRead.mutate(n.id);
                                                    if (route) router.push(route);
                                                }}
                                            >
                                                <span
                                                    className={`mt-1.5 size-2 shrink-0 rounded-full ${
                                                        !n.isRead ? "bg-primary" : "bg-transparent"
                                                    }`}
                                                />
                                                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                                    <span className="text-[13px] font-medium leading-tight">{n.title}</span>
                                                    <span className="truncate text-xs text-muted-foreground">{n.body}</span>
                                                    <span className="text-[10px] text-muted-foreground/70">{relativeTime(n.createdAt)}</span>
                                                </div>
                                            </DropdownMenuItem>
                                        );
                                    })}
                                    {hasNextPage && (
                                        <DropdownMenuItem
                                            className="cursor-pointer justify-center py-2.5 text-xs font-medium text-muted-foreground"
                                            onClick={() => fetchNextPage()}
                                            disabled={isFetchingNextPage}
                                        >
                                            {isFetchingNextPage
                                                ? t('layout.notifications.loading')
                                                : t('layout.notifications.loadMore')}
                                        </DropdownMenuItem>
                                    )}
                                </>
                            )}
                        </div>
                        {notifications.length > 0 && (
                            <>
                                <DropdownMenuSeparator className="my-0"/>
                                <DropdownMenuItem
                                    className="cursor-pointer justify-center py-2.5 text-xs font-medium text-primary"
                                    onClick={() => markAllRead.mutate()}
                                >
                                    {t('layout.notifications.markAllRead')}
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    )
}
