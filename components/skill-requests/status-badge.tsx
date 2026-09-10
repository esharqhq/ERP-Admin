"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { SkillRequestStatus } from "@/lib/types/skill-request.types";

/**
 * The five statuses as a tinted chip, on the DS's semantic `tone` scale rather than
 * the presentation `variant` vocabulary — these are states, not decoration.
 *
 * `InfoRequested` is `info` rather than `warning` on purpose: it is not stalled, it
 * is a question in flight, and the queue's own copy calls it "waiting for the
 * worker". `Revoked` shares `danger` with `Rejected` because both are refusals from
 * the worker's side, even though only one of them was ever granted.
 *
 * ⚠ A `Record` lookup, not a `switch`, **and `t.has` before `t`**: a status this
 * build has not met falls to `neutral` and prints its own raw name rather than
 * throwing on a missing message. The platform has added enum values before and an
 * exhaustive switch fell through; the same idiom guards
 * `agency-links/link-columns.tsx:90` and three other call sites.
 */
const TONE: Record<
  string,
  "success" | "warning" | "danger" | "primary" | "info" | "neutral"
> = {
  Pending: "warning",
  InfoRequested: "info",
  Approved: "primary",
  Rejected: "danger",
  Revoked: "danger",
};

export function SkillRequestStatusBadge({ status }: { status: SkillRequestStatus }) {
  const t = useTranslations("skillRequests.status");
  return (
    <Badge tone={TONE[status] ?? "neutral"}>
      {t.has(status) ? t(status) : status}
    </Badge>
  );
}
