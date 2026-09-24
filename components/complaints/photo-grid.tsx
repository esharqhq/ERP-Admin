"use client";

import { useState } from "react";
import { PlayCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface GridPhoto {
  id: string;
  url: string;
  name: string;
  mimeType: string;
}

/**
 * Evidence, four across — the layout of `property-gallery-card.tsx`, rebuilt
 * small rather than refactoring that file. A tile opens the full image in a
 * dialog. Video evidence (`TaskMediaType.Video`) plays in the dialog; its tile
 * shows a play glyph, never a broken image.
 */
export function PhotoGrid({ photos, emptyText }: { photos: GridPhoto[]; emptyText: string }) {
  const [open, setOpen] = useState<GridPhoto | null>(null);

  if (photos.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }

  return (
    <>
      <ul className="grid grid-cols-4 gap-2">
        {photos.map((p) => {
          const video = p.mimeType.startsWith("video/");
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setOpen(p)}
                className="relative block aspect-square w-full overflow-hidden rounded-md bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                aria-label={p.name}
              >
                {video ? (
                  <PlayCircle className="absolute inset-0 m-auto size-8 text-muted-foreground" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- remote, unsigned storage URLs
                  <img src={p.url} alt={p.name} loading="lazy" className="size-full object-cover" />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <Dialog open={open !== null} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate">{open?.name}</DialogTitle>
          </DialogHeader>
          {open?.mimeType.startsWith("video/") ? (
            <video src={open.url} controls className="max-h-[70vh] w-full rounded-md" />
          ) : open ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote, unsigned storage URLs
            <img src={open.url} alt={open.name} className="max-h-[70vh] w-full rounded-md object-contain" />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
