"use client";

import { useTranslations } from "next-intl";
import { Ban, Check, Shield } from "lucide-react";
import type { LeaveScope } from "@/lib/leave/scope";

interface Props {
  scope: LeaveScope;
  isLoading: boolean;
  /** A group target has nothing to pre-check even when the scope resolves. */
  isGroup: boolean;
}

/**
 * The two refusals that only ever spoke as a 400 after the click, checked before it.
 *
 * Deliberately asymmetric, because the backend is: a `Task` target re-runs two
 * gates the client can read off the task, so both can be settled here. A
 * `TaskGroup` target has exactly one gate — `no_active_enrolment` — and
 * `TaskGroupDto.isEnrolled` is neutral `true` at admin call sites, so there is
 * nothing to read. That case gets a plain statement, never a green tick: a tick
 * we cannot back is worse than no tick.
 */
export function LeaveGates({ scope, isLoading, isGroup }: Props) {
  const t = useTranslations("leave");

  if (isLoading) return null;

  // The group did not load. On a Task target that means the two checks could not
  // run — say so, rather than leaving an enabled Approve with nothing beside it.
  if (!scope.resolved) {
    if (isGroup) return null;
    return (
      <div className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2">
        <Shield className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {t("gates.unchecked")}
        </p>
      </div>
    );
  }

  if (!scope.gatesPrecheckable) {
    return (
      <div className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2">
        <Shield className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {t("gates.groupServerSide")}
        </p>
      </div>
    );
  }

  if (scope.blockers.length === 0) {
    return (
      <div className="flex items-start gap-2 rounded-lg bg-primary/5 px-3 py-2">
        <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
        <p className="text-[11px] leading-relaxed text-primary">
          {t("gates.taskClear")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {scope.blockers.map((code) => (
        <div
          key={code}
          className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2"
        >
          <Ban className="mt-0.5 size-3.5 shrink-0 text-destructive" />
          <p className="text-[11px] font-medium leading-relaxed text-destructive">
            {t(`errors.${code}`)}
          </p>
        </div>
      ))}
    </div>
  );
}
