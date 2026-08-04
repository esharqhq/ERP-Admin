"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { contractPhasePresentation } from "@/lib/onboarding/status";
import type { ContractPhase } from "@/lib/types/onboarding.types";

/** What the form collects. Owner contracts add the four term fields; worker ones don't. */
export interface ContractFormValues {
  eligibleFrom: string;
  eligibleTo: string;
  commissionPercent: string;
  paymentOrder: string;
  generalTerms: string;
  extraClauses: string;
}

export interface ContractSummary {
  id: string;
  phase: ContractPhase;
  eligibleFrom: string;
  eligibleTo: string;
  previewUrl: string | null;
  documentUrl: string | null;
  revisionReason: string | null;
  renewalStartsAt: string | null;
}

const EMPTY: ContractFormValues = {
  eligibleFrom: "",
  eligibleTo: "",
  commissionPercent: "",
  paymentOrder: "",
  generalTerms: "",
  extraClauses: "",
};

/** A date input gives `YYYY-MM-DD`; the API rejects a naive datetime with a 500. */
export function toUtcIso(date: string, endOfDay = false): string {
  return new Date(`${date}T${endOfDay ? "23:59:59" : "00:00:00"}Z`).toISOString();
}

function isoToDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

/**
 * The left column: author the contract that actually unlocks the account.
 *
 * The form stays fillable while the admin reads the documents — that is how the work
 * is really done — but **saving and sending wait for the account-level approval**,
 * because the server refuses authoring with `409 onboarding_not_approved` for anyone
 * who isn't `Approved` or `Active`. Saying so up front beats surprising them with an
 * error after they've typed.
 */
