"use client";

import { useState, type ReactNode } from "react";
import {
  CheckCircle2, Gavel, Loader2, MessageSquarePlus, ShieldCheck,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DayControl } from "@/components/ui/date-range-field";
import { AgencyEditDialog } from "@/components/agencies/agency-edit-dialog";
import { DuplicateEmailPanel } from "@/components/agency-requests/duplicate-email-panel";
import {
  useApproveApplication,
  useRejectApplication,
  useRequestInfo,
} from "@/hooks/use-agency-applications";
import { useAgencies, useUpdateAgency } from "@/hooks/use-agencies";
import { useCurrentPermissions } from "@/hooks/use-current-permissions";
import { canReview, isTerminal } from "@/lib/agencies/application-status";
import { applicationErrorKey } from "@/lib/agencies/application-errors";
import { agencyErrorKey } from "@/lib/agencies/errors";
import type {
  AgencyApplicationDetailDto,
  UpdateAgencyRequest,
} from "@/lib/types/agency.types";

const MAX_TEXT = 2000;

/**
 * The three verbs, the duplicate panel, and the handoff that follows an approve.
 *
 * ⚠ **Approve creates the login and does not open access.** `signedOn` is what
 * the server re-reads on every sign-in, so an approved agency with no dates sits
 * at `AwaitingContract` and is refused — which is why the success state offers the
 * edit dialog rather than saying "done". Sending no dates from here is the
 * **normal** case: the paper contract usually comes back later.
 *
 * ⚠ **Cancelling that handoff is a legitimate outcome, not a failure.** The
 * agency waits at `AwaitingContract`, which is a working state, so closing the
 * dialog neither warns nor retries.
 */
