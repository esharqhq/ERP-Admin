"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type {
  ContractPhase,
  OnboardingStatus,
} from "@/lib/types/onboarding.types";

/** The four things that actually have to happen, in order. */
export type DocsStep = 1 | 2 | 3 | 4;

/**
 * Where this subject stands, derived from the two fields that describe it — the
 * stored `onboardingStatus` and the live `phase` of their newest contract.
 *
 * `Rejected` deliberately maps back to step 1: the subject has to edit and
 * re-submit, and no contract work is possible until they do.
 */
export function deriveStep(
  status: OnboardingStatus,
  phase: ContractPhase | null,
): DocsStep {
  if (status === "Active" || phase === "InForce" || phase === "Scheduled") return 4;
  if (status === "Contract" || phase === "Sent") return 3;
  if (status === "Approved") return 2;
  return 1;
}

const STEP_KEYS: Record<DocsStep, string> = {
  1: "documents",
  2: "contract",
  3: "awaitingSignature",
  4: "inForce",
};

/**
 * The one ornament on this screen, and it earns its place: it encodes the
 * backend's real state machine, so an admin can see why the contract form is
 * still locked without reading an error first.
 */
export function OnboardingStepper({
  current,
  rejected = false,
}: {
  current: DocsStep;
  rejected?: boolean;
}) {
  const t = useTranslations("docsWorkspace");

  return (
    <ol
      className="flex flex-wrap items-center gap-x-2 gap-y-2.5"
      aria-label={t("progress")}
    >
      {([1, 2, 3, 4] as DocsStep[]).map((step, i) => {
        const done = step < current;
        const active = step === current;
        // A rejected subject is *at* step 1, but not making progress through it.
        const tone = rejected && active;

        return (
          <li key={step} className="flex items-center gap-2">
            {/* Filled forest for the step you are on, a tick for the ones behind,
                a hairline ring for the ones ahead — the design's three states. */}
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors",
                done && "bg-primary text-primary-foreground",
                active && !tone && "bg-primary text-primary-foreground",
                tone && "bg-status-cancelled-tint text-status-cancelled",
                !done && !active && "bg-card text-muted-foreground ring-1 ring-inset ring-border",
              )}
              aria-current={active ? "step" : undefined}
            >
              {done ? <Check className="size-3.5" strokeWidth={2.8} /> : step}
            </span>
            <span
              className={cn(
                "text-[13px]",
                active || done
                  ? "font-semibold text-foreground"
                  : "font-medium text-muted-foreground",
              )}
            >
              {t(`steps.${STEP_KEYS[step]}`)}
            </span>
            {i < 3 && (
              <span
                aria-hidden
                className={cn(
                  "mx-3 hidden h-px w-11 sm:block",
                  done ? "bg-primary/40" : "bg-border",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
