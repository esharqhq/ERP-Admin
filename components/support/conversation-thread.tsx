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
  return d.toLocaleString(locale, { dateStyle: "short", timeStyle: "short" });
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
}: {
  msg: ConversationMessageDto;
  locale: string;
}) {
  const t = useTranslations("support");
  const isSystem = normalizeStatus(msg.messageType) === "system";
  const isAdmin = normalizeStatus(msg.senderUserType) === "admin";

  if (isSystem) {
    return (
      <div className="my-1 flex justify-center">
        <span className="rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground">
          {msg.body}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
      <div
        className={`flex max-w-[78%] flex-col gap-1 rounded-2xl px-3.5 py-2 text-sm ${
          isAdmin
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        {!isAdmin ? (
          <span className="text-[11px] font-medium opacity-70">
            {msg.senderUserType || t("thread.participant")}
          </span>
        ) : null}
        {msg.body ? <span className="whitespace-pre-wrap break-words">{msg.body}</span> : null}
        {msg.attachments?.length ? (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {msg.attachments.map((a) => (
              <AttachmentLink key={a.id} a={a} />
            ))}
          </div>
        ) : null}
        <span
          className={`text-[10px] ${isAdmin ? "text-primary-foreground/70" : "text-muted-foreground"}`}
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

  const { data: messages = [], isLoading, isError } =
    useConversationMessages(conversationId);
  const sendMessage = useSendMessage(conversationId);
  const { isLive } = useConversationHub(disabled ? undefined : conversationId);

  // Stick to bottom as messages arrive.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = () => {
    const body = draft.trim();
    if (!body || sendMessage.isPending) return;
    sendMessage.mutate(
      { body },
      { onSuccess: () => setDraft("") },
    );
  };

  const sendError = sendMessage.isError ? t("thread.sendFailed") : null;

  return (
    <div className="flex h-[28rem] flex-col rounded-xl border border-border">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="text-sm font-medium">{t("thread.title")}</span>
        {isLive ? (
          <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
            <Radio className="size-3" />
            {t("thread.live")}
          </span>
        ) : null}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
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
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("thread.empty")}
          </p>
        ) : (
          messages.map((m) => (
            <MessageBubble key={m.id} msg={m} locale={locale} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border p-3">
        {sendError ? (
          <p className="mb-2 text-xs text-destructive">{sendError}</p>
        ) : null}
        {disabled ? (
          <p className="py-1 text-center text-xs text-muted-foreground">
            {t("thread.readOnly")}
          </p>
        ) : (
          <div className="flex items-end gap-2">
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
              className="max-h-32 min-h-9 flex-1 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
            <Button
              size="icon"
              onClick={send}
              disabled={!draft.trim() || sendMessage.isPending}
              title={t("thread.send")}
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
