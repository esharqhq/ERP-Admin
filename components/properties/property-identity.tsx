"use client";

import { Building2, Copy, Key, Layers, MapPin, Ruler } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BandStat, FactTile, IdentityBand } from "@/components/detail/identity-band";
import { categoryName } from "@/lib/properties/table-rows";
import { initials } from "@/lib/ui/initials";
import type { PropertyDto, PropertyMembershipDto } from "@/lib/types/property.types";

const VISIT_WINDOW_DAYS = 90;

/**
 * The property's identity card — the same `IdentityBand` Owner and Worker detail
 * use, which is what the design means by *"built to the same shape"*.
 *
 * **It replaced `property-hero.tsx`, now deleted**, and with it that hero's
 * `dot-field` cover band: the band's ground is `--forest-700` and the utility was
 * written for the sign-in panel, where the copy on it is white (the login page
 * still uses it correctly). The heading sat on it in near-black, its top third cut
 * off by a `-mt-8` that pulled an `items-end` row above the band's own edge.
 * `IdentityBand` has no band at all, which is why the fault cannot come back.
 *
 * It also absorbed `property-info.tsx` — the old "General Information" card. Its
 * four facts are the `tiles` row here, so the page states each of them once.
 *
 * ⚠ **The design's *"added 12 Aug 2026 · D. Krüger"* ships without the name.**
 * `PropertyDto` carries no `createdBy`, and ask #25 already records that no route
 * resolves an admin id to a name — so the second half has two independent
 * blockers and is a stated cut, not an omission.
 */
export function PropertyIdentityCard({
  property,
  memberships,
  membershipsPending,
  visitCount,
  visitsPending,
}: {
  property: PropertyDto;
  memberships: PropertyMembershipDto[];
  membershipsPending: boolean;
  visitCount: number | null;
  visitsPending: boolean;
}) {
  const t = useTranslations("properties");
  const tDetail = useTranslations("properties.detail");
  const locale = useLocale();

  const size = [
    property.floorCount === null
      ? null
      : tDetail("floors", { count: property.floorCount }),
    property.roomCount === null
      ? null
      : tDetail("rooms", { count: property.roomCount }),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <IdentityBand
      // `IdentityBand` prints initials in its avatar; a place gets the building
      // mark the design draws instead, so the slot takes an empty string and the
      // icon rides in the qualifier-free name row below.
      initials=""
      icon={<Building2 className="size-6" />}
      name={property.name}
      // The address gets its **own line** under the name, as the design draws it.
      // It was in `meta`, which shares the badge row — so it trailed the category
      // and the size and read as a fourth chip rather than as where this is.
      subtitle={
        <>
          <MapPin className="size-3.5 shrink-0" />
          <span className="truncate" title={property.address}>
            {property.address}
          </span>
        </>
      }
      badges={
        <>
          <Badge variant="secondary" className="font-normal">
            {categoryName(property.category, locale)}
          </Badge>
          {size && (
            <span className="text-[11px] text-muted-foreground">{size}</span>
          )}
          <span className="font-mono text-[11px] text-muted-foreground">
            {tDetail("added", { date: formatDay(property.createdAt, locale) })}
          </span>
        </>
      }
      // Team first, then the count — the design's order, and the reason `aside`
      // exists: the team is neither a number (`stats`) nor a button (`actions`),
      // and it was in `actions` only because that slot happened to be free.
      aside={
        <TeamWithAccess
          memberships={memberships}
          isPending={membershipsPending}
          label={tDetail("teamWithAccess")}
          emptyLabel={tDetail("teamEmpty")}
        />
      }
      stats={
        visitsPending || visitCount === null ? null : (
          <BandStat
            label={tDetail("visitsWindow", { days: VISIT_WINDOW_DAYS })}
            value={visitCount}
          />
        )
      }
      tiles={
        <>
          <FactTile
            icon={<Ruler className="size-4" />}
            label={t("columns.area")}
            value={
              property.areaSqm === null
                ? "—"
                : `${property.areaSqm.toLocaleString(locale, { maximumFractionDigits: 2 })} m²`
            }
            mono
          />
          <FactTile
            icon={<Layers className="size-4" />}
            label={t("columns.category")}
            value={categoryName(property.category, locale)}
          />
          <FactTile
            icon={<MapPin className="size-4" />}
            label={tDetail("pinnedEntrance")}
            value={`${property.lat.toFixed(6)}, ${property.long.toFixed(6)}`}
            mono
            trailing={
              <CopyButton
                text={`${property.lat}, ${property.long}`}
                label={tDetail("copyCoords")}
              />
            }
          />
          <FactTile
            icon={<Key className="size-4" />}
            label={tDetail("entry")}
            // The one free-text field here, and the one a worker is actually sent
            // with, so its **tail carries information** — a door code at the end
            // of the sentence is exactly what an ellipsis would eat. Two lines,
            // and the full text on hover.
            value={
              <span title={property.entryInstructions || undefined}>
                {property.entryInstructions || "—"}
              </span>
            }
            wrap
          />
        </>
      }
    />
  );
}

/**
 * Who else can act on this property.
 *
 * Sits in the band's `actions` slot rather than as its own card: the design puts
 * it inside the identity card, and it is a fact about the account rather than a
 * thing to do. Inactive memberships are already dropped by the hook — a revoked
 * one is history, and this answers who can act **now**.
 */
function TeamWithAccess({
  memberships,
  isPending,
  label,
  emptyLabel,
}: {
  memberships: PropertyMembershipDto[];
  isPending: boolean;
  label: string;
  emptyLabel: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">
        {label}
      </span>
      {isPending ? (
        <span className="h-6 w-24 animate-pulse rounded bg-muted" />
      ) : memberships.length === 0 ? (
        <span className="text-[11px] text-muted-foreground">{emptyLabel}</span>
      ) : (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {memberships.map((m) => (
            <span key={m.id} className="flex items-center gap-1.5">
              <Avatar className="size-6">
                <AvatarFallback className="bg-accent text-[9px] font-semibold text-primary">
                  {initials(m.ownerName)}
                </AvatarFallback>
              </Avatar>
              <span className="text-[12.5px]">{m.ownerName}</span>
              <span className="font-mono text-[9.5px] uppercase tracking-[0.06em] text-muted-foreground">
                {m.roleCode}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Copies the pin.
 *
 * ⚠ `navigator.clipboard` is unavailable on an insecure origin and can be refused
 * even on a secure one, so the write is guarded and a failure is silent — the
 * coordinates are on screen either way, and an error toast for a convenience is
 * worse than the convenience not working.
 */
function CopyButton({ text, label }: { text: string; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => void navigator.clipboard?.writeText(text).catch(() => {})}
      className="rounded p-1 text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Copy className="size-3.5" />
    </button>
  );
}

function formatDay(iso: string, locale: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
}
