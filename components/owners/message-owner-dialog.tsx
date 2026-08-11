"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  type TicketCategory,
  type TicketPriority,
} from "@/lib/types/support.types";

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("message.title")}</DialogTitle>
          <DialogDescription>{t("message.description")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ticket-category">{t("message.category")}</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as TicketCategory)}
              items={categoryItems}
            >
              <SelectTrigger id="ticket-category" disabled={pending}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoryItems.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ticket-priority">{t("message.priority")}</Label>
            <Select
              value={priority}
              onValueChange={(v) => setPriority(v as TicketPriority)}
              items={priorityItems}
            >
              <SelectTrigger id="ticket-priority" disabled={pending}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorityItems.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
