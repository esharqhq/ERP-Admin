"use client";

import { useState } from "react";
import { ImageIcon, X } from "lucide-react";
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
import type { PropertyMediaDto } from "@/lib/types/property.types";

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
  const [preview, setPreview] = useState<PropertyMediaDto | null>(null);

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
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[4/3] w-full rounded-lg" />
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
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {media.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPreview(m)}
                  className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-muted outline-none transition-colors hover:border-foreground/20 focus-visible:ring-3 focus-visible:ring-ring/50"
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

      <Dialog open={preview !== null} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent className="sm:max-w-3xl" showCloseButton={false}>
          {preview && (
            <>
              <DialogHeader className="flex flex-row items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <DialogTitle className="truncate text-sm">
                    {preview.originalFileName}
                  </DialogTitle>
                  <span className="text-[11px] text-muted-foreground">
                    {formatSize(preview.fileSize, locale)} ·{" "}
                    {formatDate(preview.createdAt, locale)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPreview(null)}
                  aria-label={t("gallery.close")}
                  className="-mt-1 -mr-1 shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </DialogHeader>
              {/* eslint-disable-next-line @next/next/no-img-element -- full-size preview of the same photo */}
              <img
                src={preview.url}
                alt={preview.originalFileName}
                className="max-h-[70vh] w-full rounded-lg object-contain"
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
