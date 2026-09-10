"use client";

import { use } from "react";
import { ArrowLeft, ShieldOff, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ClaimPanel } from "@/components/skill-requests/claim-panel";
import { DecisionActions } from "@/components/skill-requests/decision-actions";
import { SkillRequestStatusBadge } from "@/components/skill-requests/status-badge";
import { WorkerPanel } from "@/components/skill-requests/worker-panel";
import { useSkillRequest } from "@/hooks/use-skill-requests";
import { getApiErrorCode } from "@/lib/http/api-error";
import { isPermissionDenied } from "@/lib/onboarding/errors";

/**
 * One skill request, read end to end — F-06a §8. A single call carries the claim,
 * the worker, the skills they already hold and a three-number history summary.
 *
 * It is a **route** rather than a pane because the bell deep-links straight to a
 * request id: types 62 (`SkillRequestSubmitted`) and 66 (`SkillRequestResponded`)
 * both reach an admin carrying `entityType: "WorkerProfessionRequest"` and this id,
 * so an addressable URL is what the notification needs to land on.
 */
export default function SkillRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("skillRequests");

  const { data, isLoading, isError, error } = useSkillRequest(id);

  const backButton = (
    <Button
      variant="ghost"
      size="sm"
      nativeButton={false}
      className="-ml-2 w-fit gap-1.5"
      render={<Link href="/dashboard/skill-requests" />}
    >
      <ArrowLeft className="size-4" />
      {t("detail.back")}
    </Button>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        {backButton}
        {/* Mirrors the real layout, each block a little shorter than what replaces
            it, so the page settles rather than jumping. */}
        <Skeleton className="h-9 w-64 rounded-md" />
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    /**
     * Three different refusals, three different sentences.
     *
     * ⚠ A `403` here has an **empty body**, so it is recognised by status alone.
     * The missing case is separate because this route does answer
     * `{error: "skill_request_not_found"}` — which is also what an id belonging to
     * nobody returns, deliberately indistinguishable from a deleted one.
     */
    const forbidden = isPermissionDenied(error);
    const missing = getApiErrorCode(error) === "skill_request_not_found";

    return (
      <div className="flex flex-col gap-5">
        {backButton}
        <div className="flex flex-col items-start gap-2 rounded-xl bg-card p-6 shadow-card ring-1 ring-foreground/10">
          <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            {forbidden ? (
              <ShieldOff className="size-5" />
            ) : (
              <TriangleAlert className="size-5" />
            )}
          </span>
          <p className="text-sm font-semibold">
            {forbidden
              ? t("detail.forbiddenTitle")
              : missing
                ? t("detail.notFoundTitle")
                : t("detail.errorTitle")}
          </p>
          <p className="max-w-md text-sm text-muted-foreground text-pretty">
            {forbidden
              ? t("detail.forbiddenBody")
              : missing
                ? t("detail.notFoundBody")
                : t("detail.errorBody")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex grow flex-col gap-5">
      {backButton}

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-2xl font-bold leading-tight tracking-tight">
          {/* The worker, not the skill: an admin arrives here asking "should this
              person have it", and the skill is the first row of the claim panel. */}
          {data.worker.fullName}
        </h1>
        <SkillRequestStatusBadge status={data.request.status} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex flex-col gap-5 rounded-xl bg-card p-5 shadow-card ring-1 ring-foreground/10 sm:p-6">
          <ClaimPanel request={data.request} />
          <DecisionActions detail={data} />
        </div>

        <div className="rounded-xl bg-card p-5 shadow-card ring-1 ring-foreground/10 sm:p-6">
          <WorkerPanel
            worker={data.worker}
            heldSkills={data.heldSkills}
            history={data.history}
          />
        </div>
      </div>
    </div>
  );
}
