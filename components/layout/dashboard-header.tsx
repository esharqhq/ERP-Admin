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
import {navItems} from "@/lib/nav-items"
import {Bell} from "lucide-react"
import {LanguageSwitcher} from "./language-switcher";
import {useTranslations} from "next-intl";
import {useNotificationStore} from "@/store/notification.store";

function relativeTime(ts: number): string {
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

export function DashboardHeader() {
    const pathname = usePathname()
    const t = useTranslations()
    const notifications = useNotificationStore((s) => s.notifications);
    const markAllRead = useNotificationStore((s) => s.markAllRead);
    const markRead = useNotificationStore((s) => s.markRead);

    const current = navItems.find(
        (item) =>
            pathname === item.url ||
            (item.url !== "/dashboard" && pathname.startsWith(item.url))
    ) ?? navItems[0]

    const unreadCount = notifications.filter((n) => !n.isRead).length;

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
                            {notifications.length === 0 ? (
                                <p className="px-3 py-6 text-center text-xs text-muted-foreground">
                                    {t('layout.notifications.empty')}
                                </p>
                            ) : (
                                notifications.map((n) => (
                                    <DropdownMenuItem
                                        key={n.id}
                                        className="flex cursor-pointer items-start gap-2.5 px-3 py-2.5"
                                        onClick={() => markRead(n.id)}
                                    >
                                        <span
                                            className={`mt-1.5 size-2 shrink-0 rounded-full ${
                                                !n.isRead ? "bg-primary" : "bg-transparent"
                                            }`}
                                        />
                                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                            <span className="text-[13px] font-medium leading-tight">{n.title}</span>
                                            <span className="truncate text-xs text-muted-foreground">{n.body}</span>
                                            <span className="text-[10px] text-muted-foreground/70">{relativeTime(n.receivedAt)}</span>
                                        </div>
                                    </DropdownMenuItem>
                                ))
                            )}
                        </div>
                        {notifications.length > 0 && (
                            <>
                                <DropdownMenuSeparator className="my-0"/>
                                <DropdownMenuItem
                                    className="cursor-pointer justify-center py-2.5 text-xs font-medium text-primary"
                                    onClick={markAllRead}
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
