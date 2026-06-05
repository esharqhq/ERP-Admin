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
import Link from "next/link";
import {LanguageSwitcher} from "./language-switcher";
import {useTranslations} from "next-intl";

const notifications = [
    {id: 1, title: "New task assigned", desc: "HVAC Repair — Sunrise Villa", time: "5 min ago", unread: true},
    {id: 2, title: "Worker delayed", desc: "Emma S. — Outside geofence", time: "1 hour ago", unread: true},
    {id: 3, title: "Contract signed", desc: "Sunrise LLC", time: "3 hours ago", unread: true},
    {id: 4, title: "Document expiring", desc: "John S. — 5 days left", time: "Today", unread: false},
    {id: 5, title: "New complaint", desc: "GrandBuild Corp", time: "Yesterday", unread: false},
]

export function DashboardHeader() {
    const pathname = usePathname()
    const t = useTranslations()

    const current = navItems.find(
        (item) =>
            pathname === item.url ||
            (item.url !== "/dashboard" && pathname.startsWith(item.url))
    ) ?? navItems[0]

    const unreadCount = notifications.filter((n) => n.unread).length

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
                  {t('layout.notifications.newCount', { count: unreadCount })}
                </span>
                            )}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator className="my-0"/>
                        <div className="max-h-96 overflow-y-auto">
                            {notifications.map((n) => (
                                <DropdownMenuItem
                                    key={n.id}
                                    className="flex cursor-pointer items-start gap-2.5 px-3 py-2.5"
                                >
                  <span
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${
                          n.unread ? "bg-primary" : "bg-transparent"
                      }`}
                  />
                                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                        <span className="text-[13px] font-medium leading-tight">{n.title}</span>
                                        <span className="truncate text-xs text-muted-foreground">{n.desc}</span>
                                        <span className="text-[10px] text-muted-foreground/70">{n.time}</span>
                                    </div>
                                </DropdownMenuItem>
                            ))}
                        </div>
                        <DropdownMenuSeparator className="my-0"/>
                        <Link href={"/dashboard/chat"}>
                            <DropdownMenuItem
                                className="cursor-pointer justify-center py-2.5 text-xs font-medium text-primary">
                                {t('layout.notifications.viewAll')}
                            </DropdownMenuItem>
                        </Link>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    )
}
