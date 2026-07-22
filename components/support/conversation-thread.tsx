"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Loader2,
  Send,
  Paperclip,
  Mic,
  Square,
  Trash2,
  X,
  FileText,
  AlertTriangle,
  Play,
  Pause,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useConversationMessages,
  useSendMessage,
} from "@/hooks/use-support";
import { useConversationHub } from "@/hooks/use-conversation-hub";
import { supportService } from "@/lib/services/support.service";
import { uploadService } from "@/lib/services/upload.service";
import { normalizeStatus } from "@/lib/types/task.types";
import type {
  AttachmentTypeName,
  ConversationMessageDto,
  MessageAttachmentDto,
} from "@/lib/types/support.types";

/** How many attachments may ride along on a single message. */
const MAX_ATTACHMENTS = 10;

/** A media attachment the lightbox can open full-screen. */
type MediaView = { url: string; kind: "image" | "video"; fileName?: string };

function fmtTime(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

function fmtDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

/** Zero-padded mm:ss clock for the voice caption (e.g. "00:04"). */
function fmtClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
}

function fmtBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
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

/** Classify a File's MIME type into the backend's AttachmentType enum. */
function attachmentKind(mimeType: string): AttachmentTypeName {
  if (mimeType.startsWith("audio/")) return "Voice";
  if (mimeType.startsWith("video/")) return "Video";
  if (mimeType.startsWith("image/")) return "Image";
  return "File";
}

/**
 * Custom voice-message player — a play/pause control, a seekable waveform and a
 * "mm:ss, size" caption (WhatsApp/Telegram style). Styled with tones derived
 * from the `onPrimary` flag so it reads correctly on both the blue admin bubble
 * and the light incoming bubble, unlike the raw browser <audio> widget.
 */
