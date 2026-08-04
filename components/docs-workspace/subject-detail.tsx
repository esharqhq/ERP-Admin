"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { onboardingStatusPresentation } from "@/lib/onboarding/status";
import type { OnboardingStatus } from "@/lib/types/onboarding.types";
import {
  OnboardingStepper,
  type DocsStep,
} from "@/components/docs-workspace/onboarding-stepper";

/**
 * The shell both Docs detail screens share: who the subject is, where they are in
 * the machine, and the two working columns.
 *
 * The split is 70/30 at `lg` and above. Below that it stacks with **documents
 * first** — they get read before the contract gets written, so on a narrow screen
 * that is the order the work happens in.
 */
export function SubjectDetail({
  backHref,
  backLabel,
  name,
  contact,
  status,
  step,
  contract,
  documents,
}: {
  backHref: string;
  backLabel: string;
  name: string;
  contact: string | null;
  status: OnboardingStatus;
  step: DocsStep;
  /** Left column, 70%. */
  contract: ReactNode;
  /** Right column, 30% — first in the DOM order below `lg`. */
  documents: ReactNode;
}) {
  const t = useTranslations("onboarding");
  const presentation = onboardingStatusPresentation(status);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Button
          size="sm"
          variant="ghost"
          nativeButton={false}
          className="w-fit gap-1.5 text-muted-foreground"
          render={<Link href={backHref} />}
        >
          <ArrowLeft className="size-3.5" />
          {backLabel}
        </Button>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h1 className="font-heading text-2xl font-bold leading-tight tracking-tight">
              {name}
            </h1>
            {contact && (
              <p className="text-sm text-muted-foreground">{contact}</p>
            )}
          </div>
          <Badge variant={presentation.variant} className={presentation.className}>
            {t(`status.${presentation.labelKey}`)}
          </Badge>
        </div>
      </div>

      <Card>
        <CardContent className="py-4">
          <OnboardingStepper current={step} rejected={status === "Rejected"} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[7fr_3fr]">
        {/* Documents come first in source order so a narrow viewport reads them first;
            `lg:order-*` puts the contract back on the left on wide screens. */}
        <Card className="lg:order-2">
          <CardContent className="py-5">{documents}</CardContent>
        </Card>
        <Card className="lg:order-1">
          <CardContent className="py-5">{contract}</CardContent>
        </Card>
      </div>
    </div>
  );
}
