"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Pencil, Check, X, Plus } from "lucide-react";
import { useSettings, useUpsertSetting } from "@/hooks/use-settings";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface EditingRow {
  key: string;
  value: string;
}

interface NewSetting {
  key: string;
  value: string;
  description: string;
}

export default function SettingsPage() {
  const { data: settings = [], isLoading } = useSettings();
  const { mutate: upsert, isPending } = useUpsertSetting();

  const [editing, setEditing] = useState<EditingRow | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newSetting, setNewSetting] = useState<NewSetting>({ key: "", value: "", description: "" });

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
    if (!iso) return "—";
    return new Date(iso).toLocaleString("uz-UZ", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
            Sozlamalar
          </h1>
          <p className="text-sm text-muted-foreground">
            Tizim konfiguratsiyasi — kalit-qiymat juftliklari.
          </p>
        </div>
        <Button size="sm" className="gap-2 shrink-0" onClick={() => setShowAdd(true)}>
          <Plus className="size-4" />
          Yangi sozlama
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <p className="text-xs text-muted-foreground">
            {settings.length} ta sozlama
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col gap-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : settings.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              Hech qanday sozlama topilmadi.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {settings.map((s) => (
                <div key={s.key} className="flex items-center gap-4 px-4 py-3 hover:bg-accent/30">
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-medium">{s.key}</span>
                      {s.description && (
                        <Badge variant="outline" className="text-[10px] font-normal">
                          {s.description}
                        </Badge>
                      )}
                    </div>
                    {editing?.key === s.key ? (
                      <Input
                        className="mt-1 h-7 text-sm"
                        value={editing.value}
                        onChange={(e) => setEditing({ key: s.key, value: e.target.value })}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit();
                          if (e.key === "Escape") cancelEdit();
                        }}
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground truncate">{s.value}</span>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    {editing?.key === s.key ? (
                      <>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 text-green-600 hover:text-green-600"
                          onClick={saveEdit}
                          disabled={isPending}
                        >
                          <Check className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          onClick={cancelEdit}
                          disabled={isPending}
                        >
                          <X className="size-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span className="hidden text-[11px] text-muted-foreground sm:inline">
                          {formatDate(s.updatedAt)}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          onClick={() => startEdit(s.key, s.value)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Yangi sozlama modali */}
      <Dialog open={showAdd} onOpenChange={(v) => !v && setShowAdd(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Yangi sozlama</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-key">Kalit</Label>
              <Input
                id="new-key"
                placeholder="company.name"
                value={newSetting.key}
                onChange={(e) => setNewSetting((p) => ({ ...p, key: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-value">Qiymat</Label>
              <Input
                id="new-value"
                placeholder="ERP Admin"
                value={newSetting.value}
                onChange={(e) => setNewSetting((p) => ({ ...p, value: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-desc">Tavsif (ixtiyoriy)</Label>
              <Input
                id="new-desc"
                placeholder="Kompaniya nomi"
                value={newSetting.description}
                onChange={(e) => setNewSetting((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)} disabled={isPending}>
              Bekor qilish
            </Button>
            <Button
              onClick={saveNew}
              disabled={isPending || !newSetting.key || !newSetting.value}
            >
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
