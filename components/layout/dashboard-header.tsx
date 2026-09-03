"use client"

import {usePathname} from "next/navigation"
import {useLocale} from "next-intl"
import {SidebarTrigger, useSidebar} from "@/components/ui/sidebar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {Skeleton} from "@/components/ui/skeleton"
import {navGroups} from "@/lib/nav-items"
import {Bell, ChevronRight} from "lucide-react"
import {Link} from "@/i18n/navigation"
import {LanguageSwitcher} from "./language-switcher";
import {useTranslations} from "next-intl";
import {useRouter} from "@/i18n/navigation";
import {useHealth} from "@/hooks/use-health";
import {
    useNotificationList,
    useUnreadCount,
    useMarkRead,
    useMarkAllRead,
} from "@/hooks/use-notifications";
import {notificationRoute} from "@/lib/notifications/route";

function relativeTime(createdAt: string): string {
    const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

/**
 * The green "All systems normal" chip from the admin sidebar spec.
 *
 * Renders nothing at all until `HEALTH_URL` is configured — the same rule the
 * sign-in strip already follows, and for the same reason: the design prints the
 * sentence as a fixed string, and a hardcoded green dot reads NORMAL loudest
 * during exactly the outage it exists to reveal. See `hooks/use-health.ts`.
 *
 * The spec draws only the healthy state. `down` gets the same chip in the
 * pending amber, since a chip that vanishes when things break would repeat the
 * fixed-green mistake by omission.
 */
function SystemStatusChip({healthUrl}: { healthUrl?: string }) {
    const t = useTranslations("layout.health")
    const health = useHealth(healthUrl)

    if (!healthUrl || health === "checking") return null

    const ok = health === "ok"
    return (
        <span
            className={
                "hidden h-[30px] shrink-0 items-center gap-[7px] rounded-full px-3 text-xs font-semibold lg:flex " +
                // The spec's chip text is `#1C6B4C` (forest-500). `globals.css`
                // deliberately does not expose the forest ramp as utilities —
                // components speak the semantic names only — so this takes
                // `--primary` (forest-700), which is a step darker on the same
                // tint and therefore a contrast gain, not a loss.
                (ok
                    ? "bg-status-active-tint text-primary ring-1 ring-status-active/20"
                    : "bg-status-pending-tint text-status-pending-deep ring-1 ring-status-pending/25")
            }
        >
            <span
                className={
                    "size-[7px] shrink-0 rounded-full " +
                    (ok ? "bg-status-active" : "bg-status-pending")
                }
            />
            {ok ? t("normal") : t("degraded")}
        </span>
    )
}

/**
 * The console topbar, per `../assets/Uyer-Admin-Sidebar.dc.html` — the spec
 * covers both sides of the shell, and the 66px height is shared chrome with the
 * sidebar's brand band ("one line across").
 *
 * TWO DELIBERATE SUBSETS of what that spec draws:
 *
 * 1. No page title. The spec's topbar is two lines — crumb above, an 18/700
 *    title below ("Operations — Tuesday, 25 August", "Workers 312"). Roughly
 *    twenty pages already print their own heading, so rendering it here too
 *    would say everything twice. The bar stays one line, vertically centred,
 *    until those headings move up into it.
 *
 * 2. Two crumbs, not three. The spec's third crumb is a record name — "Worker ›
 *    Workers › Sardor A." — which only the page holding that record knows. On a
 *    detail route the section crumb therefore becomes a link back to the list
 *    rather than a fabricated third level.
 *
 * What IS 1:1: the first crumb is the sidebar GROUP and never "Home", so the
 * operator reads which role's world they are in; the last crumb is not a link;
 * the collapse control appears here only while the rail is collapsed (expanded,
 * it lives in the rail's own brand band); and the bell's count never animates.
 */
export function DashboardHeader({healthUrl}: { healthUrl?: string }) {
    const rawPathname = usePathname()
    const locale = useLocale()
    const pathname = rawPathname.replace(`/${locale}`, "") || "/"
    const t = useTranslations()
    const router = useRouter()
    const {state, isMobile} = useSidebar()

    const {data: infiniteData, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage} = useNotificationList();
    const {data: unreadCount = 0} = useUnreadCount();
    const markRead = useMarkRead();
    const markAllRead = useMarkAllRead();

    const notifications = infiniteData?.pages.flat() ?? [];

    // Longest prefix wins, so `/dashboard/settings/audit` resolves to Settings
    // rather than to whichever shorter entry happens to be declared first.
    const match =
        navGroups
            .flatMap((group) => group.items.map((item) => ({group, item})))
            .filter(
                ({item}) =>
                    pathname === item.url ||
                    (item.url !== "/dashboard" && pathname.startsWith(item.url))
            )
            .sort((a, b) => b.item.url.length - a.item.url.length)[0]

    // Several dashboard routes are not nav destinations at all — profile,
    // notifications, chat, kyc, conversations. Falling back to the first nav
    // entry printed "Dashboard > Overview" on the Profile page, which names a
    // page the operator is not on and links away from where they are. With no
    // match the trail shows the group alone and stops: less information, but
    // none of it false.
    const group = match?.group ?? navGroups[0]
    const item = match?.item
    const onSection = item ? pathname === item.url : false

    return (
        <header
            className="flex h-[66px] shrink-0 items-center gap-4 border-b border-border bg-background px-6">
            {/* Expanded, the collapse control is in the rail's brand band; only
                the collapsed state needs an expand affordance out here. On
                mobile it is ALWAYS needed: the rail is an off-canvas Sheet whose
                own trigger is inside the Sheet, and `state` tracks the desktop
                value, so gating on `state` alone left the mobile nav with no
                way to open. */}
            {isMobile || state === "collapsed" ? (
                <SidebarTrigger
                    aria-label={t("layout.sidebar.expand")}
                    className="size-[34px] shrink-0 rounded-[11px] bg-canvas text-ink-soft ring-1 ring-border hover:bg-shell-tint hover:text-foreground"
                />
            ) : null}

            <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-[7px] text-xs">
                {/* The group, not "Home": it names whose problem this screen is
                    about, which is how an operator navigates. Not a link — a
                    role group has no page of its own. */}
                <span
                    className={
                        item
                            ? "shrink-0 text-[var(--neutral-muted)]"
                            : "shrink-0 font-semibold text-primary"
                    }
                    aria-current={item ? undefined : "page"}
                >
                    {t(group.labelKey)}
                </span>
                {item ? (
                    <>
                        <ChevronRight className="size-3.5 shrink-0 text-[var(--neutral-muted)]/55"/>
                        {onSection ? (
                            <span aria-current="page" className="truncate font-semibold text-primary">
                                {t(item.labelKey)}
                            </span>
                        ) : (
                            <Link
                                href={item.url}
                                className="truncate text-[var(--neutral-muted)] transition-colors hover:text-primary"
                            >
                                {t(item.labelKey)}
                            </Link>
                        )}
                    </>
                ) : null}
            </nav>

            <div className="ml-auto flex items-center gap-3">
                <SystemStatusChip healthUrl={healthUrl}/>
                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={
                            <button
                                type="button"
                                className="relative flex size-[38px] shrink-0 items-center justify-center rounded-[12px] bg-canvas text-primary ring-1 ring-border transition-colors hover:bg-shell-tint data-open:bg-shell-tint"
                            />
                        }
                    >
                        <Bell className="size-[18px]"/>
                        {unreadCount > 0 && (
                            // Capped at 9+, and no transition or animation on
                            // the badge: "an operator glances at this rail
                            // hundreds of times a day."
                            <span
                                className="absolute -top-[5px] -right-[5px] flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-status-cancelled px-1 font-mono text-[10px] leading-none font-medium text-white ring-2 ring-background">
                                {unreadCount > 9 ? "9+" : unreadCount}
                            </span>
                        )}
                        <span className="sr-only">{t('layout.notifications.title')}</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" sideOffset={8} className="w-80 p-0">
                        {/* "Mark all read" sits beside the title, where the spec
                            draws it — a list you are clearing acts on itself at
                            the top, not after a scroll. */}
                        <DropdownMenuLabel className="flex items-center justify-between gap-3 px-3 py-2.5">
                            <span className="text-sm font-semibold">{t('layout.notifications.title')}</span>
                            {unreadCount > 0 && (
                                <button
                                    onClick={() => markAllRead.mutate()}
                                    className="text-[11px] font-medium text-muted-foreground transition-colors hover:text-primary"
                                >
                                    {t('layout.notifications.markAllRead')}
                                </button>
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
                                        const route = notificationRoute(n.entityType, n.entityId);
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
                        <DropdownMenuSeparator className="my-0"/>
                        <div className="flex items-center justify-between px-3 py-2">
                            <Link
                                href="/dashboard/notifications"
                                className="text-xs font-medium text-primary hover:underline"
                            >
                                {t('layout.notifications.viewAll')}
                            </Link>
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>
                <LanguageSwitcher size="topbar"/>
            </div>
        </header>
    )
}
