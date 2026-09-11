"use client";

import { useState } from "react";
import { MailPlus, MoreHorizontal, Pencil, Trash2, Users } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Can } from "@/components/auth/can";
import { ConfirmDialog } from "@/components/tasks/confirm-dialog";
import { AgencyEditDialog } from "@/components/agencies/agency-edit-dialog";
import {
  useDeleteAgency,
  useResendAgencyInvite,
  useUpdateAgency,
} from "@/hooks/use-agencies";
import { agencyErrorKey } from "@/lib/agencies/errors";
import type { AgencyDto, UpdateAgencyRequest } from "@/lib/types/agency.types";

/**
 * Their workers · edit · re-send invitation · delete.
 *
 * ⚠ **Each entry is behind its own `Can`.** Delete is gated on `agency:create`
 * (170001) rather than a delete permission — there is no `agency:delete` code —
 * and a missing grant answers a **bodiless `403`** with nothing to render, so the
 * decision has to be made before the click rather than reported after it.
 *
 * ⚠ **"Their workers" is a link, not a detail route.** There is no agency detail
 * page; the workers table already filters on `?agencyId=`, so the roster is a
 * filter away and this entry is the only thing that was missing. `agencySource`
 * is deliberately NOT in the query: `reconcileAgencyFilters` only ever clears an
 * `Independent` that contradicts a named agency, and a named agency already
 * implies "via agency" on the wire.
 *
 * ⚠ Gated on `worker:list` — the grant that page itself needs — so the entry is
 * absent rather than a click into a forbidden screen.
 */
export function AgencyActions({ agency }: { agency: AgencyDto }) {
  const t = useTranslations("agencies");
  const tErrors = useTranslations("agencies.errors");

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [resendOpen, setResendOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = useUpdateAgency(agency.id);
  const remove = useDeleteAgency();
  const resend = useResendAgencyInvite();

  /**
   * Wire code → sentence. `detail` is the server's own field message, which only
   * arrives for problem-details — where there is no code at all and our generic
   * string would otherwise swallow the one useful line.
   */
  function message(err: unknown): string {
    const { key, detail } = agencyErrorKey(err);
    return key === "generic" && detail ? detail : tErrors(key);
  }

  function close(setter: (v: boolean) => void) {
    setError(null);
    setter(false);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" aria-label={t("columns.actions")}>
              <MoreHorizontal className="size-4" />
            </Button>
          }
        />
        {/* ⚠ Explicit width. The default is `w-(--anchor-width) min-w-32` and the
            anchor is a 36px icon button, so every label here wrapped onto two
            lines at 8rem. */}
        <DropdownMenuContent align="end" className="w-52">
          <Can permission="worker:list">
            <DropdownMenuItem
              render={<Link href={`/dashboard/workers?agencyId=${agency.id}`} />}
            >
              <Users className="size-4" />
              {t("workers.action")}
            </DropdownMenuItem>
          </Can>
          <Can permission="agency:update">
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" />
              {t("edit.action")}
            </DropdownMenuItem>
          </Can>
          <Can permission="agency:create">
            <DropdownMenuItem onClick={() => setResendOpen(true)}>
              <MailPlus className="size-4" />
              {t("resend.action")}
            </DropdownMenuItem>
          </Can>
          {/* ⚠ `agency:create`, not a delete permission. */}
          <Can permission="agency:create">
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="size-4" />
              {t("delete.action")}
            </DropdownMenuItem>
          </Can>
        </DropdownMenuContent>
      </DropdownMenu>

      {editOpen && (
        <AgencyEditDialog
          open
          agency={agency}
          onClose={() => close(setEditOpen)}
          pending={update.isPending}
          error={error}
          onSubmit={(body: UpdateAgencyRequest) => {
            setError(null);
            update.mutate(body, {
              onSuccess: () => close(setEditOpen),
              onError: (err) => setError(message(err)),
            });
          }}
        />
      )}

      {/* ⚠ Soft delete: it releases the login email, so the same company can come
          back as a NEW row with a fresh invitation and no contract dates. The
          worker links survive and stay on the Agency links screen. */}
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => close(setDeleteOpen)}
        onConfirm={() => {
          setError(null);
          remove.mutate(agency.id, {
            onSuccess: () => close(setDeleteOpen),
            onError: (err) => setError(message(err)),
          });
        }}
        isPending={remove.isPending}
        title={t("delete.title")}
        description={`${t("delete.body")} ${t("delete.hint")}`}
        confirmLabel={t("delete.confirm")}
        destructive
        error={error}
      />

      {/* ⚠ Re-sending invalidates the previous link — only the newest one works. */}
      <ConfirmDialog
        open={resendOpen}
        onClose={() => close(setResendOpen)}
        onConfirm={() => {
          setError(null);
          resend.mutate(agency.id, {
            onSuccess: () => close(setResendOpen),
            onError: (err) => setError(message(err)),
          });
        }}
        isPending={resend.isPending}
        title={t("resend.title")}
        description={t("resend.body")}
        confirmLabel={t("resend.confirm")}
        error={error}
      />
    </>
  );
}
