"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pencil, Check, X, Plus, Loader2, Paperclip, ListChecks, SlidersHorizontal, FileSignature,
} from "lucide-react";
import { useSettings, useUpsertSetting } from "@/hooks/use-settings";
import type { SystemSettingDto } from "@/lib/services/setting.service";
import { useRouter } from "@/i18n/navigation";
import { useCurrentPermissions } from "@/hooks/use-current-permissions";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface EditingRow {
  key: string;
  value: string;
}

interface NewSetting {
  key: string;
  value: string;
  description: string;
}

// Known categories get a recognizable icon; anything else falls back to a
// generic one. The label itself is translated (with a humanized fallback).
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  attachment: Paperclip,
  task: ListChecks,
  contract: FileSignature,
};

// Some settings hold prose, not a scalar — contract templates run to thousands
// of characters across many lines. Those must never go through a single-line
// <input>: the browser strips CR/LF from its value, so saving would silently
// flatten the template. They get a textarea, and a truncated chip when idle.
function isProse(value: string): boolean {
  return value.includes("\n") || value.length > 60;
}

/**
 * A boolean setting must not be a text field. `contract.template.approved`
 * gates every contract send in the product: while it is false, every send
 * returns 409. Asking an admin to type the word `true` into a box invites
 * `True`, `1`, `yes` — and the server compares strings.
 */
function isBoolean(value: string): boolean {
  const v = value.trim().toLowerCase();
  return v === "true" || v === "false";
}

