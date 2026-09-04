"use client";

import { useState } from "react";
import {
  ExternalLink,
  EyeOff,
  FileText,
  RotateCw,
  TriangleAlert,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/components/docs-workspace/queue-cells";
import { resolveFileUrl } from "@/lib/http/files";
import { viewerKind } from "@/lib/onboarding/doc-set";
import type { ReviewDoc } from "@/lib/types/review-doc.types";
import { cn } from "@/lib/utils";

/**
 * The file being read — the centre column, and the reason the screen is laid out
 * the way it is.
 *
 * **Bounded height, not viewport-locked.** The dashboard shell is `min-h-svh`, so
 * there is no definite height for a percentage child to resolve against, and a
 * `calc(100svh - …)` would hardcode a header height that changes when it wraps.
 * The page scrolls; this pane owns a tall, capped box and scrolls inside it. Same
 * resolution as commit 28affcf, which fixed wide tables by letting the inset
 * shrink rather than by locking a height.
 */
export function FileViewer({ doc }: { doc: ReviewDoc | null }) {
  const t = useTranslations("docsWorkspace.detail");
  const locale = useLocale();

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [broken, setBroken] = useState(false);

  /**
   * A new file starts fresh — carrying a 200% zoom from the last document over to
   * this one shows an admin the middle of a page they have not seen the top of.
   *
   * Adjusted **during render** rather than in an effect: React re-runs the
   * component immediately with the new values, so nothing is ever painted at the
   * previous file's zoom and then corrected.
   */
  const [shownId, setShownId] = useState(doc?.id ?? null);
  if ((doc?.id ?? null) !== shownId) {
    setShownId(doc?.id ?? null);
    setZoom(1);
    setRotation(0);
    setBroken(false);
  }

  if (!doc) {
    return (
      <Frame>
        <Empty
          icon={<FileText className="size-5" />}
          title={t("viewerNoneTitle")}
          body={t("viewerNoneBody")}
        />
      </Frame>
    );
  }

  const kind = viewerKind(doc.fileName, doc.fileUrl);
  const url = resolveFileUrl(doc.fileUrl);
  /**
   * Zoom and rotate exist for an image and not for a PDF. A PDF renders inside
   * the browser's own viewer, which owns its zoom and cannot be driven from
   * outside it — the controls would be furniture that does nothing. The design
   * draws them on a PDF; drawing dead buttons is the worse of the two errors.
   */
  const canTransform = kind === "image" && !broken;

  return (
    <Frame>
      <header className="flex h-[50px] shrink-0 items-center gap-2.5 border-b border-border/60 px-3.5">
        <div className="flex min-w-0 flex-1 flex-col gap-px">
          <span className="truncate text-[13.5px] font-semibold leading-tight">
            {t(`type.${doc.type ?? "Other"}` as "type.Passport")}
          </span>
          <span className="flex min-w-0 items-baseline gap-2">
            <span
              className="truncate font-mono text-[10.5px] text-muted-foreground"
              title={doc.fileName ?? undefined}
            >
              {doc.fileName ?? "—"}
            </span>
            <span className="shrink-0 text-[10.5px] text-ink-soft">
              {t("uploadedOn", { date: formatDate(doc.createdAt, locale) })}
            </span>
          </span>
        </div>

        {canTransform && (
          <div className="flex shrink-0 items-center gap-0.5 rounded-[9px] bg-muted p-0.5">
            <IconStep
              label={t("zoomOut")}
              onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}
              disabled={zoom <= 0.5}
            >
              <ZoomOut className="size-[15px]" />
            </IconStep>
            <span className="min-w-[38px] text-center font-mono text-[11.5px] tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
            <IconStep
              label={t("zoomIn")}
              onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}
              disabled={zoom >= 3}
            >
              <ZoomIn className="size-[15px]" />
            </IconStep>
            <span aria-hidden className="mx-0.5 h-4 w-px bg-border" />
            <IconStep
              label={t("rotate")}
              onClick={() => setRotation((r) => (r + 90) % 360)}
            >
              <RotateCw className="size-[15px]" />
            </IconStep>
          </div>
        )}

        {url && (
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            className="h-[30px] shrink-0 gap-1.5 rounded-[9px] px-2.5 text-[12.5px]"
            render={<a href={url} target="_blank" rel="noreferrer" />}
          >
            <ExternalLink className="size-3.5" />
            {t("openOriginal")}
          </Button>
        )}
      </header>

      {/*
        A tall, capped box rather than a share of the viewport. `min-h` keeps a
        one-page scan from collapsing to nothing; `max-h` keeps a long PDF from
        pushing the decision block below the fold on a laptop.
      */}
      <div className="scrollbar-slim flex min-h-[26rem] max-h-[calc(100svh-18rem)] flex-1 items-center justify-center overflow-auto bg-muted/60 p-4">
        {broken || !url ? (
          <Empty
            icon={<TriangleAlert className="size-5" />}
            title={t("viewerBrokenTitle")}
            body={t("viewerBrokenBody")}
          />
        ) : kind === "unsupported" ? (
          <Empty
            icon={<EyeOff className="size-5" />}
            title={t("viewerUnsupportedTitle")}
            body={t("viewerUnsupportedBody")}
          />
        ) : kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={doc.fileName ?? ""}
            onError={() => setBroken(true)}
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
              transformOrigin: "center",
            }}
            className="max-h-full max-w-full object-contain shadow-lg transition-transform"
          />
        ) : (
          /*
            An iframe cannot report a cross-origin load failure, so a missing PDF
            shows the browser's own error inside this frame rather than the panel
            above. Accepted rather than papered over: the alternative is a
            probe-then-render that delays every good file to catch a rare bad one,
            and "Open original" is beside it either way.
          */
          <iframe
            src={url}
            title={doc.fileName ?? t("filesTitle")}
            className="size-full min-h-[24rem] rounded-md bg-card shadow-lg"
          />
        )}
      </div>
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl bg-card shadow-card ring-1 ring-foreground/10">
      {children}
    </div>
  );
}

function Empty({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-card text-muted-foreground ring-1 ring-foreground/10">
        {icon}
      </span>
      <p className="text-sm font-semibold">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground text-pretty">{body}</p>
    </div>
  );
}

function IconStep({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex size-7 items-center justify-center rounded-[7px] transition-colors",
        disabled
          ? "text-muted-foreground/40"
          : "text-foreground/80 hover:bg-card hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
