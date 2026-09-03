"use client";

import { ArrowLeft, Building2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  OnboardingStepper,
  type DocsStep,
} from "@/components/docs-workspace/onboarding-stepper";
import { onboardingStatusPresentation } from "@/lib/onboarding/status";
import type { OnboardingStatus } from "@/lib/types/onboarding.types";

/**
 * Who this is, where they are in the machine, and why the next step is locked.
 *
 * Note what is **not** here: the design draws a `4 of 12 in review` counter and a
 * prev/next pair beside it. Both need the filtered, sorted queue order carried
 * into this route, which the design's own "Confirm before build" flags — cut, and
 * tracked as ask #26. They are not to be added back just because they appear in
 * the comp.
 */
export function DetailHeader({
  backHref,
  backLabel,
  name,
  status,
  step,
  company,
  passportNumber,
  /** One line saying why the stage after this one cannot start yet. */
  lockNote,
}: {
  backHref: string;
  backLabel: string;
  name: string;
  status: OnboardingStatus;
  step: DocsStep;
  company?: string | null;
  passportNumber?: string | null;
  lockNote?: string | null;
}) {
  const t = useTranslations("onboarding");
  const presentation = onboardingStatusPresentation(status);

  return (
    <header className="flex flex-col gap-3.5">
      <Button
        size="sm"
        variant="ghost"
        nativeButton={false}
        className="-ml-2 w-fit gap-1.5 text-muted-foreground hover:text-foreground"
        render={<Link href={backHref} />}
      >
        <ArrowLeft className="size-3.5" />
        {backLabel}
      </Button>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="font-heading text-2xl font-bold leading-none tracking-[-0.025em]">
          {name}
        </h1>

        <Badge variant={presentation.variant} className={presentation.className}>
          {t(`status.${presentation.labelKey}`)}
        </Badge>

        {company && (
          <span className="flex h-6 items-center gap-1.5 rounded-full bg-muted px-2.5 text-xs font-medium text-ink-soft">
            <Building2 className="size-3.5" />
            {company}
          </span>
        )}

        {passportNumber && (
          <span className="font-mono text-xs text-muted-foreground">
            {passportNumber}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2.5">
        <OnboardingStepper current={step} rejected={status === "Rejected"} />
        {lockNote && (
          <p className="max-w-md text-xs leading-snug text-muted-foreground text-pretty sm:text-right">
            {lockNote}
          </p>
        )}
      </div>
    </header>
  );
}
