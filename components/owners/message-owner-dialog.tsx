"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  ClipboardList,
  CircleQuestionMark,
  CreditCard,
  House,
  Loader2,
  Settings,
  User,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  type TicketCategory,
  type TicketPriority,
} from "@/lib/types/support.types";

/** Same icon per category as the owner app's CreateTicketScreen. */
const CATEGORY_ICONS: Record<TicketCategory, LucideIcon> = {
  Payment: CreditCard,
  Task: ClipboardList,
  Property: House,
  Technical: Settings,
  Account: User,
  Other: CircleQuestionMark,
};

/**
 * Filled-when-picked, like the owner app's chips — deliberately louder than
 * PresetCard's tinted selection, because here the pick is the whole control.
 */
function optionClasses(selected: boolean) {
  return cn(
    "border transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
    selected
      ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
      : "border-border bg-background text-muted-foreground hover:bg-accent/40 hover:text-foreground",
  );
}

export interface MessageDraft {
  category: TicketCategory;
  subject: string;
  initialMessage: string;
  priority: TicketPriority;
}

interface Props {
  open: boolean;
  onClose: () => void;
  pending: boolean;
  /** Localized parent-mutation error. */
  error?: string | null;
  onSubmit: (draft: MessageDraft) => void;
}

/**
 * Opens a support ticket addressed to the owner.
 *
 * Deliberately not a chat: the owner's app renders this as a ticket, so the
 * exchange keeps a status and a full history rather than scrolling away, and
 * an admin instruction can be pointed at later.
 *
 * **Mount this only while open.** State is seeded on first render and never
 * resynchronised, so a parent that keeps it mounted would show a cancelled
 * draft on the next open.
 */
export function MessageOwnerDialog({ open, onClose, pending, error, onSubmit }: Props) {
  const t = useTranslations("owners");
  const tCommon = useTranslations("common");

  const [category, setCategory] = useState<TicketCategory>("Other");
  const [priority, setPriority] = useState<TicketPriority>("Normal");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const categoryItems = TICKET_CATEGORIES.map((c) => ({
    value: c,
    label: t(`message.categories.${c}` as Parameters<typeof t>[0]),
  }));
  const priorityItems = TICKET_PRIORITIES.map((p) => ({
    value: p,
    label: t(`message.priorities.${p}` as Parameters<typeof t>[0]),
  }));

  function handleSubmit() {
    setLocalError(null);
    // Both are [Required] server-side and would come back as problem-details
    // rather than this API's {error} envelope — cheaper to refuse here.
    if (!subject.trim() || !body.trim()) {
      setLocalError(t("message.required"));
      return;
    }
    onSubmit({
      category,
      priority,
      subject: subject.trim(),
      initialMessage: body.trim(),
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !pending && onClose()}>
      {/* Chips are taller than the two selects they replaced — scroll rather
          than run off a short viewport. */}
      <DialogContent className="max-h-[calc(100dvh-4rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("message.title")}</DialogTitle>
          <DialogDescription>{t("message.description")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1.5">
          <Label id="ticket-category-label">{t("message.category")}</Label>
          <div
            role="group"
            aria-labelledby="ticket-category-label"
            className="grid grid-cols-2 gap-2"
          >
            {categoryItems.map((c) => {
              const Icon = CATEGORY_ICONS[c.value];
              const selected = category === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  disabled={pending}
                  aria-pressed={selected}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium",
                    optionClasses(selected),
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="min-w-0 truncate">{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label id="ticket-priority-label">{t("message.priority")}</Label>
          <div
            role="group"
            aria-labelledby="ticket-priority-label"
            className="flex flex-wrap gap-2"
          >
            {priorityItems.map((p) => {
              const selected = priority === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  disabled={pending}
                  aria-pressed={selected}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-xs font-medium",
                    optionClasses(selected),
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ticket-subject">{t("message.subject")}</Label>
          <Input
            id="ticket-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t("message.subjectPlaceholder")}
            disabled={pending}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ticket-body">{t("message.body")}</Label>
          <textarea
            id="ticket-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("message.bodyPlaceholder")}
            disabled={pending}
            className="min-h-[110px] w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {localError || error ? (
          <p className="text-sm text-destructive">{localError ?? error}</p>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {t("message.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
