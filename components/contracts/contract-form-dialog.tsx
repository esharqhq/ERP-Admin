"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpload } from "@/hooks/use-upload";
import type { ContractPeriodFields } from "@/lib/types/contract.types";

export interface ContractParty {
  id: string; // ownerUserId | workerId
  name: string;
  email: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  mode: "create" | "renew";
  /** Create mode: selectable parties. */
  parties?: ContractParty[];
  /** Renew mode: the fixed party (name shown, id used). */
  fixedParty?: { id: string; name: string };
  /** Parent mutation in-flight. */
  pending: boolean;
  /** Localized parent-mutation error. */
  error?: string | null;
  onSubmit: (partyId: string, body: ContractPeriodFields) => void;
}

function toIso(dateStr: string): string {
  return `${dateStr}T00:00:00.000Z`;
}

export function ContractFormDialog({
  open,
  onClose,
  mode,
  parties = [],
  fixedParty,
  pending,
  error,
  onSubmit,
}: Props) {
  const t = useTranslations("contracts");
  const tCommon = useTranslations("common");
  const [partyId, setPartyId] = useState(fixedParty?.id ?? "");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const upload = useUpload("contracts");
  const [uploadFailed, setUploadFailed] = useState(false);

  const datesValid = !!from && !!to && from <= to;
  const canSubmit = !!partyId && datesValid && !!file && !pending && !upload.isPending;
  const submitting = upload.isPending || pending;

  async function handleSubmit() {
    if (!canSubmit || !file) return;
    setUploadFailed(false);
    try {
      const fileUrl = await upload.mutateAsync(file);
      onSubmit(partyId, {
        eligibleFrom: toIso(from),
        eligibleTo: toIso(to),
        fileName: file.name,
        fileUrl,
      });
    } catch {
      setUploadFailed(true);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !submitting && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "renew" ? t("form.renewTitle") : t("form.createTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {mode === "renew" ? (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">{t("form.party")}</label>
              <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                {fixedParty?.name}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">{t("form.party")}</label>
              <Select
                value={partyId}
                onValueChange={(v) => setPartyId(v ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("form.selectParty")} />
                </SelectTrigger>
                <SelectContent>
                  {parties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} · {p.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">{t("form.from")}</label>
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">{t("form.to")}</label>
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>
          {from && to && from > to ? (
            <p className="text-xs text-destructive">{t("form.dateOrder")}</p>
          ) : null}

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">{t("form.file")}</label>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-input px-3 py-2 text-sm text-muted-foreground hover:bg-accent/40">
              <Upload className="size-4" />
              <span className="truncate">
                {file ? file.name : t("form.choosePdf")}
              </span>
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          {uploadFailed ? (
            <p className="text-sm text-destructive">{t("form.uploadFailed")}</p>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            {mode === "renew" ? t("form.renew") : t("form.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
