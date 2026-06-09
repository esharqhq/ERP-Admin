"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useWorkers } from "@/hooks/use-workers";

interface Props {
  open: boolean;
  onClose: () => void;
  onAssign: (workerId: string) => void;
  isPending: boolean;
  /**
   * Optional localized error to surface inline (the admin-assign endpoint rejects
   * threshold/eligibility violations with a 400). Omitted by callers that don't
   * surface it, so the worker picker is unchanged where unused.
   */
  error?: string | null;
}

/** Pick an approved worker to admin-assign to a single understaffed task. */
export function AssignWorkerDialog({
  open,
  onClose,
  onAssign,
  isPending,
  error,
}: Props) {
  const t = useTranslations("tasks");
  const tCommon = useTranslations("common");
  const [search, setSearch] = useState("");
  const { data: workers = [], isLoading } = useWorkers(true);

  const filtered = workers.filter((w) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (w.fullName ?? "").toLowerCase().includes(q) ||
      (w.email ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("actions.assignTitle")}</DialogTitle>
        </DialogHeader>
        {error ? (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder={t("actions.assignSearch")}
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
          {isLoading ? (
            <p className="px-1 py-4 text-center text-sm text-muted-foreground">
              {tCommon("loading")}
            </p>
          ) : filtered.length === 0 ? (
            <p className="px-1 py-4 text-center text-sm text-muted-foreground">
              {t("actions.noWorkers")}
            </p>
          ) : (
            filtered.map((w) => (
              <button
                key={w.id}
                type="button"
                disabled={isPending}
                onClick={() => onAssign(w.id)}
                className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-left text-sm transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
              >
                <span className="font-medium">{w.fullName ?? "—"}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {w.email}
                </span>
              </button>
            ))
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {tCommon("cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
