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
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Skeleton } from "@/components/ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { navGroups, type NavBadgeKind, type NavItem } from "@/lib/nav-items"
import { logoutAction } from "@/app/[locale]/login/actions"
import { useAuthStore } from "@/store/auth.store"
import { useCurrentPermissions } from "@/hooks/use-current-permissions"
import { ChevronsUpDown, Lock, LogOut, UserCircle } from "lucide-react"
import { useTranslations, useLocale } from "next-intl"

/**
 * The admin rail, built to `../assets/Uyer-Admin-Sidebar.dc.html`.
 *
 * Geometry (264 / 76, 36-tall rows at radius 10, 18pt icons) lives in the
 * `nav` size variant in `components/ui/sidebar.tsx`, because it has to hold in
 * both states and icon mode needs a 44x36 box rather than the 32x32 the other
 * sizes clamp to. What stays here is composition: the 66 brand band, the five
 * role groups, the badge vocabulary, the locked row, and the account block.
 *
 * Every colour is an opacity of white over the forest ground — see the
 * `--sidebar-*` block in `app/globals.css` for why `--sidebar-foreground` is
 * pure white and not a tint.
 */

/**
 * Counts for the rail's badges, keyed by nav url.
 *
 * Deliberately empty. The spec's own "Confirm before build" section says these
 * counts need to arrive in ONE call — "otherwise the rail fires fifteen
 * requests per load" — and no such endpoint exists yet (filed in
 * BACKEND-ASKS.md). Every badge below therefore renders nothing today, which is
 * the honest state: an empty white pill would read as a queue of zero, and a
 * permanent amber dot would claim something is expiring when nothing is known.
 * When the endpoint lands, replace this constant with the fetched map and the
 * whole vocabulary lights up unchanged.
 */
const navBadgeCounts: Partial<Record<string, number>> = {}

/**
 * Labels that appear in more than one role group — today just "Documents",
 * which the spec itself flags as an open question ("confirm whether Documents
 * belongs in both Owner and Worker groups on purpose"; it does, deliberately).
 *
 * Expanded, the group header tells the two apart. Collapsed, that header is a
 * 30px hairline and both rows are the same 18px folder glyph, so a bare label
 * tooltip would name two different destinations identically. These rows — and
 * only these — get the group prefixed, which is the same disambiguation the
 * design already uses for the breadcrumb's first crumb.
 */
const duplicatedLabelKeys = new Set(
  navGroups
    .flatMap((g) => g.items.map((i) => i.labelKey))
    .filter((key, i, all) => all.indexOf(key) !== i)
)

/**
 * The four treatments from the spec's "Counts mean work waiting" rule. Colour
 * carries the meaning, so the number alone is never enough: `queue` is white
 * (a pile this operator clears), `waiting` is red (a person is waiting on a
 * reply), `expiring` is an amber dot with no number, and `total` is a plain
 * mono figure that is explicitly NOT an alert.
 */
function NavBadge({ kind, count }: { kind: NavBadgeKind; count?: number }) {
  if (count === undefined || count <= 0) return null

  if (kind === "expiring") {
    return (
      <span className="size-[7px] shrink-0 rounded-full bg-status-pending" />
    )
  }

  if (kind === "total") {
    return (
      <span className="shrink-0 font-mono text-[11px] text-sidebar-foreground/55 tabular-nums">
        {count}
      </span>
    )
  }

  return (
    <span
      className={
        "flex h-[19px] min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 " +
        "font-mono text-[11px] tabular-nums " +
        (kind === "queue"
          ? "bg-sidebar-foreground font-semibold text-sidebar"
          : "bg-status-cancelled font-medium text-white")
      }
    >
      {count}
    </span>
  )
}

/**
 * The collapsed rail's corner badge. Only `queue` and `waiting` survive the
 * collapse — the spec's 76px render drops totals and the expiring dot, keeping
 * the rail free of marks that are not asking for action. The 2px ring in the
 * sidebar ground is what stops the badge from smearing into the glyph beneath.
 */
