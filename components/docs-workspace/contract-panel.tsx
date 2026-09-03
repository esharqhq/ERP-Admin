"use client";

import { useCallback, useState, type ReactNode } from "react";
import { ExternalLink, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/tasks/confirm-dialog";
import { useHasPermission } from "@/hooks/use-current-permissions";
import { useSignedPdf } from "@/hooks/use-signed-pdf";
import {
  saveDraftBlocker,
  sendBlocker,
} from "@/lib/contracts/authoring-gate";
import { canTerminate } from "@/lib/contracts/registry-row";
import { contractPhasePresentation } from "@/lib/onboarding/status";
import { contractService } from "@/lib/services/contract.service";
import type {
  ContractPhase,
  OnboardingStatus,
} from "@/lib/types/onboarding.types";

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
  signedAt: string | null;
  /**
   * `null` means either "not signed yet" or "signed before F-03·3" —
   * disambiguated by `signedAt`. See `lib/types/contract.types.ts`.
   */
  signatureMethod: "Drawn" | null;
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
 * Day, abbreviated month, year — `28 Feb 2026`, `28. Feb. 2026` in German. Same
 * shape as `subject-docs-table.tsx`'s `formatDate`, kept local rather than
 * extracted: this is the only other caller. Every date this panel shows an
 * admin is a contract boundary that drives a decision — including, but not
 * limited to, the destructive-confirm dialogs — so none of them may render as
 * an all-numeric, locale-dependent date (`toLocaleDateString("en")` →
 * `12/8/2026`, genuinely ambiguous between 12 August and 8 December).
 */
function formatDate(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
  status,
  canAuthor,
  contract,
  locale,
  saving,
  sending,
  terminating,
  error,
  onSaveDraft,
  onSend,
  onRecall,
  onRenew,
  onTerminate,
}: {
  variant: "owner" | "worker";
  subjectName: string;
  subjectContact: string | null;
  /** Drives the copy that explains why the form is locked. */
  status: OnboardingStatus;
  /** True once the subject is `Approved` or `Active`. */
  canAuthor: boolean;
  /** The subject's newest contract, if they have one. */
  contract: ContractSummary | null;
  locale: string;
  saving: boolean;
  sending: boolean;
  /** Pending state of the force-deactivate mutation, owned by the page. */
  terminating: boolean;
  /**
   * Whatever the page wants shown for the current mutation error, or `null`.
   * A `ReactNode`, not a string — the page renders `<ErrorNotice>` here so its
   * `settings-link` reaction (and the server's field-level detail) reach the
   * admin, which a plain string could not carry. This component stays
   * presentational: it just places the node, twice in its own layout branches
   * (never both at once, since only one branch renders per phase), and does
   * not know or care what produced it.
   */
  error: ReactNode;
  onSaveDraft: (values: ContractFormValues, file: File | null) => void;
  onSend: (contractId: string) => void;
  onRecall: (contractId: string, reason: string) => void;
  onRenew: () => void;
  /** Force-deactivate this contract. Same endpoint whatever the phase — see `terminateCopyKind` below. */
  onTerminate: (contractId: string) => void;
}) {
  const t = useTranslations("docsWorkspace");
  // Phase labels are wire-value maps and live in the shared onboarding namespace.
  const tOnboarding = useTranslations("onboarding");
  const [values, setValues] = useState<ContractFormValues>(EMPTY);
  const [file, setFile] = useState<File | null>(null);
  const [recalling, setRecalling] = useState(false);
  const [recallReason, setRecallReason] = useState("");
  const [confirmingTerminate, setConfirmingTerminate] = useState(false);

  /**
   * One fresh read of this contract, not a list refetch — `GET
   * /api/contracts/admin/{side}/{contractId}` exists precisely for this and returns
   * one row instead of every contract in the system. Bound to `contract.id`/`variant`
   * so a renewal (a different contract id) or a side switch always reads the right row.
   */
  const rereadContract = useCallback(async () => {
    if (!contract) return null;
    return variant === "owner"
      ? contractService.getOwner(contract.id)
      : contractService.getWorker(contract.id);
  }, [contract, variant]);

  const documentPdf = useSignedPdf(
    contract?.documentUrl ?? null,
    useCallback(async () => (await rereadContract())?.documentUrl ?? null, [rereadContract]),
  );
  const previewPdf = useSignedPdf(
    contract?.previewUrl ?? null,
    useCallback(async () => (await rereadContract())?.previewUrl ?? null, [rereadContract]),
  );

  const phase = contract?.phase ?? null;
  const awaitingSignature = phase === "Sent";
  const live = phase === "InForce" || phase === "Scheduled";

  // Permission-aware, not 403-driven, AND phase-aware. Both gates, not either:
  // canTerminate is legal from Draft/Sent too (a bad contract can be withdrawn),
  // so the permission alone would over-show it on phases the backend refuses.
  const canDeactivate = useHasPermission(
    variant === "owner" ? "owner_contract:deactivate_any" : "worker_contract:deactivate_any",
  );
  const showTerminate = canDeactivate && !!contract && canTerminate(contract.phase);
  // Same endpoint, three genuinely different meanings to the admin, because
  // "ends now" is only true once cover has actually started:
  //  - InForce:            cover is live — "terminate" it early.
  //  - Scheduled:          cover hasn't started yet — nothing "ends", so this is
  //                        "cancel upcoming cover", not a terminate.
  //  - Draft / Sent:       never took effect at all — "withdraw" it.
  // Never call any of these "expired" — that's a different, later outcome the
  // backend computes on its own.
  const terminateCopyKind: "terminate" | "cancelUpcoming" | "withdraw" =
    phase === "InForce" ? "terminate" : phase === "Scheduled" ? "cancelUpcoming" : "withdraw";

  // Split in two: the button joins whatever action row is already on screen
  // (pushed to the far end of it with `ml-auto`, away from Renew/Recall/Send —
  // a destructive control immediately beside a primary one invites the wrong
  // click), while the dialog itself renders once per branch, position-independent.
  const terminateButton = showTerminate && contract && (
    <Button
      variant="outline"
      size="sm"
      className="ml-auto text-destructive hover:text-destructive"
      onClick={() => setConfirmingTerminate(true)}
    >
      {t(`contract.${terminateCopyKind}`)}
    </Button>
  );

  const terminateDialog = showTerminate && contract && (
    <ConfirmDialog
      open={confirmingTerminate}
      onClose={() => setConfirmingTerminate(false)}
      onConfirm={() => {
        onTerminate(contract.id);
        setConfirmingTerminate(false);
      }}
      isPending={terminating}
      title={t(`contract.${terminateCopyKind}Title`)}
      description={
        terminateCopyKind === "withdraw"
          ? t("contract.withdrawBody")
          : t(`contract.${terminateCopyKind}Body`, {
              // Scheduled cover never started, so the date that matters is when
              // it was due to start (eligibleFrom); live cover is ending early,
              // so the date that matters is when it was due to end (eligibleTo).
              date: formatDate(
                terminateCopyKind === "cancelUpcoming"
                  ? contract.eligibleFrom
                  : contract.eligibleTo,
                locale,
              ),
            })
      }
      confirmLabel={t("contract.terminateConfirm")}
      destructive
    />
  );

  /**
   * Re-seed the period from the server whenever it changes, because the API **snaps**
   * `eligibleFrom` to the boundary of existing cover — the value that comes back is
   * not always the one that was sent.
   *
   * Adjusted during render rather than in an effect (React's documented "adjust state
   * when a prop changes" pattern): an effect here would render the stale dates once
   * before correcting them, and `react-hooks/set-state-in-effect` rightly flags it.
   * The signature covers both cases that matter — a different contract, and the same
   * contract whose dates the server moved.
   */
  const periodSignature = contract
    ? `${contract.id}:${contract.eligibleFrom}:${contract.eligibleTo}`
    : null;
  const [seededPeriod, setSeededPeriod] = useState<string | null>(null);

  if (contract && periodSignature !== seededPeriod) {
    setSeededPeriod(periodSignature);
    setValues((v) => ({
      ...v,
      eligibleFrom: isoToDateInput(contract.eligibleFrom),
      eligibleTo: isoToDateInput(contract.eligibleTo),
    }));
  }

  const set = (key: keyof ContractFormValues) => (value: string) =>
    setValues((v) => ({ ...v, [key]: value }));

  /**
   * Not booleans any more, and not spent only on `disabled`. Straight after an
   * approval the period is empty, which leaves *both* buttons dead — and the
   * panel used to give no reason for either, so the admin's next move was a
   * guess. See `lib/contracts/authoring-gate.ts`.
   */
  const saveBlocked = saveDraftBlocker(canAuthor, values.eligibleFrom, values.eligibleTo);
  const sendBlocked = sendBlocker(canAuthor, phase);

  /**
   * One line, naming only the thing standing in the way *right now*: the save
   * blocker while there is one, the send blocker once saving is possible. Both
   * at once would be noise — you cannot act on the second until the first is
   * gone, and the pair reads as a wall rather than a next step.
   *
   * `locked` is deliberately dropped: the bordered note above already states
   * that refusal, in a sentence chosen for the specific status. Repeating it
   * here would say the same thing twice, worse the second time.
   */
  const blockedStep = saveBlocked ?? sendBlocked;
  const blockedHint = blockedStep === "locked" ? null : blockedStep;

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
            <dd className="tabular-nums">{formatDate(contract.eligibleFrom, locale)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("contract.to")}</dt>
            <dd className="tabular-nums">{formatDate(contract.eligibleTo, locale)}</dd>
          </div>
        </dl>

        {contract.renewalStartsAt && (
          <p className="text-sm text-muted-foreground">
            {t("contract.continuesFrom", {
              date: formatDate(contract.renewalStartsAt, locale),
            })}
          </p>
        )}

        {contract.signedAt && (
          <p className="text-xs text-muted-foreground">
            {t("contract.signedLine", {
              date: formatDate(contract.signedAt, locale),
              method: contract.signatureMethod
                ? t(`contract.signatureMethodLabel.${contract.signatureMethod}`)
                : t("contract.signatureMethodUnknownLabel"),
            })}
          </p>
        )}

        {/* The destructive action shares this row but sits at the far end of it:
            adjacent to Renew it would collect mis-clicks, and the gap is what
            prevents that. `ml-auto` is what puts the space there. */}
        <div className="flex flex-wrap items-center gap-2">
          {contract.documentUrl && (
            // A real <a> was traded for a click handler on purpose: the URL is
            // short-lived, so it must be resolved (and, if expired, refreshed)
            // at click time rather than baked into a static href at render time.
            // The cost is real — no more middle-click / right-click "open in new
            // tab" — and it is accepted because a stale link is worse than a lost
            // middle-click.
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={documentPdf.isOpening}
              onClick={() => documentPdf.open()}
            >
              <ExternalLink className="size-3.5" />
              {t("contract.openSigned")}
            </Button>
          )}
          <Button size="sm" onClick={onRenew}>
            {t("contract.renew")}
          </Button>
          {terminateButton}
        </div>
        {error}
        {documentPdf.missing && (
          <p role="status" className="text-sm text-destructive">
            {t("contract.pdfMissing")}
          </p>
        )}
        <p className="text-xs text-muted-foreground">{t("contract.renewNote")}</p>
        {terminateDialog}
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

        {/* Recall and withdraw are different acts and must not read as a pair:
            recall keeps the contract and asks for an edit, withdraw retires it.
            Same row, opposite ends. */}
        <div className="flex flex-wrap items-center gap-2">
          {contract.previewUrl && (
            // Same trade-off as the signed-document button below: a click handler
            // replaces the static <a>, resolving (and, if expired, refreshing) the
            // short-lived URL at click time rather than at render time, at the cost
            // of middle-click / right-click "open in new tab".
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={previewPdf.isOpening}
              onClick={() => previewPdf.open()}
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
          {terminateButton}
        </div>
        {previewPdf.missing && (
          <p role="status" className="text-sm text-destructive">
            {t("contract.pdfMissing")}
          </p>
        )}

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

        {error}
        {terminateDialog}
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
          {/* Before a submission exists there is nothing for the admin to approve, so
              telling them to approve first sends them looking for a button that is
              correctly absent. Name the real blocker instead. */}
          {status === "Kyc"
            ? t("contract.notSubmittedNote")
            : status === "Rejected"
              ? t("contract.rejectedNote")
              : t("contract.lockedNote")}
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

      {error}

      {/* Same rule as the signed-contract row: withdraw belongs in the row, at
          the far end of it, never beside Send. */}
      {/* Above the row, not below it: it is the instruction for the buttons, so
          it has to be read before they are reached. `role="status"` so the swap
          from "set the period" to "save it first" is announced when the second
          date lands, rather than silently changing under a screen reader. */}
      {blockedHint && (
        <p role="status" className="text-sm">
          {t(`contract.blocked.${blockedHint}`)}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          disabled={saveBlocked !== null || saving}
          onClick={() => onSaveDraft(values, file)}
        >
          {t("contract.saveDraft")}
        </Button>
        <Button
          disabled={sendBlocked !== null || sending}
          onClick={() => contract && onSend(contract.id)}
        >
          {t("contract.send")}
        </Button>
        {terminateButton}
      </div>
      <p className="text-xs text-muted-foreground">{t("contract.sendNote")}</p>
      {terminateDialog}
    </div>
  );
}