// Turn a raw key/segment like "worker_threshold.lead_hours" into readable words.
function humanize(raw: string): string {
  return raw
    .replace(/[._]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function SettingsPage() {
  const t = useTranslations("settings");
  const locale = useLocale();
  const router = useRouter()
  const { permissions } = useCurrentPermissions()
  // Fail CLOSED while unknown: don't render the General settings for an admin
  // who may lack system:settings:read (avoids a flash before the redirect).
  const canViewGeneral = permissions !== null && permissions.has("system:settings:read")

  useEffect(() => {
    if (permissions === null || permissions.has("system:settings:read")) return
    const fallback = permissions.has("admin:list")
      ? "/dashboard/settings/admins"
      : permissions.has("system:permission:read")
        ? "/dashboard/settings/admins/presets"
        : permissions.has("system:audit:read")
          ? "/dashboard/settings/audit"
          : null
    if (fallback) router.replace(fallback)
  }, [permissions, router])

  const { data: settings = [], isLoading } = useSettings();
  const { mutate: upsert, isPending } = useUpsertSetting();

  const [editing, setEditing] = useState<EditingRow | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newSetting, setNewSetting] = useState<NewSetting>({ key: "", value: "", description: "" });

  // A `settings-link` error (e.g. contract_template_not_approved) deep-links here
  // with `?highlight=<key>`. The row is one of dozens across collapsed-by-default
  // categories, so it needs to scroll into view and carry a ring, not just exist.
  const searchParams = useSearchParams();
  const highlight = searchParams.get("highlight");
  const highlightRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // `settings.length` stays in the deps on purpose: the ref is null on the
    // first render because the list is still loading, so this must re-run
    // once rows actually exist.
    highlightRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [highlight, settings.length]);

  // Group settings under a readable category (the key prefix before the first dot).
  const groups = useMemo(() => {
    const map = new Map<string, SystemSettingDto[]>();
    for (const s of [...settings].sort((a, b) => a.key.localeCompare(b.key))) {
      const cat = s.key.split(".")[0] || "other";
      const list = map.get(cat) ?? [];
      list.push(s);
      map.set(cat, list);
    }
    return [...map.entries()];
  }, [settings]);

  function categoryLabel(cat: string) {
    return t.has(`categories.${cat}`) ? t(`categories.${cat}`) : humanize(cat);
  }

  function startEdit(key: string, value: string) {
    setEditing({ key, value });
  }

  function cancelEdit() {
    setEditing(null);
  }

  function saveEdit() {
    if (!editing) return;
    upsert({ key: editing.key, value: editing.value }, {
      onSuccess: () => setEditing(null),
    });
  }

  function saveNew() {
    upsert(
      { key: newSetting.key, value: newSetting.value, description: newSetting.description || undefined },
      {
        onSuccess: () => {
          setShowAdd(false);
          setNewSetting({ key: "", value: "", description: "" });
        },
      },
    );
  }

  function formatDate(iso: string | null) {
    if (!iso) return t("neverUpdated");
    return new Date(iso).toLocaleDateString(locale, {
      year: "numeric", month: "short", day: "numeric",
    });
  }

  // Cold start: hold with a spinner until permissions resolve (then either
  // render General or redirect to the admin's first allowed settings tab).
  if (permissions === null) {
    return (
      <div className="flex flex-1 items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!canViewGeneral) return null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
            {t("title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <Button size="sm" className="gap-2 shrink-0" onClick={() => setShowAdd(true)}>
          <Plus className="size-4" />
          {t("newSetting")}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-52 w-full rounded-xl" />
          ))}
        </div>
      ) : settings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <SlidersHorizontal className="size-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">{t("noSettings")}</p>
            <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowAdd(true)}>
              <Plus className="size-4" />
              {t("newSetting")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map(([cat, items]) => {
            const Icon = CATEGORY_ICONS[cat] ?? SlidersHorizontal;
            return (
              <Card key={cat} className="overflow-hidden">
                <CardHeader className="flex flex-row items-center gap-3 border-b border-border bg-muted/30 py-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-[18px]" />
                  </div>
                  <div className="flex flex-col">
                    <h2 className="font-heading text-base font-semibold leading-tight">
                      {categoryLabel(cat)}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {t("count", { count: items.length })}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {items.map((s) => {
                      const isEditing = editing?.key === s.key;
                      // A prose row stays stacked while editing so its textarea gets full width.
                      const prose = isProse(s.value);
                      return (
                        <div
                          key={s.key}
                          ref={s.key === highlight ? highlightRef : undefined}
                          className={cn(
                            "flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-accent/20 sm:px-5",
                            !(isEditing && prose) && "sm:flex-row sm:items-center sm:gap-4",
                            s.key === highlight && "bg-primary/5 ring-1 ring-inset ring-primary/40",
                          )}
                        >
                          <div className="flex min-w-0 flex-1 flex-col gap-1">
                            <span className="text-sm font-medium leading-snug text-foreground">
                              {s.description || humanize(s.key)}
                            </span>
                            <span className="font-mono text-[11px] text-muted-foreground">
                              {s.key}
                              <span className="mx-1.5 text-border">•</span>
                              {formatDate(s.updatedAt)}
                            </span>
                          </div>

                          {isBoolean(s.value) ? (
                            <div className="flex shrink-0 items-center gap-3">
                              <span className="text-sm text-muted-foreground">
                                {s.value.trim().toLowerCase() === "true" ? t("on") : t("off")}
                              </span>
                              <Switch
                                checked={s.value.trim().toLowerCase() === "true"}
                                disabled={isPending}
                                aria-label={s.description || s.key}
                                onCheckedChange={(next) =>
                                  upsert({ key: s.key, value: next ? "true" : "false" })
                                }
                              />
                            </div>
                          ) : isEditing && prose ? (
                            <div className="flex flex-col gap-2">
                              {/* Enter has to insert a newline here, so Escape is the only shortcut. */}
                              <Textarea
                                className="min-h-64 font-mono text-xs leading-relaxed"
                                value={editing.value}
                                onChange={(e) => setEditing({ key: s.key, value: e.target.value })}
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Escape") cancelEdit();
                                }}
                              />
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={cancelEdit}
                                  disabled={isPending}
                                >
                                  {t("cancel")}
                                </Button>
                                <Button
                                  size="sm"
                                  className="gap-1.5"
                                  onClick={saveEdit}
                                  disabled={isPending}
                                >
                                  {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                                  {t("save")}
                                </Button>
                              </div>
                            </div>
                          ) : isEditing ? (
                            <div className="flex shrink-0 items-center gap-1.5">
                              <Input
                                className="h-9 w-full text-sm sm:w-40"
                                value={editing.value}
                                onChange={(e) => setEditing({ key: s.key, value: e.target.value })}
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") saveEdit();
                                  if (e.key === "Escape") cancelEdit();
                                }}
                              />
                              <Button
                                size="icon"
                                className="size-9 shrink-0"
                                onClick={saveEdit}
                                disabled={isPending}
                                aria-label={t("save")}
                              >
                                {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-9 shrink-0"
                                onClick={cancelEdit}
                                disabled={isPending}
                                aria-label={t("cancel")}
                              >
                                <X className="size-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex min-w-0 items-center gap-2">
                              {/* Must stay shrinkable and single-line: a template value
                                  is thousands of characters and would blow out the row. */}
                              <span
                                title={s.value}
                                className="min-w-14 max-w-56 truncate rounded-lg bg-primary/10 px-3 py-1.5 text-center font-mono text-sm font-semibold text-primary"
                              >
                                {s.value}
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-9 shrink-0 gap-1.5"
                                onClick={() => startEdit(s.key, s.value)}
                              >
                                <Pencil className="size-3.5" />
                                <span className="hidden sm:inline">{t("editValue")}</span>
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={(v) => !v && setShowAdd(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("dialog.createTitle")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-key">{t("dialog.key")}</Label>
              <Input
                id="new-key"
                placeholder={t("dialog.keyPlaceholder")}
                value={newSetting.key}
                onChange={(e) => setNewSetting((p) => ({ ...p, key: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-value">{t("dialog.value")}</Label>
              {/* Textarea, not Input: a pasted multi-line value would otherwise
                  have its newlines stripped before it ever reached the API. */}
              <Textarea
                id="new-value"
                className="min-h-24"
                placeholder={t("dialog.valuePlaceholder")}
                value={newSetting.value}
                onChange={(e) => setNewSetting((p) => ({ ...p, value: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-desc">{t("dialog.description")}</Label>
              <Input
                id="new-desc"
                placeholder={t("dialog.descriptionPlaceholder")}
                value={newSetting.description}
                onChange={(e) => setNewSetting((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)} disabled={isPending}>
              {t("cancel")}
            </Button>
            <Button
              onClick={saveNew}
              disabled={isPending || !newSetting.key || !newSetting.value}
            >
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
