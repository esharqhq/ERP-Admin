"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";

import type {
  SkillRequestHeldSkillDto,
  SkillRequestHistoryDto,
  SkillRequestWorkerDto,
} from "@/lib/types/skill-request.types";

/**
 * Who is asking, what they already hold, and three numbers for judging whether the
 * claim is plausible.
 *
 * ⚠ **`fullName` is the primary label; `firstName` and `lastName` are optional.**
 * Both can be `null` on a perfectly normal, fully working worker — there is no
 * profile-completeness requirement in this product, it was removed, and a contracted
 * worker with no legal name on file was verified joining work successfully. No error
 * state, and never a blocked decision.
 *
 * ⚠ **`experience` is NOT the request's `claimedYears`.** The first is a
 * self-declared figure from registration that nobody reviews; the second is this
 * specific claim. Showing them side by side is useful; conflating them is not, so
 * the label says where the number came from.
 *
 * ⚠ **The history is three numbers with no task list behind it** — that is the whole
 * contract, chosen because "11 tasks, 4.5 rating" answers *"is this person plausibly
 * a window cleaner"* and a task list answers something else. `monthsOnPlatform: 0`
 * is legitimate for a new worker, not missing data.
 */
export function WorkerPanel({
  worker,
  heldSkills,
  history,
}: {
  worker: SkillRequestWorkerDto;
  heldSkills: SkillRequestHeldSkillDto[];
  history: SkillRequestHistoryDto;
}) {
  const t = useTranslations("skillRequests.worker");
  const locale = useLocale();

  return (
    <div className="flex flex-col gap-3.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {t("heading")}
      </span>

      <div className="flex flex-col gap-0.5">
        <span className="text-[15px] font-semibold tracking-[-0.01em]">
          {worker.fullName}
        </span>
        <span className="text-[13px] text-muted-foreground">{worker.email}</span>
        <span className="text-[13px] text-muted-foreground">
          {worker.phoneNumber}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-2.5">
        <Stat label={t("onboarding")}>{worker.onboardingStatus}</Stat>
        <Stat label={t("declaredExperience")}>
          {worker.experience === null ? "—" : worker.experience}
        </Stat>
        <Stat label={t("completedTasks")}>{history.completedTasks}</Stat>
        <Stat label={t("rating")}>{history.rating.toFixed(1)}</Stat>
        <Stat label={t("monthsOnPlatform")}>{history.monthsOnPlatform}</Stat>
      </dl>

      <div className="flex flex-col gap-0.5">
        <span className="text-[11px] leading-none text-muted-foreground">
          {t("heldSkills")}
        </span>
        <span className="text-[13px] leading-snug">
          {heldSkills.length === 0
            ? "—"
            : heldSkills
                .map((s) => (locale === "de" ? s.nameDe : s.nameEn))
                .join(", ")}
        </span>
      </div>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] leading-none text-muted-foreground">{label}</dt>
      <dd className="text-[13px] font-medium leading-snug">{children}</dd>
    </div>
  );
}
