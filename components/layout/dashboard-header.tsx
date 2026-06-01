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

const notifications = [
    {id: 1, title: "Yangi task tayinlandi", desc: "HVAC Repair — Villa Sunrise", time: "5 daq oldin", unread: true},
    {id: 2, title: "Worker kechikdi", desc: "Malika S. — Geofence tashqarida", time: "1 soat oldin", unread: true},
    {id: 3, title: "Shartnoma imzolandi", desc: "Sunrise LLC", time: "3 soat oldin", unread: true},
    {id: 4, title: "Hujjat muddati tugayapti", desc: "Jasur T. — 5 kun qoldi", time: "Bugun", unread: false},
    {id: 5, title: "Yangi shikoyat", desc: "GrandBuild Corp", time: "Kecha", unread: false},
]

export function DashboardHeader() {
    const pathname = usePathname()

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
                        <BreadcrumbPage>{current.title}</BreadcrumbPage>
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
                        <span className="sr-only">Bildirishnomalar</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" sideOffset={8} className="w-80 p-0">
                        <DropdownMenuLabel className="flex items-center justify-between px-3 py-2.5">
                            <span className="text-sm font-semibold">Bildirishnomalar</span>
                            {unreadCount > 0 && (
                                <span className="text-[11px] text-muted-foreground">
                  {unreadCount} ta yangi
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
                                {"Barchasini ko'rish"}
                            </DropdownMenuItem>
                        </Link>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    )
}
