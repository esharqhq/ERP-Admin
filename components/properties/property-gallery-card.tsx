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
/**
 * A grid, four across, which is the layout `Uyer-Admin-Properties.dc.html`
 * defaults to (it offers `Strip` as the alternative). A grid also carries a date
 * under each photo without a second row of chrome, which the design draws and the
 * attention band's "newest photo is N months old" needs a reader to be able to
 * check.
 *
 * ⚠ The strip this replaced was `flex` with no `items-start`, which silently
 * defeated `aspect-square`: a stretched flex item's cross size is imposed by the
 * container, so every tile took the tallest photo's natural height and the shorter
 * ones sat pinned to the top of an over-tall box. A grid cell is not stretched
 * that way, so the ratio holds by construction.
 */
const GRID = "grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4";

/**
 * **4:3, not square** — the ratio the design gives (`aspect-ratio: 4/3`). Four
 * across in the detail's main column, a square tile is a third taller than it
 * needs to be, and a property photo is landscape anyway. Any fixed ratio keeps the
 * row reading as one band rather than a ragged edge.
 */
const TILE = "aspect-[4/3] w-full";

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
export function PropertyGalleryCard({
  propertyId,
  bare = false,
}: {
  propertyId: string;
  /**
   * Drops the card chrome and the header. Inside the detail's tab strip the tab
   * already names the surface and counts it, so a second title and a second
   * border is one frame inside another saying the same thing twice.
   */
  bare?: boolean;
}) {
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


  /*
    One body, two frames. It used to be pasted into both branches — 45 lines
    twice, which is how the skeletons drifted to a different corner radius from
    the tiles they stand in for.
  */
  const photos = (
    <>
      {isLoading ? (
        <div className={GRID}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className={`${TILE} rounded-[12px]`} />
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
        <div className={GRID}>
          {media.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setOpenAt(i)}
              aria-label={m.originalFileName}
              className={`${TILE} group relative overflow-hidden rounded-[12px] bg-muted ring-1 ring-inset ring-border outline-none transition-shadow hover:ring-foreground/20 focus-visible:ring-3 focus-visible:ring-ring/50`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- owner-uploaded photo on the backend's own host, same call as the chat thumbnails */}
              <img
                src={m.url}
                alt={m.originalFileName}
                loading="lazy"
                className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
              />
              {/*
                The upload date, **inside** the tile as the design draws it —
                which is what makes a stale gallery legible from the grid
                rather than only from the attention band above. A line under
                each tile said the same thing and cost a row of height per
                row of photos.

                Its own translucent ground rather than a drop shadow, because
                a photo can be light or dark and only an opaque-ish chip is
                legible over both.
              */}
              <span className="absolute bottom-2 left-2 rounded-[5px] bg-background/90 px-1.5 py-0.5 font-mono text-[9px] leading-none text-muted-foreground">
                {formatDate(m.createdAt, locale)}
              </span>
            </button>
          ))}
        </div>
      )}
    </>
  );

  return (
    <>
      {bare ? (
        /* No header: the tab above already names this surface and counts it. */
        <div className="flex flex-col gap-3">{photos}</div>
      ) : (
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
          <CardContent>{photos}</CardContent>
        </Card>
      )}

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

              {/* A square frame, like the thumbnails — which also stops the
                  dialog resizing under the cursor when stepping between a
                  portrait and a landscape photo.

                  The cap is on the WIDTH, because under `aspect-square` a
                  max-height leaves the width at 100% and the box stops being
                  square, whereas bounding the width bounds both. And it is
                  `100vh` minus the chrome — the header, the grid gap and the
                  dialog's padding — rather than a bare `70vh`: a square sized
                  off the viewport alone is taller than what is left once the
                  header is in place, and the bottom of the photo ends up below
                  the fold.

                  The dark fill is what makes `object-contain` read as a photo
                  viewer instead of a layout bug: a landscape photo in a square
                  frame always leaves bands, and on the dialog's own light
                  surface those bands look like empty space. */}
              <div className="relative mx-auto aspect-square w-full max-w-[calc(100vh-13rem)] overflow-hidden rounded-lg bg-zinc-900">
                {/* `object-contain`, never `cover`: this is the view whose whole
                    job is showing the entire photo, so bands beat cropping. */}
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