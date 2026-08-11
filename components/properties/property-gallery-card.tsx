"use client";

import { useCallback, useState } from "react";
import { ChevronLeft, ChevronRight, ImageIcon, X } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLocale, useTranslations } from "next-intl";
import { usePropertyMedia } from "@/hooks/use-properties";
import { stepIndex } from "@/lib/properties/gallery";

/**
 * One row that scrolls sideways, rather than a grid that grows downwards. A
 * gallery holds up to ten photos, and any wrapping layout turns that into three
 * or four rows — enough to push the map and everything under it off the screen.
 * Here the card's height is the height of one tile, whatever the photo count.
 *
 * `snap-start` on the tiles makes a flick land on a photo edge instead of
 * halfway through one. `pb-2` reserves the scrollbar's own height so it does
 * not overlap the last row of pixels.
 */
const STRIP =
  "flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-2 " +
  // Nothing hides the scrollbar: it is the only affordance saying more photos
  // exist off to the right.
  "[scrollbar-width:thin]";

/**
 * Square, and sized so exactly three fit the visible width — the fourth peeks
 * in at the edge, which is what tells the eye it can scroll. `basis` does the
 * arithmetic: full width, minus the two gaps between three tiles, divided by
 * three. `shrink-0` stops flex from compressing them to fit instead.
 */
const TILE = "aspect-square shrink-0 basis-[calc((100%-1.25rem)/3)]";

function formatSize(bytes: number, locale: string): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toLocaleString(locale, { maximumFractionDigits: 1 })} MB`;
  return `${Math.max(1, Math.round(bytes / 1024)).toLocaleString(locale)} KB`;
}

function formatDate(iso: string, locale: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * A property's photo gallery, **read-only**.
 *
 * There is deliberately no upload control, no delete control and no empty-state
 * call to action: `property:media:upload`/`delete` are PROPERTY-scoped
 * OWNER_USER permissions with no admin branch, so an admin genuinely cannot add
 * or remove a photo here. Offering a button that always 403s, or an empty state
 * that says "add the first photo", would promise an action this screen does not
 * have.
 *
 * The images are served from an unauthenticated `/files/...` path, so a plain
 * `<img>` is all that is needed — no token, no proxying.
 */
export function PropertyGalleryCard({ propertyId }: { propertyId: string }) {
  const t = useTranslations("properties");
  const locale = useLocale();
  const { data: media = [], isLoading, isError } = usePropertyMedia(propertyId);

  /** Index into `media` of the photo being viewed, or null when closed. */
  const [openAt, setOpenAt] = useState<number | null>(null);
  const current = openAt === null ? null : (media[openAt] ?? null);

  const step = useCallback(
    (delta: number) =>
      setOpenAt((i) => (i === null ? i : stepIndex(i, delta, media.length))),
    [media.length],
  );

  /**
   * Arrow keys drive the viewer.
   *
   * Handled on the dialog rather than on `window`: the dialog's focus trap
   * consumes arrow keys before they reach the window — measured, the counter
   * did not move — but they still bubble through the React tree from whatever
   * inside the dialog holds focus, which the close button does on open.
   */
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      step(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      step(-1);
    }
  };


  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold tracking-tight">
            <ImageIcon className="size-4 text-muted-foreground" />
            {t("gallery.title")}
          </h2>
          {media.length > 0 && (
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {t("gallery.count", { count: media.length })}
            </span>
          )}
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className={STRIP}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className={`${TILE} rounded-lg`} />
              ))}
            </div>
          ) : isError ? (
            <p className="py-6 text-center text-sm text-destructive">
              {t("gallery.error")}
            </p>
          ) : media.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 py-8 text-center">
              <ImageIcon className="size-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">{t("gallery.empty")}</p>
              <p className="text-[11px] text-muted-foreground/80">
                {t("gallery.emptyHint")}
              </p>
            </div>
          ) : (
            <div className={STRIP}>
              {media.map((m, i) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setOpenAt(i)}
                  aria-label={m.originalFileName}
                  className={`${TILE} group snap-start overflow-hidden rounded-lg border border-border bg-muted outline-none transition-colors hover:border-foreground/20 focus-visible:ring-3 focus-visible:ring-ring/50`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- owner-uploaded photo on the backend's own host, same call as the chat thumbnails */}
                  <img
                    src={m.url}
                    alt={m.originalFileName}
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                  />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={current !== null} onOpenChange={(v) => !v && setOpenAt(null)}>
        <DialogContent
          className="sm:max-w-3xl"
          showCloseButton={false}
          onKeyDown={onKeyDown}
        >
          {current && openAt !== null && (
            <>
              <DialogHeader className="flex flex-row items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <DialogTitle className="truncate text-sm">
                    {current.originalFileName}
                  </DialogTitle>
                  <span className="text-[11px] text-muted-foreground">
                    {formatSize(current.fileSize, locale)} ·{" "}
                    {formatDate(current.createdAt, locale)}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <span className="mr-1 text-[11px] tabular-nums text-muted-foreground">
                    {openAt + 1} / {media.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOpenAt(null)}
                    aria-label={t("gallery.close")}
                    className="-mt-1 -mr-1 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </DialogHeader>

              {/* A square frame, like the thumbnails. It is also what stops the
                  dialog resizing under the cursor when stepping between a
                  portrait and a landscape photo — the frame is fixed and the
                  photo fits inside it.

                  `max-w` rather than `max-h` caps the size: with `aspect-square`
                  a max-height leaves the width at 100% and the box stops being
                  square, whereas bounding the width bounds both. */}
              <div className="relative mx-auto aspect-square w-full max-w-[70vh] overflow-hidden rounded-lg bg-muted">
                {/* `object-contain`, never `cover`: this is the view where the
                    whole photo has to be visible, so letterboxing beats cropping. */}
                {/* eslint-disable-next-line @next/next/no-img-element -- full-size preview of the same photo */}
                <img
                  src={current.url}
                  alt={current.originalFileName}
                  className="size-full object-contain"
                />
                {media.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => step(-1)}
                      aria-label={t("gallery.previous")}
                      className="absolute top-1/2 left-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/85 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background"
                    >
                      <ChevronLeft className="size-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => step(1)}
                      aria-label={t("gallery.next")}
                      className="absolute top-1/2 right-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/85 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background"
                    >
                      <ChevronRight className="size-5" />
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
