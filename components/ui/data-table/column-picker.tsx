"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { Check, Columns3, GripVertical, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ToolbarButton, ToolbarCount } from "./toolbar-button";
import { pickerRows, visibleCount, type ColumnPrefs } from "@/lib/ui/table-prefs";
import { cn } from "@/lib/utils";
import type { DataColumn } from "./types";

/**
 * Which columns the queue shows, and in what order.
 *
 * Locked columns are **listed, greyed, with a lock** rather than omitted. The
 * design is explicit about it, and the reason is that a picker which silently
 * leaves Subject out teaches an admin that Subject can be switched off somewhere
 * they have not found yet. Shown-and-refused answers the question; absent asks a
 * new one.
 */
export function ColumnPicker<Row>({
  columns,
  prefs,
  onToggle,
  onMove,
  onReset,
}: {
  columns: DataColumn<Row>[];
  prefs: ColumnPrefs;
  onToggle: (id: string) => void;
  onMove: (fromId: string, toId: string) => void;
  onReset: () => void;
}) {
  const t = useTranslations("common.table");
  // Held here rather than left to the popover, because the trigger fills forest
  // while the panel is open — the same "this control is doing something" signal
  // the Filters button carries.
  const [open, setOpen] = useState(false);
  const rows = pickerRows(columns, prefs);

  /**
   * A pointer sensor with a small distance threshold so a plain click still
   * toggles the row instead of being eaten as a zero-length drag, and a keyboard
   * sensor so reordering is not mouse-only — the whole picker is otherwise
   * unreachable without a pointing device.
   */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onMove(String(active.id), String(over.id));
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<ToolbarButton on={open} />}>
        <Columns3 className="size-[15px]" />
        <span className="hidden sm:inline">{t("columns")}</span>
        <ToolbarCount on={open}>
          {t("columnsRatio", {
            visible: visibleCount(columns, prefs),
            total: columns.length,
          })}
        </ToolbarCount>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0">
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">{t("columnsTitle")}</p>
          <PopoverClose
            render={<Button variant="ghost" size="sm" className="-mr-2 h-7" />}
          >
            {t("columnsDone")}
          </PopoverClose>
        </div>

        <div className="scrollbar-slim max-h-80 overflow-y-auto p-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            {/*
              Only the unlocked ids are sortable. A locked row still renders inside
              the list — it just refuses to be picked up or dropped on, which keeps
              it at its registry index however the rest are rearranged.
            */}
            <SortableContext
              items={rows.filter((r) => !r.column.locked).map((r) => r.column.id)}
              strategy={verticalListSortingStrategy}
            >
              {rows.map(({ column, visible }) => (
                <PickerRow
                  key={column.id}
                  id={column.id}
                  label={column.label}
                  locked={column.locked}
                  visible={visible}
                  lockedLabel={t("columnsLocked")}
                  onToggle={() => onToggle(column.id)}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
          <p className="text-[11px] leading-snug text-muted-foreground text-pretty">
            {t("columnsHint")}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-7 shrink-0 px-2 text-xs"
          >
            {t("columnsReset")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function PickerRow({
  id,
  label,
  locked,
  visible,
  lockedLabel,
  onToggle,
}: {
  id: string;
  label: string;
  locked?: boolean;
  visible: boolean;
  lockedLabel: string;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled: locked });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "flex items-center gap-1.5 rounded-md px-1.5 py-1",
        isDragging && "relative z-10 bg-accent shadow-sm",
        !locked && "hover:bg-accent/50",
      )}
    >
      {locked ? (
        <span className="flex size-6 items-center justify-center text-muted-foreground/50">
          <Lock className="size-3.5" />
        </span>
      ) : (
        <button
          type="button"
          // The handle owns the drag, not the whole row — the row is a click
          // target for the toggle, and one element cannot be both without the
          // click being swallowed.
          aria-label={label}
          className="flex size-6 cursor-grab items-center justify-center text-muted-foreground/60 transition-colors hover:text-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5" />
        </button>
      )}

      <button
        type="button"
        disabled={locked}
        aria-pressed={visible}
        onClick={onToggle}
        className={cn(
          "flex min-w-0 flex-1 items-center justify-between gap-2 rounded px-1 py-1 text-left text-sm",
          locked ? "cursor-default text-muted-foreground" : "text-foreground",
        )}
      >
        <span className="truncate">{label}</span>
        {locked ? (
          <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground/60">
            {lockedLabel}
          </span>
        ) : (
          <span
            className={cn(
              "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
              visible
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input",
            )}
          >
            {visible && <Check className="size-3" />}
          </span>
        )}
      </button>
    </div>
  );
}
