"use client";

import { use, useState } from "react";
import { ArrowLeft, ShieldOff, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileViewer } from "@/components/docs-workspace/detail/file-viewer";
import { ApplicationFacts } from "@/components/agency-requests/application-facts";
import {
  DocumentRail,
  docTypeLabel,
} from "@/components/agency-requests/document-rail";
import { ReviewActions } from "@/components/agency-requests/review-actions";
import { ReviewHistory } from "@/components/agency-requests/review-history";
import { useAgencyApplication } from "@/hooks/use-agency-applications";
import { statusTone } from "@/lib/agencies/application-status";
import { applicationDocToReviewDoc } from "@/lib/agencies/application-docs";
import { getApiErrorCode } from "@/lib/http/api-error";
import { isPermissionDenied } from "@/lib/onboarding/errors";

/**
 * One application, read end to end — F-05a §6.2.
 *
 * Three regions: the paper index on the left, the paper itself in the centre, and
 * on the right the company's own words, the decision, and the record of any
 * decision already taken.
 *
 * ⚠ **The viewer's reload is a detail refetch, not an image retry.** Every read
 * mints `previewUrl`s valid about five minutes, so a pane left open stops loading
 * and the guide's own instruction is *"if a preview 404s or 401s, re-fetch the
 * detail"*. `refetch` is threaded into `FileViewer`'s `onReload` for exactly that,
 * and the fresh URL clears the broken state through the viewer's second tracker.
 */
export default function AgencyRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("agencyRequests");
  const tDocs = useTranslations("agencyRequests.docs");

  const { data, isLoading, isError, error, refetch } = useAgencyApplication(id);

  /**
   * Which paper is on screen. Local, and deliberately not derived: an admin who
   * has scrolled to the licence must not be thrown back to page one of the
   * registration certificate because a review verb rewrote the cache.
   */
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const documents = data?.documents ?? [];
  const selected =
    documents.find((d) => d.id === selectedId) ?? documents[0] ?? null;

  const backButton = (
    <Button
      variant="ghost"
      size="sm"
      nativeButton={false}
      className="-ml-2 w-fit gap-1.5"
      render={<Link href="/dashboard/agency-requests" />}
    >
      <ArrowLeft className="size-4" />
      {t("detail.back")}
    </Button>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        {backButton}
        {/* Mirrors the real three-region layout, each block a little shorter than
            what replaces it, so the page settles rather than jumping. */}
        <Skeleton className="h-10 w-72 rounded-md" />
        <div className="grid gap-5 lg:grid-cols-[14rem_minmax(0,1fr)_20rem]">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !data) {
    /**
     * Three different refusals, three different sentences.
     *
     * ⚠ A `403` here has an **empty body**, so it is recognised by status alone;
     * and unlike `GET /api/agencies/{id}`, whose `404` is bodiless, this route
     * answers `{error: "application_not_found"}` — which is what lets the missing
     * case say so rather than blaming the network.
     */
    const forbidden = isPermissionDenied(error);
    const missing = getApiErrorCode(error) === "application_not_found";

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
          {data.legalName}
        </h1>
        <Badge tone={statusTone(data.status)}>
          {t.has(`status.${data.status}`) ? t(`status.${data.status}`) : data.status}
        </Badge>
        {/* A flag beside the name, where it is read before the decision is made —
            and worded as context, never as a verdict. */}
        {data.previouslyRejectedCount > 0 ? (
          <span
            className="text-[11.5px] text-muted-foreground"
            title={t("flags.rejectedBeforeHint")}
          >
            {t("flags.rejectedBefore", { count: data.previouslyRejectedCount })}
          </span>
        ) : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-[14rem_minmax(0,1fr)_20rem]">
        <DocumentRail
          documents={data.documents}
          selectedId={selected?.id ?? null}
          onSelect={(doc) => setSelectedId(doc.id)}
        />

        <FileViewer
          doc={selected ? applicationDocToReviewDoc(selected) : null}
          /* The KYC namespace holds seven KYC types and neither of the two an
             application carries, so the label comes from this feature's own. */
          typeLabel={selected ? docTypeLabel(tDocs, selected.type) : undefined}
          /* Not "missing from storage, do not retry": here the cause is an
             expired signature and re-reading the detail is the fix. */
          brokenBody={tDocs("previewExpired")}
          onReload={() => void refetch()}
        />

        <div className="flex flex-col gap-5">
          <section className="rounded-xl bg-card p-4 shadow-card ring-1 ring-foreground/10">
            <ApplicationFacts application={data} />
          </section>

          {/*
            Above the history on purpose: the decision is what this screen is
            for, and the record of earlier decisions is context for it.

            `empty:hidden` because `ReviewActions` renders **nothing** for a role
            holding read without `agency_application:manage` — a MODERATOR, who
            can open this queue and decide none of it — and an empty card reads
            as a panel that failed to load.
          */}
          <section className="rounded-xl bg-card p-4 shadow-card ring-1 ring-foreground/10 empty:hidden">
            <ReviewActions application={data} />
          </section>

          <section className="flex flex-col gap-3 rounded-xl bg-card p-4 shadow-card ring-1 ring-foreground/10">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {t("history.heading")}
            </span>
            <ReviewHistory application={data} />
          </section>
        </div>
      </div>
    </div>
  );
}
