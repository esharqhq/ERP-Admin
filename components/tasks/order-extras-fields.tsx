"use client";

import { useTranslations } from "next-intl";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ADD_ON_NOTE_MAX } from "@/lib/tasks/order";

/**
 * The two F-07 ·7 fields every admin order carries (`task-lifecycle.md` §0g·1),
 * shared by the walk-in form and the owner detail's order dialog so the two
 * cannot drift apart on a required answer.
 *
 * - **Tools** — `ownerProvidesTools`, required, with **no pre-selected answer**.
 *   The server made it `bool?` precisely so an omitted answer is refused instead
 *   of recorded as "the company brings them"; a default here would re-open that.
 * - **Add-on note** — `addOnNote`, optional, ≤ 2,000. The worker sees it on both
 *   browse lists before accepting, which is what it exists for: warning them in
 *   advance ("post-construction", "after a flood"). Nothing in the system acts
 *   on it.
 */
export function OrderExtrasFields({
  idPrefix,
  ownerProvidesTools,
  onOwnerProvidesToolsChange,
  addOnNote,
  onAddOnNoteChange,
  disabled,
  toolsInvalid = false,
}: {
  /** Keeps the element ids unique when both forms could mount on one page. */
  idPrefix: string;
  ownerProvidesTools: boolean | null;
  onOwnerProvidesToolsChange: (value: boolean) => void;
  addOnNote: string;
  onAddOnNoteChange: (value: string) => void;
  disabled: boolean;
  toolsInvalid?: boolean;
}) {
  const t = useTranslations("orderFields");
  const toolsLabelId = `${idPrefix}-tools-label`;

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label id={toolsLabelId}>{t("tools")}</Label>
        <ChoiceGroup
          aria-labelledby={toolsLabelId}
          aria-invalid={toolsInvalid}
          value={
            ownerProvidesTools === null ? null : ownerProvidesTools ? "owner" : "company"
          }
          onValueChange={(v) => onOwnerProvidesToolsChange(v === "owner")}
          options={[
            { value: "owner", label: t("toolsOwner") },
            { value: "company", label: t("toolsCompany") },
          ]}
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">{t("toolsHint")}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-add-on`}>{t("addOn")}</Label>
        <Textarea
          id={`${idPrefix}-add-on`}
          value={addOnNote}
          onChange={(e) => onAddOnNoteChange(e.target.value)}
          placeholder={t("addOnPlaceholder")}
          maxLength={ADD_ON_NOTE_MAX}
          disabled={disabled}
          className="min-h-16"
        />
        <p className="text-xs text-muted-foreground">{t("addOnHint")}</p>
      </div>
    </>
  );
}
