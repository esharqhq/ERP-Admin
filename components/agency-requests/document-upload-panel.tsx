"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, Paperclip, Upload } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUploadApplicationDocument } from "@/hooks/use-agency-applications";
import { applicationErrorKey } from "@/lib/agencies/application-errors";
import {
  MAX_DOCS,
  MIME_ALLOWLIST,
  preflightDocument,
} from "@/lib/agencies/application-docs";
import type {
  AgencyApplicationDocumentDto,
  AgencyApplicationDocumentType,
} from "@/lib/types/agency.types";

const TYPES = ["RegistrationCertificate", "Licence", "Other"] as const;

/** `214823` → `210 KB`. Whole units: nobody needs the decimal on a scan. */
function fileSize(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${Math.round(bytes / (1024 * 1024))} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Attaching company papers to an application, authorised by an **upload token**
 * rather than by a login.
 *
 * ⚠ **This panel owns its own list.** `documents` seeds it and nothing more: in
 * the intake dialog that prop is the create response's empty array, and the
 * mutation's `invalidateQueries` reaches observers of the detail query — which
 * this dialog does not hold, so an inactive query would only be marked stale and
 * never refetched. Deriving the list from the prop would leave it empty forever,
 * `preflightDocument`'s count at `0`, and the `MAX_DOCS` guard unable to trip.
 *
 * ⚠ **A retry starts again from presign, never from the previous `storageKey`.**
 * That is the mutation's shape, not this component's choice: a failure at the
 * upload or confirm step leaves an orphaned object and no row, there is no cleanup
 * door, and re-confirming a key whose upload failed is how `storage_key_mismatch`
 * or `file_not_found` becomes permanent.
 */
export function DocumentUploadPanel({
  applicationId,
  uploadToken,
  documents,
  onUploaded,
}: {
  applicationId: string;
  /**
   * ⚠ Passed in, never fetched. The plaintext token exists once, in the create
   * response; the row holds only a hash and there is no resend door.
   */
  uploadToken: string;
  /** Seed only — see the doc comment. */
  documents: AgencyApplicationDocumentDto[];
  /** Each confirmed document, for a caller that wants to count them. */
  onUploaded?: (doc: AgencyApplicationDocumentDto) => void;
}) {
  const t = useTranslations("agencyRequests.upload");
  const tTypes = useTranslations("agencyRequests.docs");
  const tErrors = useTranslations("agencyRequests.errors");

  const [attached, setAttached] = useState(documents);
  const [type, setType] = useState<AgencyApplicationDocumentType | "">("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useUploadApplicationDocument(applicationId);

  const full = attached.length >= MAX_DOCS;

  /*
    ⚠ `items` is not optional. Base UI's `Select.Value` renders the selected
    *value* unless the root is told how values map to labels — omitting it is what
    printed raw GUIDs in the phase-2 form.
  */
  const typeItems = TYPES.map((value) => ({
    value,
    label: tTypes.has(`type.${value}`) ? tTypes(`type.${value}`) : value,
  }));

  function pick(next: File | null) {
    setError(null);
    if (!next) return setFile(null);
    // The three refusals worth catching before a round trip. The server re-checks
    // all of them — this only spares the operator the wait.
    const verdict = preflightDocument(next, attached.length);
    if (!verdict.ok) {
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      return setError(t(`refused.${verdict.reason}`));
    }
    setFile(next);
  }

  function send() {
    if (!file || type === "") return;
    setError(null);
    upload.mutate(
      { file, type, uploadToken },
      {
        onSuccess: (doc) => {
          setAttached((prev) => [...prev, doc]);
          onUploaded?.(doc);
          setFile(null);
          setType("");
          if (inputRef.current) inputRef.current.value = "";
        },
        onError: (err) => {
          /*
            Every refusal gets its own sentence. Two are worth naming:
            `invalidToken` is worded for three indistinguishable causes (unknown
            application, wrong token, expired token), and `alreadyReviewed` means
            a colleague decided the application while this panel was open — a real
            race, and the upload can never succeed afterwards.
          */
          const { key, detail } = applicationErrorKey(err);
          setError(key === "generic" && detail ? detail : tErrors(key));
        },
      },
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <span className="flex items-center gap-1.5 text-[12.5px] font-semibold">
          <Paperclip aria-hidden className="size-3.5 shrink-0" />
          {t("heading")}
        </span>
        <span className="text-[11px] text-muted-foreground">{t("limits")}</span>
      </div>

      {full ? (
        <p className="text-[12.5px] text-muted-foreground">{t("full")}</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-foreground/80">
              {t("type")}
            </span>
            <Select
              items={typeItems}
              value={type}
              onValueChange={(v) =>
                setType((v ?? "") as AgencyApplicationDocumentType | "")
              }
            >
              {/* ⚠ `w-full`: `SelectTrigger` defaults to `w-fit`, which with an
                  empty value collapses the control to its chevron. */}
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("typePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {typeItems.map((i) => (
                  <SelectItem key={i.value} value={i.value}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <input
            ref={inputRef}
            type="file"
            // The allowlist the server enforces, so the file picker offers the
            // same set rather than letting one be chosen and then refused.
            accept={MIME_ALLOWLIST.join(",")}
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
            className="w-full cursor-pointer rounded-lg border border-input bg-transparent px-3 py-2 text-[12.5px] file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-muted file:px-2.5 file:py-1 file:text-[12px] file:font-medium hover:bg-accent/30"
          />

          <Button
            size="sm"
            className="w-fit gap-1.5"
            disabled={!file || type === "" || upload.isPending}
            onClick={send}
          >
            {upload.isPending ? (
              <Loader2 aria-hidden className="size-3.5 animate-spin" />
            ) : (
              <Upload aria-hidden className="size-3.5" />
            )}
            {upload.isPending ? t("uploading") : t("add")}
          </Button>
        </div>
      )}

      {error ? <p className="text-[12.5px] text-destructive">{error}</p> : null}

      <div className="flex flex-col gap-1.5 border-t border-border/60 pt-2.5">
        <span className="text-[11px] text-muted-foreground">
          {t("uploaded", { count: attached.length })}
        </span>
        {attached.map((doc) => (
          <span key={doc.id} className="flex min-w-0 items-center gap-2">
            <FileText aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-[12px]" title={doc.fileName}>
              {doc.fileName}
            </span>
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {tTypes.has(`type.${doc.type}`) ? tTypes(`type.${doc.type}`) : doc.type}
            </span>
            <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
              {fileSize(doc.sizeBytes)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
