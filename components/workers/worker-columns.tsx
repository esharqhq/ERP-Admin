"use client";

import { useMemo } from "react";
import { Building2, CircleSlash, Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { DataColumn } from "@/components/ui/data-table";
import { useClock } from "@/hooks/use-today";
import type { WorkerRowDto } from "@/lib/types/worker.types";
import { initials } from "@/lib/ui/initials";
import { formatDay, formatRelativeAge } from "@/lib/ui/relative-time";
import { stageKey, stageTone, workerStatusPresentation } from "@/lib/workers/worker-status";
import { cn } from "@/lib/utils";

/**
 * The workers table's column registry — **fourteen registered, seven visible**.
 *
 * §08 of the design system caps a table at seven, and `Uyer-Admin-Workers-Table.dc.html`
 * §05 chooses which seven. The other seven are in the picker, addressed by the same
 * ids, so an admin who turns one on gets it at the position the registry gives it
 * rather than at the end.
 *
 * **Six columns are sortable and eight are not**, and the eight carry no `sortKey`
 * at all so the shell draws them inert. `sortBy` is a strict whitelist —
 * `fullName`, `createdAt`, `rating`, `experience`, `completedTasks`, `lastSeenAt`
 * — and anything else is `400 invalid_sort_column`, not a fallback. A header that
 * offers a sort the server refuses is worse than a header that offers none.
 *
 * ⚠ The **column id** is what travels in the URL, never the wire key. `sortKeyFor`
 * translates on the way into the query, so the same visible sort produces the same
 * link here as on a client-sorted queue.
 */
export function useWorkerColumns(): DataColumn<WorkerRowDto>[] {
  const t = useTranslations("workers");
  const tStage = useTranslations("workers.stage");
  const tAccount = useTranslations("workers.account");
  const locale = useLocale();
  const now = useClock();

  return useMemo<DataColumn<WorkerRowDto>[]>(
    () => [
      /* ---------------------------------------------------------- visible */
      {
        id: "worker",
        label: t("columns.worker"),
        // Identity. The picker lists it greyed with a lock rather than hiding it,
        // because a row reduced to counts is not a row anybody can act on.
        locked: true,
        sortKey: "fullName",
        className: "min-w-[240px]",
        cell: (w) => (
          <div className="flex min-w-0 items-center gap-3">
            <Avatar className="size-8 shrink-0">
              {/* Forest initials on the quiet green ground the owner and document
                  queues already use — `--accent` is `--forest-100`, the value the
                  design names, and it inverts correctly in dark mode. */}
              <AvatarFallback
                className={cn(
                  "text-xs font-semibold",
                  w.status === "Blocked"
                    ? "bg-status-cancelled-tint text-status-cancelled"
                    : "bg-accent text-primary",
                )}
              >
                {initials(w.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-sm font-semibold leading-tight tracking-[-0.005em]">
                {w.fullName || "—"}
              </span>
              <span className="truncate font-mono text-[11px] text-muted-foreground">
                {w.email || "—"}
              </span>
            </div>
          </div>
        ),
      },
      {
        id: "status",
        label: t("columns.status"),
        // Not sortable: neither axis is in the whitelist, and the column is a
        // merge of the two — there is no single field to order by.
        className: "min-w-[176px]",
        cell: (w) => {
          const s = workerStatusPresentation(w);
          return (
            <div className="flex min-w-0 flex-col items-start gap-1">
              <Badge
                tone={
                  s.tone === "solidCritical"
                    ? "danger"
                    : s.tone === "outlineWarning"
                      ? "warning"
                      : stageTone(s.labelKey)
                }
                className="h-5 rounded-md px-2 text-[11px]"
              >
                <span
                  aria-hidden
                  className="size-1.5 shrink-0 rounded-full bg-current opacity-70"
                />
                {s.kind === "stage"
                  ? tStage(s.labelKey as "kyc")
                  : tAccount(s.labelKey as "blocked")}
              </Badge>
              {/*
                The second line answers "where in the machine" — and when the
                account state has taken the badge, it answers "why" **and still
                names the stage**.

                ⚠ That second half is §04's warning box, which is about this exact
                row: *"A blocked worker who still holds a live contract reads
                Blocked in Account and Active in Stage. That contradiction is the
                truth, and both columns must show it."* One merged column can only
                honour that by carrying both here — a `stage` column sitting off by
                default in the picker is *reachable*, which is not the same as
                *shown*, and the default view is where an admin meets the
                contradiction or misses it.
              */}
              <span className="truncate text-[10px] text-muted-foreground">
                {s.kind === "stage"
                  ? s.step === null
                    ? t("status.branchStep")
                    : t("status.step", { step: s.step, steps: s.steps })
                  : t("status.overrides", {
                      reason: t(
                        `status.reason.${s.labelKey}` as "status.reason.blocked",
                      ),
                      stage: tStage(stageKey(w.onboardingStatus) as "kyc"),
                    })}
              </span>
            </div>
          );
        },
      },
      {
        id: "location",
        label: t("columns.location"),
        /*
          ⚠ Not sortable — F-04a added the two filters and **no** sort key, so
          `?sortBy=city` is a 400.

          Blanks are rendered loudly rather than as an em dash: a worker with no
          service location is invisible to either location filter, so these are
          exactly the rows that explain why a filtered list came back short.
        */
        className: "w-[136px]",
        cell: (w) =>
          w.city || w.country ? (
            <div className="flex min-w-0 flex-col gap-px">
              <span className="truncate text-[12.5px]">{w.city || "—"}</span>
              <span className="truncate text-[10px] text-muted-foreground">
                {w.country || t("location.noCountry")}
              </span>
            </div>
          ) : (
            <span className="text-[12.5px] text-status-cancelled">
              {t("location.notSet")}
            </span>
          ),
      },
      {
        id: "professions",
        label: t("columns.professions"),
        /*
          The same axis the profession filter narrows, so the chips and the filter
          always agree.

          ⚠ `register-merge` shrank the seeded table to `GENERAL` alone, so today
          every row shows exactly one chip. That is correct, not broken.
        */
        className: "w-[196px]",
        cell: (w) => {
          const skills = w.skills ?? [];
          if (skills.length === 0) {
            return (
              <span className="text-[11.5px] text-muted-foreground">
                {t("professions.none")}
              </span>
            );
          }
          // Two, then a count. Three chips overrun the column and truncate
          // mid-word, which reads as a bug rather than as a list.
          const shown = skills.slice(0, 2);
          return (
            <div className="flex min-w-0 items-center gap-1.5">
              {shown.map((s) => (
                <span
                  key={s}
                  className="flex h-[21px] flex-none items-center gap-1.5 rounded-md bg-muted px-2 text-[11.5px]"
                >
                  <span
                    aria-hidden
                    className="size-1.5 rounded-full"
                    style={{ background: skillHue(s) }}
                  />
                  <span className="truncate">{s}</span>
                </span>
              ))}
              {skills.length > shown.length && (
                <span className="flex-none font-mono text-[11px] text-muted-foreground">
                  +{skills.length - shown.length}
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: "rating",
        label: t("columns.rating"),
        sortKey: "rating",
        align: "right",
        className: "w-[104px]",
        cell: (w) => {
          /*
            ⚠ **Never `0.0` for an unrated worker.** The export prints the literal
            `unrated` when a worker has zero completed tasks, and that — not
            `rating === 0` — is the rule. A zero-star row would rank a new worker
            below every bad one.
          */
          const unrated = w.completedTasks === 0;
          return (
            <div className="flex flex-col items-end gap-px">
              {unrated ? (
                <Badge tone="info" className="h-5 rounded-md px-2 text-[11px]">
                  {t("rating.new")}
                </Badge>
              ) : (
                <span className="flex items-center gap-1 font-mono text-[12.5px] font-semibold tabular-nums">
                  <Star className="size-3 fill-current" strokeWidth={0} />
                  {w.rating.toFixed(1)}
                </span>
              )}
              <span className="whitespace-nowrap text-[10px] text-muted-foreground">
                {unrated
                  ? t("rating.notRatedYet")
                  : t("rating.count", { count: w.completedTasks })}
              </span>
            </div>
          );
        },
      },
      {
        id: "workload",
        label: t("columns.workload"),
        // Sorts on the count below the chip — `booked` is not a sort key.
        sortKey: "completedTasks",
        className: "w-[126px]",
        cell: (w) => (
          <div className="flex flex-col items-start gap-1">
            {/*
              ⚠ "Booked", never "working". `booked` is *assigned to an ACTIVE
              task* and never consults check-in — the agency portal's `onJob` is
              the one that means someone is standing on site.
            */}
            <Badge
              tone={w.booked ? "primary" : "neutral"}
              className="h-[21px] rounded-md px-2 text-[11.5px]"
            >
              {w.booked ? t("workload.booked") : t("workload.free")}
            </Badge>
            <span className="whitespace-nowrap text-[10px] text-muted-foreground">
              {t("workload.completed", { count: w.completedTasks })}
            </span>
          </div>
        ),
      },
      {
        id: "lastSeen",
        label: t("columns.lastSeen"),
        // ⚠ Under `Desc` the never-seen head the list — `NULL`s sort first.
        sortKey: "lastSeenAt",
        className: "w-[132px]",
        cell: (w) => (
          <div className="flex min-w-0 flex-col gap-px">
            {w.lastSeenAt ? (
              <span className="truncate text-xs">
                {formatRelativeAge(w.lastSeenAt, now, locale) ?? "—"}
              </span>
            ) : (
              // `null` means **never**, not "unknown", and never-seen is a
              // population an admin hunts — so it is a word, not a dash.
              <span className="text-xs font-medium text-status-cancelled">
                {t("lastSeen.never")}
              </span>
            )}
            <span className="truncate text-[10px] text-muted-foreground">
              {w.lastLoginAt
                ? t("lastSeen.signedIn", {
                    when: formatRelativeAge(w.lastLoginAt, now, locale) ?? "—",
                  })
                : t("lastSeen.registered", { when: formatDay(w.createdAt, locale) })}
            </span>
          </div>
        ),
      },

      /* ----------------------------------------------------------- picker */
      {
        id: "stage",
        label: t("columns.stage"),
        /*
          The stage **alone**, always — the escape hatch for the one thing the
          merged column above cannot show. §04: *"A blocked worker who still holds
          a live contract reads Blocked in Account and Active in Stage. That
          contradiction is the truth, and both columns must show it."* Off by
          default, because on all but a handful of rows it repeats the Status
          column word for word.
        */
        defaultVisible: false,
        cell: (w) => (
          <span className="text-[12.5px]">
            {tStage(stageKey(w.onboardingStatus) as "kyc")}
          </span>
        ),
      },
      {
        id: "lastLogin",
        label: t("columns.lastLogin"),
        // ⚠ Read-only. Neither filterable nor sortable — `?sortBy=lastLoginAt` 400s.
        defaultVisible: false,
        cell: (w) => (
          <span className="font-mono text-xs text-muted-foreground">
            {w.lastLoginAt ? formatDay(w.lastLoginAt, locale) : t("lastSeen.never")}
          </span>
        ),
      },
      {
        id: "agency",
        label: t("columns.agency"),
        /*
          ⚠ **One slot, two appearances** — never two columns. `agency` and
          `pendingAgency` are mutually exclusive by database guarantee, and drawing
          both is the bug the backend's own first draft had.
        */
        defaultVisible: false,
        className: "w-[168px]",
        cell: (w) => {
          if (w.agency) {
            return (
              <Badge tone="primary" className="h-5 max-w-full rounded-md px-2 text-[11px]">
                <Building2 className="size-3 shrink-0" />
                <span className="truncate">{w.agency}</span>
              </Badge>
            );
          }
          if (w.pendingAgency) {
            return (
              <div className="flex min-w-0 flex-col gap-px">
                <span className="truncate text-[12px] text-muted-foreground">
                  {w.pendingAgency}
                </span>
                <span
                  className={cn(
                    "truncate text-[10px] font-semibold",
                    w.pendingAgencyStatus === "Disputed"
                      ? "text-status-cancelled"
                      : "text-status-pending-deep",
                  )}
                >
                  {w.pendingAgencyStatus === "Disputed"
                    ? t("agency.disputed")
                    : t("agency.proposed")}
                </span>
              </div>
            );
          }
          // The `AGENCY —` reading the design draws: this worker is Independent,
          // which is exactly what `?agencySource=Independent` returns.
          return (
            <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <CircleSlash className="size-3" />
              {t("agency.independent")}
            </span>
          );
        },
      },
      {
        id: "experience",
        label: t("columns.experience"),
        sortKey: "experience",
        align: "right",
        defaultVisible: false,
        cell: (w) => (
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {/* Nullable on the row — an em dash, never `0 yrs`, which would be a
                claim nobody made. */}
            {w.experience === null ? "—" : t("experience.years", { years: w.experience })}
          </span>
        ),
      },
      {
        id: "registered",
        label: t("columns.registered"),
        sortKey: "createdAt",
        // The default sort, descending — but off by default as a column: an
        // account's age decides nothing an admin does from this list.
        defaultVisible: false,
        cell: (w) => (
          <span className="font-mono text-xs text-muted-foreground">
            {formatDay(w.createdAt, locale)}
          </span>
        ),
      },
      {
        id: "phone",
        label: t("columns.phone"),
        // Searchable, not sortable — `search` covers name, email and phone.
        defaultVisible: false,
        cell: (w) => (
          <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">
            {w.phoneNumber || "—"}
          </span>
        ),
      },
      {
        id: "contract",
        label: t("columns.contract"),
        /*
          ⚠ **A snapshot, never live cover.** This mirrors the contract's
          `isActive` flag and is reconciled by an hourly job, so it can lag real
          cover by up to a tick. Off by default and labelled as of the hour, so
          nobody reads it as "covered right now" — for that, read the worker's
          contract list for `phase: "InForce"`.
        */
        defaultVisible: false,
        cell: (w) => (
          <div className="flex flex-col items-start gap-px">
            <Badge
              tone={w.hasActiveContract ? "success" : "neutral"}
              className="h-[21px] rounded-md px-2 text-[11.5px]"
            >
              {w.hasActiveContract ? t("contract.covered") : t("contract.none")}
            </Badge>
            <span className="whitespace-nowrap text-[10px] text-muted-foreground">
              {t("contract.asOf")}
            </span>
          </div>
        ),
      },
    ],
    [t, tStage, tAccount, locale, now],
  );
}

/**
 * The row's own ground and rail, from the same presentation the cell reads.
 *
 * Lives beside the registry because it is the other half of the Status column:
 * §01 paints a blocked worker red down the edge of the **row**, not of one cell,
 * and tints the review queue's rows so the stage an admin acts on is findable
 * without reading the badge.
 */
export function workerRowClassName(w: WorkerRowDto): string | undefined {
  const s = workerStatusPresentation(w);
  if (s.rail === "critical") {
    return "border-l-[3px] border-l-status-cancelled";
  }
  if (s.rail === "warning") {
    return "border-l-[3px] border-l-status-pending";
  }
  if (s.isReviewQueue) {
    return "bg-status-pending-tint/25";
  }
  return undefined;
}

/**
 * A stable dot colour per profession name.
 *
 * The design gives Cleaner / Gardener / Windows / Handyman four fixed hues, none
 * of which exists on this deployment — the seeded table is `GENERAL` alone. So the
 * hue is **derived from the name** instead of enumerated: whatever professions an
 * admin creates get distinct, stable dots, and nothing has to be edited here when
 * they do. The palette is the design's four, in its order.
 */
const SKILL_HUES = ["#1C6B4C", "#2F6FED", "#12A594", "#7A5AF8", "#C2410C"];

function skillHue(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return SKILL_HUES[Math.abs(hash) % SKILL_HUES.length];
}
