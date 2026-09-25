"use client";

import { QrCode, ScanLine, Smartphone, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { checkinDoorKind, type CheckinDoorKind } from "@/lib/attendance/checkin-door";
import { cn } from "@/lib/utils";

const DOOR_ICON: Record<CheckinDoorKind, LucideIcon> = {
  tapped: Smartphone,
  display: QrCode,
  scanned: ScanLine,
};

/**
 * *How* a worker checked in — F-07 ·2 `checkinDoor` — as a muted caption.
 *
 * ⚠ **A caption, not a badge.** The door is a method, not a status, and every row
 * it sits on (attendance, the booking's workers, the complaint team) already
 * carries its one status chip. A second tinted chip would break the one-badge-
 * per-row rule and read as a second verdict on the same person.
 *
 * Renders **nothing** for `null` and for a door this app does not know: `null`
 * cannot be told apart from a pre-2026-09-22 check-in, so no copy is honest for
 * it, and an unknown fourth door should neither crash nor borrow a label. The
 * hover title carries the long form, plus the scanner caveat on a staff scan.
 *
 * Shared by the attendance cell and cards, the booking page's workers table and
 * the complaint team card — one wording for the same field everywhere.
 */
export function CheckinDoorLabel({
  door,
  className,
}: {
  door: string | null | undefined;
  className?: string;
}) {
  const t = useTranslations("attendance.door");
  const kind = checkinDoorKind(door);
  if (!kind) return null;
  const Icon = DOOR_ICON[kind];
  const title =
    kind === "scanned"
      ? `${t(`${kind}Long`)}. ${t("scannerCoords")}.`
      : t(`${kind}Long`);

  return (
    <span
      title={title}
      className={cn(
        "inline-flex min-w-0 items-center gap-1 text-[10.5px] text-muted-foreground",
        className,
      )}
    >
      <Icon className="size-3 flex-none" aria-hidden />
      <span className="truncate">{t(kind)}</span>
    </span>
  );
}