function VoicePlayer({
  src,
  durationSeconds,
  sizeBytes,
  onPrimary,
}: {
  src: string;
  durationSeconds: number | null;
  sizeBytes: number;
  onPrimary: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  // WebM blobs from MediaRecorder often report duration=Infinity, so trust the
  // recorded durationSeconds first and only fall back to the element's metadata.
  const [metaDuration, setMetaDuration] = useState<number | null>(null);
  const total =
    durationSeconds && durationSeconds > 0 ? durationSeconds : metaDuration ?? 0;
  const pct = total > 0 ? Math.min(100, (current / total) * 100) : 0;

  // Deterministic pseudo-waveform seeded from the URL — stable per message and
  // avoids fetching/decoding the audio bytes (which the storage CDN may block
  // cross-origin) just to draw amplitude bars.
  const bars = useMemo(() => {
    let seed = 0;
    for (let i = 0; i < src.length; i += 1) {
      seed = (seed * 31 + src.charCodeAt(i)) >>> 0;
    }
    const out: number[] = [];
    for (let i = 0; i < 40; i += 1) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      out.push(0.2 + (seed / 0xffffffff) * 0.8);
    }
    return out;
  }, [src]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current;
    if (!el || total <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    el.currentTime = ratio * total;
    setCurrent(ratio * total);
  };

  const btnCls = onPrimary
    ? "bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30"
    : "bg-foreground/10 text-foreground hover:bg-foreground/20";
  const playedCls = onPrimary ? "bg-primary-foreground" : "bg-foreground/70";
  const unplayedCls = onPrimary ? "bg-primary-foreground/30" : "bg-foreground/20";
  const timeCls = onPrimary ? "text-primary-foreground/70" : "text-muted-foreground";

  const size = fmtBytes(sizeBytes);
  const caption = `${fmtClock(playing || current > 0 ? current : total)}${
    size ? `, ${size}` : ""
  }`;

  return (
    <div className="flex min-w-[13.5rem] max-w-[16rem] items-center gap-2.5 py-0.5">
      <button
        type="button"
        onClick={toggle}
        className={`flex size-9 shrink-0 items-center justify-center rounded-full transition-colors ${btnCls}`}
      >
        {playing ? (
          <Pause className="size-4" />
        ) : (
          <Play className="size-4 translate-x-px" />
        )}
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div
          onClick={seek}
          className="flex h-6 cursor-pointer items-center gap-[2px]"
        >
          {bars.map((bh, i) => (
            <span
              key={i}
              className={`min-w-[2px] flex-1 rounded-full ${
                (i / bars.length) * 100 < pct ? playedCls : unplayedCls
              }`}
              style={{ height: `${Math.round(bh * 100)}%` }}
            />
          ))}
        </div>
        <span className={`text-[10px] tabular-nums ${timeCls}`}>{caption}</span>
      </div>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        className="hidden"
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setMetaDuration(d);
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onEnded={() => {
          setPlaying(false);
          setCurrent(0);
        }}
      />
    </div>
  );
}

function AttachmentView({
  a,
  onOpenMedia,
  onPrimary,
}: {
  a: MessageAttachmentDto;
  onOpenMedia: (m: MediaView) => void;
  onPrimary: boolean;
}) {
  const kind = normalizeStatus(a.type);

  if (kind === "voice") {
    return (
      <VoicePlayer
        src={a.url}
        durationSeconds={a.durationSeconds}
        sizeBytes={a.sizeBytes}
        onPrimary={onPrimary}
      />
    );
  }

  if (kind === "video") {
    // Poster-style thumbnail with a play badge; tap to open in the lightbox
    // (WhatsApp/Telegram behaviour) rather than juggling tiny inline controls.
    return (
      <button
        type="button"
        onClick={() => onOpenMedia({ url: a.url, kind: "video", fileName: a.fileName })}
        className="group relative block max-w-[16rem] overflow-hidden rounded-lg bg-black"
      >
        <video
          src={a.url}
          preload="metadata"
          muted
          playsInline
          className="pointer-events-none max-h-64 w-full"
        />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-black/55 text-white shadow-lg ring-1 ring-white/30 transition-transform group-hover:scale-105">
            <Play className="size-5 translate-x-0.5" />
          </span>
        </span>
      </button>
    );
  }

  if (kind === "image") {
    return (
      <button
        type="button"
        onClick={() => onOpenMedia({ url: a.url, kind: "image", fileName: a.fileName })}
        className="block cursor-zoom-in overflow-hidden rounded-lg"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- dynamic user-uploaded chat thumbnail, not worth next/image config */}
        <img
          src={a.url}
          alt={a.fileName}
          className="max-h-64 max-w-[16rem] object-cover"
        />
      </button>
    );
  }

  return (
    <a
      href={a.url}
      target="_blank"
      rel="noreferrer"
      className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs underline-offset-2 hover:underline ${
        onPrimary
          ? "border-primary-foreground/25 bg-primary-foreground/10 text-primary-foreground"
          : "border-border/60 bg-background/60"
      }`}
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
  onOpenMedia,
}: {
  msg: ConversationMessageDto;
  locale: string;
  showName: boolean;
  isLastOfGroup: boolean;
  onOpenMedia: (m: MediaView) => void;
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
        className={`flex max-w-[80%] flex-col gap-1 rounded-2xl px-3 py-1.5 text-sm shadow-sm ${tail} ${
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
              <AttachmentView
                key={a.id}
                a={a}
                onOpenMedia={onOpenMedia}
                onPrimary={isAdmin}
              />
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

interface PendingAttachment {
  id: string;
  file: File;
  kind: AttachmentTypeName;
  previewUrl: string;
  durationSeconds?: number;
  status: "uploading" | "ready" | "error";
  storageKey?: string;
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
  const [pending, setPending] = useState<PendingAttachment[]>([]);
  const [recordingElapsed, setRecordingElapsed] = useState<number | null>(null);
  const [micError, setMicError] = useState(false);
  const [lightbox, setLightbox] = useState<MediaView | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const elapsedRef = useRef(0);
  const discardRef = useRef(false);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attachIdRef = useRef(0);
  // Mirror of `pending` so the unmount cleanup can revoke every live object URL
  // without re-running (and prematurely revoking) on each add/remove.
  const pendingRef = useRef<PendingAttachment[]>([]);

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

  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);

  // Revoke any still-live preview URLs when the thread unmounts.
  useEffect(
    () => () => {
      pendingRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    },
    [],
  );

  // Close the lightbox on Escape while it's open.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  const removePending = (id: string) => {
    setPending((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  };

  const clearAllPending = () => {
    setPending((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.previewUrl));
      return [];
    });
  };

  const uploadAttachment = async (
    file: File,
    kind: AttachmentTypeName,
    durationSeconds?: number,
  ) => {
    const id = String((attachIdRef.current += 1));
    const previewUrl = URL.createObjectURL(file);
    setPending((prev) => [
      ...prev,
      { id, file, kind, previewUrl, durationSeconds, status: "uploading" },
    ]);
    try {
      const presigned = await supportService.presignAttachment(conversationId, {
        attachmentType: kind,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        fileName: file.name,
      });
      // This conversation-scoped presign result carries no "method" field —
      // the local file-store driver's upload-direct endpoint is POST-only
      // (unlike the S3-style PUT used by the generic /api/files/presign flow).
      await uploadService.putBytes(presigned.uploadUrl, file, "POST");
      setPending((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, status: "ready", storageKey: presigned.storageKey }
            : p,
        ),
      );
    } catch {
      setPending((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "error" } : p)),
      );
    }
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    e.target.value = "";
    if (!files || files.length === 0) return;
    const remaining = MAX_ATTACHMENTS - pending.length;
    Array.from(files)
      .slice(0, Math.max(0, remaining))
      .forEach((file) => void uploadAttachment(file, attachmentKind(file.type || "")));
  };

  const startRecording = async () => {
    if (recordingElapsed !== null || pending.length >= MAX_ATTACHMENTS) return;
    setMicError(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      chunksRef.current = [];
      discardRef.current = false;
      elapsedRef.current = 0;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        if (!discardRef.current && chunksRef.current.length > 0) {
          // Recorder.mimeType always includes a codec suffix (e.g.
          // "audio/webm;codecs=opus"); the backend's upload allowlist checks
          // the bare MIME type, so strip it before naming the Blob/File.
          const bareMimeType = (recorder.mimeType || "audio/webm").split(";")[0];
          const blob = new Blob(chunksRef.current, { type: bareMimeType });
          const ext = bareMimeType.includes("ogg") ? "ogg" : "webm";
          const file = new File([blob], `voice-message-${Date.now()}.${ext}`, {
            type: bareMimeType,
          });
          void uploadAttachment(file, "Voice", elapsedRef.current);
        }
        setRecordingElapsed(null);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecordingElapsed(0);
      recordTimerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setRecordingElapsed(elapsedRef.current);
      }, 1000);
    } catch {
      setMicError(true);
    }
  };

  const stopRecording = (discard: boolean) => {
    discardRef.current = discard;
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    mediaRecorderRef.current?.stop();
  };

  // Recorder cleanup on unmount (e.g. navigating away mid-recording).
  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (mediaRecorderRef.current?.state === "recording") {
        discardRef.current = true;
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const isRecording = recordingElapsed !== null;
  const uploading = pending.some((p) => p.status === "uploading");
  const hasError = pending.some((p) => p.status === "error");
  const readyCount = pending.filter((p) => p.status === "ready").length;
  const atMax = pending.length >= MAX_ATTACHMENTS;
  const canSend =
    (draft.trim().length > 0 || readyCount > 0) &&
    !sendMessage.isPending &&
    !uploading &&
    !hasError;

  const send = () => {
    if (!canSend) return;
    const body = draft.trim();
    const ready = pending.filter((p) => p.status === "ready");
    const attachments = ready.length
      ? ready.map((p) => ({
          storageKey: p.storageKey!,
          type: p.kind,
          mimeType: p.file.type || "application/octet-stream",
          sizeBytes: p.file.size,
          fileName: p.file.name,
          durationSeconds: p.durationSeconds,
        }))
      : undefined;
    sendMessage.mutate(
      { body: body || undefined, attachments },
      {
        onSuccess: () => {
          setDraft("");
          clearAllPending();
        },
      },
    );
  };

  const sendError = sendMessage.isError ? t("thread.sendFailed") : null;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
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
                  onOpenMedia={setLightbox}
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
        {micError ? (
          <p className="mb-2 flex items-center gap-1 text-xs text-destructive">
            <AlertTriangle className="size-3" />
            {t("thread.micDenied")}
          </p>
        ) : null}
        {disabled ? (
          <p className="py-1 text-center text-xs text-muted-foreground">
            {t("thread.readOnly")}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {pending.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {pending.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-2.5 py-1.5"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground">
                      {p.kind === "Image" ? (
                        // eslint-disable-next-line @next/next/no-img-element -- local blob preview, not a next/image candidate
                        <img
                          src={p.previewUrl}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : p.kind === "Voice" ? (
                        <Mic className="size-4" />
                      ) : p.kind === "Video" ? (
                        <video
                          src={p.previewUrl}
                          className="size-full object-cover"
                          muted
                        />
                      ) : (
                        <FileText className="size-4" />
                      )}
                    </span>
                    <span className="min-w-0 max-w-[9rem] flex-1 truncate text-xs">
                      {p.kind === "Voice"
                        ? fmtDuration(p.durationSeconds ?? 0)
                        : p.file.name}
                    </span>
                    {p.status === "uploading" ? (
                      <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
                    ) : p.status === "error" ? (
                      <span className="shrink-0 text-[11px] text-destructive">
                        {t("thread.uploadFailed")}
                      </span>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6 shrink-0"
                      title={t("thread.removeAttachment")}
                      onClick={() => removePending(p.id)}
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}

            {isRecording ? (
              <div className="flex items-center gap-2 rounded-2xl border border-input bg-background px-3 py-1.5">
                <span className="flex size-2.5 shrink-0 animate-pulse rounded-full bg-destructive" />
                <span className="flex-1 text-sm text-muted-foreground">
                  {t("thread.recording")} · {fmtDuration(recordingElapsed ?? 0)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 text-muted-foreground"
                  title={t("thread.cancelRecording")}
                  onClick={() => stopRecording(true)}
                >
                  <Trash2 className="size-4" />
                </Button>
                <Button
                  size="icon"
                  className="size-8 shrink-0 rounded-full"
                  title={t("thread.stopAndSend")}
                  onClick={() => stopRecording(false)}
                >
                  <Square className="size-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-end gap-1.5 rounded-2xl border border-input bg-background py-1 pl-1.5 pr-1 transition-colors focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={onPickFile}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 self-end text-muted-foreground"
                  title={t("thread.attach")}
                  disabled={atMax}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="size-4" />
                </Button>
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
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 self-end text-muted-foreground"
                  title={t("thread.recordVoice")}
                  disabled={atMax}
                  onClick={startRecording}
                >
                  <Mic className="size-4" />
                </Button>
                <Button
                  size="icon"
                  onClick={send}
                  disabled={!canSend}
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
        )}
      </div>

      {lightbox ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 z-10 text-white hover:bg-white/10 hover:text-white"
            title={tCommon("close")}
            onClick={() => setLightbox(null)}
          >
            <X className="size-5" />
          </Button>
          {lightbox.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element -- full-size chat image preview, not a next/image candidate
            <img
              src={lightbox.url}
              alt={lightbox.fileName ?? ""}
              className="max-h-[90vh] max-w-[90vw] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <video
              src={lightbox.url}
              controls
              autoPlay
              className="max-h-[90vh] max-w-[90vw]"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
