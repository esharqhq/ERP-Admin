"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { navGroups } from "@/lib/nav-items"
import { logoutAction } from "@/app/[locale]/login/actions"
import { useAuthStore } from "@/store/auth.store"
import { ChevronsUpDown, LogOut } from "lucide-react"
import { useTranslations, useLocale } from "next-intl"

const menuButtonClass =
  "relative h-9 gap-3 px-2.5 text-[13px] font-medium text-sidebar-foreground/75 transition-colors " +
  "hover:bg-sidebar-accent/60 hover:text-sidebar-foreground " +
  "data-active:bg-primary/10 data-active:text-primary data-active:font-semibold " +
  "data-active:before:absolute data-active:before:left-0 data-active:before:top-1/2 data-active:before:-translate-y-1/2 " +
  "data-active:before:h-5 data-active:before:w-[3px] data-active:before:rounded-r-full data-active:before:bg-primary " +
  "[&_svg]:size-[18px] [&_svg]:opacity-75 data-active:[&_svg]:opacity-100 " +
  "group-data-[collapsible=icon]:before:hidden"

export function AppSidebar() {
  const rawPathname = usePathname()
  const locale = useLocale()
  const pathname = rawPathname.replace(`/${locale}`, "") || "/"
  const adminMe = useAuthStore((s) => s.adminMe)
  const t = useTranslations()

  const email = adminMe?.email ?? "admin@erp.com"
  const displayName = adminMe?.role ?? "Super Admin"
  const initials = email.slice(0, 2).toUpperCase()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="pb-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/dashboard" />}
              className="gap-3 hover:bg-transparent"
            >
              {/*<div className="flex aspect-square  items-center justify-center overflow-hidden rounded-lg bg-sidebar-primary/10 ring-1 ring-sidebar-primary/15">*/}
                <Image
                  src="/mond-favicon.png"
                  alt="Mond"
                  width={60}
                  height={60}
                  priority
                  className="size-18 object-contain"
                />
              {/*</div>*/}
              <div className="flex flex-col gap-0.5 leading-tight">
                <span className="font-heading text-sm font-semibold tracking-tight">
                  MONDD
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Mond Control Center
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-4 px-1.5 py-2">
        {navGroups.map((group) => (
          <SidebarGroup key={group.id} className="px-0 py-0">
            <SidebarGroupLabel className="px-2.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              {t(group.labelKey)}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.url ||
                    (item.url !== "/dashboard" && pathname.startsWith(item.url))
                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        render={<Link href={item.url} />}
                        isActive={isActive}
                        tooltip={t(item.labelKey)}
                        className={menuButtonClass}
                      >
                        <item.icon />
                        <span>{t(item.labelKey)}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/60 pt-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <SidebarMenuButton
                    size="lg"
                    className="gap-3 data-open:bg-sidebar-accent/60"
                  >
                    <Avatar className="size-8 shrink-0 rounded-lg ring-1 ring-sidebar-border">
                      <AvatarImage src="/avatar.png" alt="Admin" />
                      <AvatarFallback className="rounded-lg bg-sidebar-primary/10 text-[11px] font-semibold text-sidebar-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-left leading-tight">
                      <span className="truncate text-[13px] font-medium">
                        {displayName}
                      </span>
                      <span className="truncate text-[11px] text-muted-foreground">
                        {email}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-50" />
                  </SidebarMenuButton>
                }
              />
              <DropdownMenuContent
                side="top"
                align="end"
                sideOffset={8}
                className="w-56"
              >
                <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
                  {t('auth.account')}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <form action={logoutAction}>
                  <DropdownMenuItem
                    variant="destructive"
                    className="w-full cursor-pointer"
                    nativeButton
                    render={<button type="submit" />}
                  >
                    <LogOut />
                    {t('auth.logout')}
                  </DropdownMenuItem>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