function NavRailBadge({ kind, count }: { kind: NavBadgeKind; count?: number }) {
  if (count === undefined || count <= 0) return null
  if (kind !== "queue" && kind !== "waiting") return null

  return (
    <span
      className={
        "absolute top-0.5 right-1.5 hidden h-3.5 min-w-3.5 items-center justify-center " +
        "rounded-full px-[3px] font-mono text-[9px] leading-none tabular-nums " +
        "ring-2 ring-sidebar group-data-[collapsible=icon]:flex " +
        (kind === "queue"
          ? "bg-sidebar-foreground font-semibold text-sidebar"
          : "bg-status-cancelled font-medium text-white")
      }
    >
      {count}
    </span>
  )
}

export function AppSidebar() {
  const rawPathname = usePathname()
  const locale = useLocale()
  const pathname = rawPathname.replace(`/${locale}`, "") || "/"
  const adminMe = useAuthStore((s) => s.adminMe)
  const { permissions } = useCurrentPermissions()
  const t = useTranslations()

  // Fail CLOSED while the grant set is UNKNOWN (cold start): the skeleton below
  // holds until permissions resolve, so a limited admin never flashes sections
  // before we know whether they hold them.
  //
  // Once the set IS known, the spec reverses the old behaviour: "Roles dim, not
  // delete. A permission-less row stays with a lock icon and opens the 403 page
  // that names the missing scope." Hiding a row taught the operator the feature
  // did not exist; dimming it lets them see it and ask for the grant. The
  // fail-closed rule above is untouched — it was only ever about the unknown
  // state, which is a different thing from a known denial.
  const canSee = (perm?: string) => !perm || (permissions?.has(perm) ?? false)

  const canSeeItem = (item: NavItem) =>
    item.anyOf
      ? permissions
        ? item.anyOf.some((p) => permissions.has(p))
        : false
      : canSee(item.permission)

  /**
   * Where a locked row points. The 403 page already reads `?permission=` and
   * prints the scope in the mono face, so the lock hands the operator the exact
   * string to relay. An `anyOf` row has no single scope to name — the page
   * branches on the param's absence and falls back to generic copy, so passing
   * the first entry would name one of several requirements as though it were
   * the requirement. Better to say nothing than to name the wrong one.
   */
  const lockedHref = (item: NavItem) =>
    item.anyOf || !item.permission
      ? "/forbidden"
      : `/forbidden?permission=${encodeURIComponent(item.permission)}`

  const lockedHint = (item: NavItem) =>
    item.anyOf || !item.permission
      ? t("layout.sidebar.lockedGeneric")
      : t("layout.sidebar.locked", { permission: item.permission })

  const email = adminMe?.email ?? "admin@erp.com"
  const displayName = adminMe?.fullName ?? email
  const roleLine = [adminMe?.role?.name, locale.toUpperCase()]
    .filter(Boolean)
    .join(" · ")
  const initials = (adminMe?.fullName ?? email).slice(0, 2).toUpperCase()

  return (
    // 400ms before a rail tooltip appears, per the spec. Base UI carries the
    // delay on the provider rather than the tooltip root, so it is set here
    // once for every row instead of per button.
    <TooltipProvider delay={400}>
      <Sidebar collapsible="icon">
        {/* The brand band and the topbar are "66pt — one line across", so this
            height is shared chrome, not a header's own choice. */}
        <SidebarHeader className="h-[66px] shrink-0 flex-row items-center gap-[11px] border-b border-sidebar-border px-4 py-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <Link
            href="/dashboard"
            className="flex min-w-0 flex-1 items-center gap-[11px] group-data-[collapsible=icon]:flex-none"
          >
            {/* A solid white tile, not a tinted one: the mark is the only place
                in this band that is allowed to be opaque white, which is what
                makes it read as a logo rather than as another active row.
                The padding is on the TILE, not the spec's `cover` +
                `scale(1.06)`. That pairing assumes an asset with internal
                padding; `uyer-mark.png` is a 512 square whose U touches the top
                edge and whose dot nearly touches the bottom, so cover-and-scale
                clipped both ends off the logo, and even `contain` left it
                crowding all four sides of the white. 6px each way gives the
                mark the breathing room the spec's own asset already carried. */}
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[11px] bg-white p-[6px]">
              <Image
                src="/uyer-mark.png"
                alt="Uyer"
                width={72}
                height={72}
                priority
                className="size-full object-contain"
              />
            </span>
            <span className="flex min-w-0 flex-col gap-px group-data-[collapsible=icon]:hidden">
              <span className="font-heading text-[14px] font-bold tracking-[0.16em] text-sidebar-foreground">
                UYER
              </span>
              <span className="truncate text-[11px] text-sidebar-foreground/55">
                {t("layout.sidebar.tagline")}
              </span>
            </span>
          </Link>
          {/* Collapsed, the band holds the mark alone — the spec moves the
              expand control to the topbar, where `DashboardHeader` already
              renders one, so nothing is stranded. */}
          <SidebarTrigger
            aria-label={t("layout.sidebar.collapse")}
            className="size-7 shrink-0 rounded-[8px] bg-sidebar-foreground/8 text-sidebar-foreground/70 hover:bg-sidebar-foreground/14 hover:text-sidebar-foreground group-data-[collapsible=icon]:hidden"
          />
        </SidebarHeader>

        <SidebarContent className="gap-3 px-3 pt-3.5 pb-2 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-[3px] group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:pb-0">
          {permissions === null ? (
            <div className="flex flex-col gap-2 px-2 py-2">
              {Array.from({ length: 6 }).map((_, i) => (
                // `bg-sidebar-foreground/10` rather than the default
                // `bg-muted`: this cold-start placeholder sits on the forest
                // band, where a near-white neutral reads as a white slab.
                <Skeleton
                  key={i}
                  className="h-9 w-full rounded-[10px] bg-sidebar-foreground/10"
                />
              ))}
            </div>
          ) : null}

          {permissions !== null &&
            navGroups.map((group, groupIndex) => (
              <SidebarGroup
                key={group.id}
                className="gap-0 p-0 group-data-[collapsible=icon]:items-center"
              >
                {/* Collapsed, a group header cannot be read, so the spec turns
                    each boundary into a 30x1 hairline instead. It is a sibling
                    rather than a restyled label because the two have different
                    box models, and morphing one into the other leaves the
                    label's collapse margin behind. Not before the first group:
                    a divider above the topmost row would fence it off from the
                    brand band. */}
                {groupIndex > 0 ? (
                  <span
                    aria-hidden
                    className="mx-auto hidden h-px w-[30px] bg-sidebar-foreground/10 group-data-[collapsible=icon]:my-[5px] group-data-[collapsible=icon]:block"
                  />
                ) : null}
                <SidebarGroupLabel className="h-auto px-2 pb-[7px] text-[10px] font-semibold tracking-[0.13em] text-sidebar-foreground/36 uppercase group-data-[collapsible=icon]:mt-0! group-data-[collapsible=icon]:hidden">
                  {t(group.labelKey)}
                </SidebarGroupLabel>
                <SidebarGroupContent className="group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center">
                  <SidebarMenu className="gap-[2px] group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-[3px]">
                    {group.items.map((item) => {
                      const label = t(item.labelKey)
                      const locked = !canSeeItem(item)
                      const count = navBadgeCounts[item.url]
                      // A locked row is never active: it does not lead to the
                      // route it names, so marking it as where you are would
                      // be a lie about your own position.
                      const isActive =
                        !locked &&
                        (pathname === item.url ||
                          (item.url !== "/dashboard" &&
                            pathname.startsWith(item.url)))

                      return (
                        <SidebarMenuItem
                          key={item.url}
                          className="group-data-[collapsible=icon]:w-11"
                        >
                          <SidebarMenuButton
                            size="nav"
                            render={
                              <Link
                                href={locked ? lockedHref(item) : item.url}
                              />
                            }
                            isActive={isActive}
                            aria-current={isActive ? "page" : undefined}
                            title={locked ? lockedHint(item) : undefined}
                            tooltip={{
                              children: (
                                <>
                                  {duplicatedLabelKeys.has(item.labelKey)
                                    ? `${t(group.labelKey)} · ${label}`
                                    : label}
                                  {count !== undefined &&
                                  count > 0 &&
                                  item.badge ? (
                                    // The single lime in this design: a count
                                    // inside a rail tooltip.
                                    <span className="font-mono text-[11px] text-sidebar-primary tabular-nums">
                                      {count}
                                    </span>
                                  ) : null}
                                </>
                              ),
                              sideOffset: 10,
                            }}
                            className={
                              locked
                                ? "opacity-[0.42] hover:bg-transparent hover:opacity-60"
                                : undefined
                            }
                          >
                            <item.icon strokeWidth={2} />
                            <span className="flex-1 truncate group-data-[collapsible=icon]:hidden">
                              {label}
                            </span>
                            {locked ? (
                              // The `!` beats the row's `[&_svg]:size-[18px]`,
                              // which wins on selector specificity otherwise.
                              <Lock className="size-3.5! shrink-0 text-sidebar-foreground/55 group-data-[collapsible=icon]:hidden" />
                            ) : item.badge ? (
                              <span className="group-data-[collapsible=icon]:hidden">
                                <NavBadge kind={item.badge} count={count} />
                              </span>
                            ) : null}
                            {!locked && item.badge ? (
                              <NavRailBadge kind={item.badge} count={count} />
                            ) : null}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
        </SidebarContent>

        <SidebarFooter className="shrink-0 gap-0 border-t border-sidebar-border p-3 group-data-[collapsible=icon]:px-0">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      type="button"
                      className="flex h-[52px] w-full items-center gap-2.5 rounded-lg bg-sidebar-foreground/6 px-2.5 text-left transition-[background-color] duration-[140ms] hover:bg-sidebar-foreground/10 data-open:bg-sidebar-foreground/10 group-data-[collapsible=icon]:h-auto group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0"
                    />
                  }
                >
                  {/* Pill, not a rounded square: the DS radius scale puts
                      "badges and avatars pill", and the spec draws it at 34
                      with a 16% white ground. */}
                  <span className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-sidebar-foreground/16 text-[13px] font-semibold text-sidebar-foreground">
                    {initials}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-px group-data-[collapsible=icon]:hidden">
                    <span className="truncate text-[13px] font-semibold text-sidebar-foreground">
                      {displayName}
                    </span>
                    {/* Role and locale in the mono face — the DS puts every
                        code, id and key there, and a role name is read back
                        over a support call exactly like a scope is. */}
                    <span className="truncate font-mono text-[10px] text-sidebar-foreground/50">
                      {roleLine}
                    </span>
                  </span>
                  <ChevronsUpDown className="ml-auto size-4 shrink-0 text-sidebar-foreground/55 group-data-[collapsible=icon]:hidden" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="top"
                  align="end"
                  sideOffset={8}
                  className="w-56"
                >
                  <DropdownMenuLabel className="overline-label text-muted-foreground/70">
                    {t("auth.account")}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer"
                    nativeButton={false}
                    render={<Link href="/dashboard/profile" />}
                  >
                    <UserCircle />
                    {t("profile.title")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <form action={logoutAction}>
                    <DropdownMenuItem
                      variant="destructive"
                      className="w-full cursor-pointer"
                      nativeButton
                      render={<button type="submit" />}
                    >
                      <LogOut />
                      {t("auth.logout")}
                    </DropdownMenuItem>
                  </form>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    </TooltipProvider>
  )
}
