"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Loader2, Send, Paperclip, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useConversationMessages,
  useSendMessage,
} from "@/hooks/use-support";
import { useConversationHub } from "@/hooks/use-conversation-hub";
import { normalizeStatus } from "@/lib/types/task.types";
import type {
  ConversationMessageDto,
  MessageAttachmentDto,
} from "@/lib/types/support.types";

function fmtTime(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

function sameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

function dayLabel(
  iso: string,
  locale: string,
  t: (k: string) => string,
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(iso, now.toISOString())) return t("today");
  if (sameDay(iso, yesterday.toISOString())) return t("yesterday");
  return d.toLocaleDateString(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function AttachmentLink({ a }: { a: MessageAttachmentDto }) {
  return (
    <a
      href={a.url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-1.5 rounded-md border border-border/60 bg-background/60 px-2 py-1 text-xs underline-offset-2 hover:underline"
    >
      <Paperclip className="size-3" />
      {a.fileName}
    </a>
  );
}

function MessageBubble({
  msg,
  locale,
  showName,
  isLastOfGroup,
}: {
  msg: ConversationMessageDto;
  locale: string;
  showName: boolean;
  isLastOfGroup: boolean;
}) {
  const t = useTranslations("support");
  const isSystem = normalizeStatus(msg.messageType) === "system";
  const isAdmin = normalizeStatus(msg.senderUserType) === "admin";

  if (isSystem) {
    return (
      <div className="my-2 flex justify-center">
        <span className="rounded-full bg-background/80 px-3 py-1 text-[11px] text-muted-foreground ring-1 ring-border">
          {msg.body}
        </span>
      </div>
    );
  }

  // Telegram/WhatsApp-style tail: square off the trailing bottom corner on the
  // last bubble of a run so grouped messages read as one stack.
  const tail = isLastOfGroup
    ? isAdmin
      ? "rounded-br-sm"
      : "rounded-bl-sm"
    : "";

  return (
    <div
      className={`flex ${isAdmin ? "justify-end" : "justify-start"} ${
        isLastOfGroup ? "mb-2" : "mb-0.5"
      }`}
    >
      <div
        className={`flex max-w-[80%] flex-col gap-0.5 rounded-2xl px-3 py-1.5 text-sm shadow-sm ${tail} ${
          isAdmin
            ? "bg-primary text-primary-foreground"
            : "bg-background text-foreground ring-1 ring-border"
        }`}
      >
        {showName && !isAdmin ? (
          <span className="text-[11px] font-semibold text-primary">
            {msg.senderUserType || t("thread.participant")}
          </span>
        ) : null}
        {msg.body ? (
          <span className="whitespace-pre-wrap break-words">{msg.body}</span>
        ) : null}
        {msg.attachments?.length ? (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {msg.attachments.map((a) => (
              <AttachmentLink key={a.id} a={a} />
            ))}
          </div>
        ) : null}
        <span
          className={`self-end text-[10px] leading-none ${
            isAdmin ? "text-primary-foreground/70" : "text-muted-foreground"
          }`}
        >
          {fmtTime(msg.createdAt, locale)}
        </span>
      </div>
    </div>
  );
}

interface Props {
  conversationId: string;
  /** Closed/archived conversation → composer is read-only. */
  disabled?: boolean;
}

export function ConversationThread({ conversationId, disabled }: Props) {
  const t = useTranslations("support");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Hub first: when it's live we retire the 15s message poll (the hub pushes
  // ReceiveMessage); the poll resumes automatically if the connection drops.
  const { isLive } = useConversationHub(disabled ? undefined : conversationId);
  const { data: messages = [], isLoading, isError } =
    useConversationMessages(conversationId, isLive);
  const sendMessage = useSendMessage(conversationId);

  // Stick to bottom as messages arrive.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = () => {
    const body = draft.trim();
    if (!body || sendMessage.isPending) return;
    sendMessage.mutate({ body }, { onSuccess: () => setDraft("") });
  };

  const sendError = sendMessage.isError ? t("thread.sendFailed") : null;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      {isLive ? (
        <span className="absolute right-3 top-2 z-20 flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-[11px] font-medium text-emerald-600 shadow-sm ring-1 ring-border backdrop-blur dark:text-emerald-400">
          <Radio className="size-3" />
          {t("thread.live")}
        </span>
      ) : null}

      <div className="flex-1 overflow-y-auto bg-muted/30 px-4 py-3">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="ml-auto h-10 w-2/3 rounded-2xl" />
            <Skeleton className="h-10 w-1/2 rounded-2xl" />
            <Skeleton className="ml-auto h-10 w-1/2 rounded-2xl" />
          </div>
        ) : isError ? (
          <p className="py-8 text-center text-sm text-destructive">
            {tCommon("error")}
          </p>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-muted-foreground">{t("thread.empty")}</p>
          </div>
        ) : (
          messages.map((m, i) => {
            const prev = messages[i - 1];
            const next = messages[i + 1];
            const newDay = !prev || !sameDay(prev.createdAt, m.createdAt);
            // A "group" is a run of same-sender, same-day, non-system messages.
            const grouped =
              !!prev &&
              !newDay &&
              prev.senderUserType === m.senderUserType &&
              normalizeStatus(prev.messageType) !== "system" &&
              normalizeStatus(m.messageType) !== "system";
            const isLastOfGroup =
              !next ||
              !sameDay(next.createdAt, m.createdAt) ||
              next.senderUserType !== m.senderUserType ||
              normalizeStatus(next.messageType) === "system";

            return (
              <div key={m.id}>
                {newDay ? (
                  <div className="sticky top-0 z-10 my-2 flex justify-center">
                    <span className="rounded-full bg-background/90 px-3 py-0.5 text-[11px] font-medium text-muted-foreground shadow-sm ring-1 ring-border backdrop-blur">
                      {dayLabel(m.createdAt, locale, (k) => t(`thread.${k}`))}
                    </span>
                  </div>
                ) : null}
                <MessageBubble
                  msg={m}
                  locale={locale}
                  showName={!grouped}
                  isLastOfGroup={isLastOfGroup}
                />
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border bg-background p-3">
        {sendError ? (
          <p className="mb-2 text-xs text-destructive">{sendError}</p>
        ) : null}
        {disabled ? (
          <p className="py-1 text-center text-xs text-muted-foreground">
            {t("thread.readOnly")}
          </p>
        ) : (
          <div className="flex items-end gap-2 rounded-2xl border border-input bg-background py-1 pl-3 pr-1 transition-colors focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder={t("thread.composerPlaceholder")}
              className="max-h-32 min-h-8 flex-1 resize-none bg-transparent py-1.5 text-sm outline-none placeholder:text-muted-foreground"
            />
            <Button
              size="icon"
              onClick={send}
              disabled={!draft.trim() || sendMessage.isPending}
              title={t("thread.send")}
              className="size-9 shrink-0 rounded-full"
            >
              {sendMessage.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