export function ContractPanel({
  variant,
  subjectName,
  subjectContact,
  canAuthor,
  contract,
  locale,
  saving,
  sending,
  error,
  onSaveDraft,
  onSend,
  onRecall,
  onRenew,
}: {
  variant: "owner" | "worker";
  subjectName: string;
  subjectContact: string | null;
  /** True once the subject is `Approved` or `Active`. */
  canAuthor: boolean;
  /** The subject's newest contract, if they have one. */
  contract: ContractSummary | null;
  locale: string;
  saving: boolean;
  sending: boolean;
  error: string | null;
  onSaveDraft: (values: ContractFormValues, file: File | null) => void;
  onSend: (contractId: string) => void;
  onRecall: (contractId: string, reason: string) => void;
  onRenew: () => void;
}) {
  const t = useTranslations("docsWorkspace");
  // Phase labels are wire-value maps and live in the shared onboarding namespace.
  const tOnboarding = useTranslations("onboarding");
  const [values, setValues] = useState<ContractFormValues>(EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const [recalling, setRecalling] = useState(false);
  const [recallReason, setRecallReason] = useState("");

  const phase = contract?.phase ?? null;
  const isDraft = phase === null || phase === "Draft";
  const awaitingSignature = phase === "Sent";
  const live = phase === "InForce" || phase === "Scheduled";

  /**
   * Re-seed from the server on every contract change: the API **snaps**
   * `eligibleFrom` to the boundary of existing cover, so the value that comes back
   * is not always the one that was sent.
   */
  useEffect(() => {
    if (!contract) return;
    setValues((v) => ({
      ...v,
      eligibleFrom: isoToDateInput(contract.eligibleFrom),
      eligibleTo: isoToDateInput(contract.eligibleTo),
    }));
  }, [contract]);

  const set = (key: keyof ContractFormValues) => (value: string) =>
    setValues((v) => ({ ...v, [key]: value }));

  const datesValid =
    !!values.eligibleFrom && !!values.eligibleTo && values.eligibleFrom < values.eligibleTo;

  if (live && contract) {
    const p = contractPhasePresentation(contract.phase);
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-heading text-base font-semibold">{t("contract.title")}</h2>
          <Badge variant={p.variant} className={p.className}>
            {tOnboarding(`phase.${p.labelKey}`)}
          </Badge>
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">{t("contract.from")}</dt>
            <dd>{new Date(contract.eligibleFrom).toLocaleDateString(locale)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("contract.to")}</dt>
            <dd>{new Date(contract.eligibleTo).toLocaleDateString(locale)}</dd>
          </div>
        </dl>

        {contract.renewalStartsAt && (
          <p className="text-sm text-muted-foreground">
            {t("contract.continuesFrom", {
              date: new Date(contract.renewalStartsAt).toLocaleDateString(locale),
            })}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {contract.documentUrl && (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              className="gap-1.5"
              render={<a href={contract.documentUrl} target="_blank" rel="noreferrer" />}
            >
              <ExternalLink className="size-3.5" />
              {t("contract.openSigned")}
            </Button>
          )}
          <Button size="sm" onClick={onRenew}>
            {t("contract.renew")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{t("contract.renewNote")}</p>
      </div>
    );
  }

  if (awaitingSignature && contract) {
    const p = contractPhasePresentation(contract.phase);
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-heading text-base font-semibold">{t("contract.title")}</h2>
          <Badge variant={p.variant} className={p.className}>
            {tOnboarding(`phase.${p.labelKey}`)}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground">{t("contract.awaitingNote")}</p>

        <div className="flex flex-wrap gap-2">
          {contract.previewUrl && (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              className="gap-1.5"
              render={<a href={contract.previewUrl} target="_blank" rel="noreferrer" />}
            >
              <ExternalLink className="size-3.5" />
              {t("contract.openPreview")}
            </Button>
          )}
          {!recalling && (
            <Button variant="outline" size="sm" onClick={() => setRecalling(true)}>
              {t("contract.recall")}
            </Button>
          )}
        </div>

        {recalling && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="recall-reason">{t("contract.recallReason")}</Label>
            <Textarea
              id="recall-reason"
              rows={3}
              value={recallReason}
              onChange={(e) => setRecallReason(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                disabled={!recallReason.trim()}
                onClick={() => {
                  onRecall(contract.id, recallReason.trim());
                  setRecalling(false);
                  setRecallReason("");
                }}
              >
                {t("contract.recallConfirm")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setRecalling(false)}>
                {t("cancel")}
              </Button>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-base font-semibold">{t("contract.title")}</h2>
        {contract?.revisionReason && (
          <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400">
            {t("contract.sentBack")}
          </Badge>
        )}
      </div>

      <div className="rounded-lg bg-muted/50 p-3 text-sm">
        <span className="text-xs text-muted-foreground">{t("contract.for")}</span>
        <p className="font-medium">{subjectName}</p>
        {subjectContact && (
          <p className="text-xs text-muted-foreground">{subjectContact}</p>
        )}
      </div>

      {contract?.revisionReason && (
        <p className="rounded-md bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
          {contract.revisionReason}
        </p>
      )}

      {!canAuthor && (
        <p className="flex items-start gap-2 rounded-md border border-border p-3 text-sm text-muted-foreground">
          <Lock className="mt-0.5 size-4 shrink-0" />
          {t("contract.lockedNote")}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="eligible-from">{t("contract.from")}</Label>
          <Input
            id="eligible-from"
            type="date"
            value={values.eligibleFrom}
            onChange={(e) => set("eligibleFrom")(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="eligible-to">{t("contract.to")}</Label>
          <Input
            id="eligible-to"
            type="date"
            value={values.eligibleTo}
            onChange={(e) => set("eligibleTo")(e.target.value)}
          />
        </div>

        {variant === "owner" && (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="commission">{t("contract.commissionPercent")}</Label>
              <Input
                id="commission"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={values.commissionPercent}
                onChange={(e) => set("commissionPercent")(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="payment-order">{t("contract.paymentOrder")}</Label>
              <Input
                id="payment-order"
                value={values.paymentOrder}
                onChange={(e) => set("paymentOrder")(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="general-terms">{t("contract.generalTerms")}</Label>
              <Textarea
                id="general-terms"
                rows={3}
                value={values.generalTerms}
                onChange={(e) => set("generalTerms")(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="extra-clauses">{t("contract.extraClauses")}</Label>
              <Textarea
                id="extra-clauses"
                rows={3}
                value={values.extraClauses}
                onChange={(e) => set("extraClauses")(e.target.value)}
              />
            </div>
          </>
        )}

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="source-file">{t("contract.sourceFile")}</Label>
          <Input
            id="source-file"
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={!canAuthor || !datesValid || saving}
          onClick={() => onSaveDraft(values, file)}
        >
          {t("contract.saveDraft")}
        </Button>
        <Button
          disabled={!canAuthor || !contract || !isDraft || sending}
          onClick={() => contract && onSend(contract.id)}
        >
          {t("contract.send")}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{t("contract.sendNote")}</p>
    </div>
  );
}