export function ReviewActions({
  application,
}: {
  application: AgencyApplicationDetailDto;
}) {
  const t = useTranslations("agencyRequests");
  const tErrors = useTranslations("agencyRequests.errors");
  const tAgencyErrors = useTranslations("agencies.errors");
  const tForm = useTranslations("agencies.form");

  /**
   * Three separate grants, and they come apart on a custom role.
   *
   * - `agency_application:manage` (170006) — the three verbs.
   * - `agency:read` (170002) — what `useAgencies` calls, and the only way to find
   *   the row approve just created.
   * - `agency:update` (170007) — what the edit dialog's **save** answers to.
   *
   * ⚠ The handoff is gated on `agency:update`, not on manage: a role holding
   * manage alone would otherwise get a fully rendered contract form whose save
   * takes a bodiless `403` with nothing to render.
   */
  const { permissions } = useCurrentPermissions();
  const canManage =
    permissions !== null && permissions.has("agency_application:manage");
  const canReadAgencies = permissions !== null && permissions.has("agency:read");
  const canSetDates = permissions !== null && permissions.has("agency:update");

  const requestInfo = useRequestInfo(application.id);
  const reject = useRejectApplication(application.id);
  const approve = useApproveApplication(application.id);

  const [open, setOpen] = useState<"info" | "reject" | "approve" | null>(null);
  const [text, setText] = useState("");
  const [signedOn, setSignedOn] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [blocking, setBlocking] = useState<
    { id: string; legalName: string } | undefined
  >(undefined);
  const [duplicate, setDuplicate] = useState(false);

  /** Set the moment approve succeeds, so the handoff survives a list refetch. */
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [datesOpen, setDatesOpen] = useState(false);
  const [datesError, setDatesError] = useState<string | null>(null);

  const agencies = useAgencies(canReadAgencies && createdId !== null);
  const created = createdId
    ? (agencies.data ?? []).find((a) => a.id === createdId)
    : undefined;
  const update = useUpdateAgency(createdId ?? "");

  function message(err: unknown): string {
    const { key, detail } = applicationErrorKey(err);
    return key === "generic" && detail ? detail : tErrors(key);
  }

  function close() {
    setOpen(null);
    setText("");
    setSignedOn("");
    setValidUntil("");
    setError(null);
    setBlocking(undefined);
    setDuplicate(false);
  }

  /**
   * The duplicate panel's next step: the reject dialog, with the blocking
   * company's name already in the reason. Pre-filled rather than auto-sent — the
   * admin is the one making the call, and the note is what the applicant reads.
   */
  function rejectAsDuplicate() {
    const name = blocking?.legalName;
    setDuplicate(false);
    setError(null);
    setText(name ? t("duplicate.title") + " — " + name : t("duplicate.title"));
    setOpen("reject");
  }

  const trimmed = text.trim();

  // ── Terminal ────────────────────────────────────────────────────────────────
  if (isTerminal(application.status) && createdId === null) {
    const approved = application.status === "Approved";
    return (
      <div className="flex flex-col gap-2.5">
        <span className="flex items-center gap-1.5 text-[12.5px] font-semibold">
          <CheckCircle2 aria-hidden className="size-4 shrink-0" />
          {approved ? t("terminal.approvedTitle") : t("terminal.rejectedTitle")}
        </span>
        {approved ? (
          <p className="text-[12.5px] leading-snug text-muted-foreground text-pretty">
            {t("terminal.approvedBody")}
          </p>
        ) : null}
        {/* Only where there is somewhere to go: the list, searched to the one row
            — there is no agency detail route yet. */}
        {approved && application.createdAgencyId ? (
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            className="w-fit"
            render={
              <Link
                href={`/dashboard/agencies?q=${encodeURIComponent(application.legalName)}`}
              />
            }
          >
            {t("terminal.openAgency")}
          </Button>
        ) : null}
      </div>
    );
  }

  // ── Just approved: the contract-dates handoff ───────────────────────────────
  if (createdId !== null) {
    return (
      <div className="flex flex-col gap-2.5">
        <span className="flex items-center gap-1.5 text-[12.5px] font-semibold">
          <ShieldCheck aria-hidden className="size-4 shrink-0" />
          {t("approve.accountCreatedTitle")}
        </span>
        <p className="text-[12.5px] leading-snug text-muted-foreground text-pretty">
          {t("approve.accountCreatedBody")}
        </p>

        {/*
          Three outcomes, and each is a real state rather than a fallback:

          - the row is here and this admin may save it → offer the dates;
          - the list is still in flight → a spinner, never a dead button;
          - the read is refused or `agency:update` is missing → the message alone,
            which is the whole truth for that role.
        */}
        {canSetDates && canReadAgencies ? (
          created ? (
            <Button size="sm" className="w-fit" onClick={() => setDatesOpen(true)}>
              {t("approve.openDates")}
            </Button>
          ) : agencies.isLoading ? (
            <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <Loader2 aria-hidden className="size-3.5 animate-spin" />
              {t("approve.openDates")}
            </span>
          ) : null
        ) : null}

        <Button
          variant="ghost"
          size="sm"
          className="w-fit"
          onClick={() => setCreatedId(null)}
        >
          {t("approve.later")}
        </Button>

        {created && datesOpen ? (
          <AgencyEditDialog
            open
            agency={created}
            pending={update.isPending}
            error={datesError}
            onClose={() => {
              setDatesError(null);
              setDatesOpen(false);
            }}
            onSubmit={(body: UpdateAgencyRequest) => {
              setDatesError(null);
              update.mutate(body, {
                onSuccess: () => {
                  setDatesOpen(false);
                  setCreatedId(null);
                },
                onError: (err) => {
                  const { key, detail } = agencyErrorKey(err);
                  setDatesError(
                    key === "generic" && detail ? detail : tAgencyErrors(key),
                  );
                },
              });
            }}
          />
        ) : null}
      </div>
    );
  }

  if (!canReview(application.status, canManage)) return null;

  return (
    <div className="flex flex-col gap-2.5">
      {duplicate ? (
        <DuplicateEmailPanel
          blocking={blocking}
          onRejectAsDuplicate={rejectAsDuplicate}
        />
      ) : null}

      <div className="flex flex-col gap-2">
        <Button size="sm" onClick={() => setOpen("approve")}>
          <Gavel className="size-3.5" />
          {t("verbs.approve")}
        </Button>
        {/* ⚠ Offered on `InfoRequested` too: asking twice replaces the note and
            re-stamps the reviewer, which is a legitimate second ask. */}
        <Button variant="outline" size="sm" onClick={() => setOpen("info")}>
          <MessageSquarePlus className="size-3.5" />
          {t("verbs.requestInfo")}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setOpen("reject")}>
          {t("verbs.reject")}
        </Button>
      </div>

      {/* ── Request info ─────────────────────────────────────────────────────── */}
      <VerbDialog
        open={open === "info"}
        onClose={close}
        title={t("verbs.requestInfoTitle")}
        description={t("verbs.requestInfoHint")}
        confirmLabel={t("verbs.requestInfo")}
        // Refused here rather than by the server: `400 note_required` is a round
        // trip spent learning a box is empty.
        disabled={trimmed.length === 0}
        pending={requestInfo.isPending}
        error={error}
        onConfirm={() => {
          setError(null);
          requestInfo.mutate(
            { text: trimmed },
            { onSuccess: close, onError: (err) => setError(message(err)) },
          );
        }}
      >
        <TextField
          label={t("verbs.requestInfoField")}
          value={text}
          onChange={setText}
        />
      </VerbDialog>

      {/* ── Reject ───────────────────────────────────────────────────────────── */}
      <VerbDialog
        open={open === "reject"}
        onClose={close}
        title={t("verbs.rejectTitle")}
        confirmLabel={t("verbs.reject")}
        destructive
        disabled={trimmed.length === 0}
        pending={reject.isPending}
        error={error}
        onConfirm={() => {
          setError(null);
          reject.mutate(
            { text: trimmed },
            { onSuccess: close, onError: (err) => setError(message(err)) },
          );
        }}
      >
        <TextField label={t("verbs.rejectField")} value={text} onChange={setText} />
      </VerbDialog>

      {/* ── Approve ──────────────────────────────────────────────────────────── */}
      <VerbDialog
        open={open === "approve"}
        onClose={close}
        title={t("verbs.approveTitle")}
        description={t("verbs.approveHint")}
        confirmLabel={t("verbs.approveConfirm")}
        pending={approve.isPending}
        error={error}
        onConfirm={() => {
          setError(null);
          approve.mutate(
            {
              // All three optional, and omitted rather than sent empty: `""` is a
              // value the server would have to parse as a date.
              ...(signedOn ? { signedOn } : {}),
              ...(validUntil ? { validUntil } : {}),
              ...(trimmed ? { note: trimmed } : {}),
            },
            {
              onSuccess: (detail) => {
                close();
                setCreatedId(detail.createdAgencyId);
              },
              onError: (err) => {
                const { key, blocking: agency } = applicationErrorKey(err);
                if (key === "emailTaken") {
                  // A screen, not a sentence — the dialog closes and the panel
                  // takes over, because the next step is a different decision.
                  setOpen(null);
                  setBlocking(agency);
                  setDuplicate(true);
                  return;
                }
                setError(message(err));
              },
            },
          );
        }}
      >
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Labelled label={tForm("signedOn")}>
              <DayControl
                variant="field"
                label={tForm("signedOn")}
                value={signedOn}
                onChange={setSignedOn}
              />
            </Labelled>
            <Labelled label={tForm("validUntil")}>
              <DayControl
                variant="field"
                label={tForm("validUntil")}
                value={validUntil}
                onChange={setValidUntil}
              />
            </Labelled>
          </div>
          {/* The same sentence the edit form carries, because it is the same two
              dates deciding the same thing. */}
          <p className="text-[11.5px] leading-snug text-muted-foreground text-pretty">
            {tForm("contractNote")}
          </p>
          <TextField
            label={t("verbs.approveNote")}
            value={text}
            onChange={setText}
          />
        </div>
      </VerbDialog>
    </div>
  );
}

/**
 * A confirm dialog with a body. `ConfirmDialog` has no children slot and each of
 * these needs at least a textarea, so the shape is composed here rather than a
 * shared component being widened for one screen.
 */
function VerbDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  destructive,
  disabled,
  pending,
  error,
  onConfirm,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  confirmLabel: string;
  destructive?: boolean;
  disabled?: boolean;
  pending: boolean;
  error?: string | null;
  onConfirm: () => void;
  children: ReactNode;
}) {
  const tCommon = useTranslations("common");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      {/* ⚠ `sm:max-w-lg`: `DialogContent`'s own class ends `sm:max-w-sm`, so an
          unprefixed width loses above 640px. */}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        {children}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            {tCommon("cancel")}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={pending || disabled}
          >
            {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Labelled label={label}>
      <Textarea
        value={value}
        maxLength={MAX_TEXT}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-24 text-sm"
      />
    </Labelled>
  );
}

function Labelled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-medium text-foreground/80">{label}</span>
      {children}
    </label>
  );
}
