// lib/tasks/dispatch-search.ts

import type { TaskItemDto } from "@/lib/types/task.types";

/**
 * The label the Dispatch board prints for a task's property, and the only place
 * that decides it.
 *
 * ⚠ It reads `TaskItemDto.propertyName`, which the **row already carries** —
 * Dispatch used to resolve this by fetching the whole property table with
 * `useProperties()` and building an id→name map, a second whole-table request
 * for a string the first response had already returned. `propertyName` is
 * populated server-side from the joined `Property` (`TaskDtos.cs` → `PropertyName`),
 * so it can never disagree with that list.
 *
 * `null` and whitespace-only both fall back to a truncated id, which is what the
 * map's `?? id.slice(0, 8)` did for an unknown property. Never render the raw
 * `null` — a blank cell reads as "no property", which no task can have.
 */
export function propertyLabel(task: TaskItemDto): string {
  return task.propertyName?.trim() || task.propertyId.slice(0, 8);
}

/**
 * Dispatch's one search box, over the three fields the board shows: property,
 * date and task id.
 *
 * Pure so the suite can test it directly — the board itself is a `"use client"`
 * component wired to `next-intl` and five others, and the project tests pure
 * functions only.
 *
 * An empty or whitespace-only query matches **everything** rather than nothing:
 * the box is a narrowing, so an untouched one must not hide rows.
 *
 * ⚠ `scheduledDate` is matched **raw** (`yyyy-MM-dd`), not the localized string
 * the row prints. That is deliberate and predates this module — typing `2026-09`
 * is the only way to search a month, and a locale-formatted haystack would make
 * the same query work in one language and fail in another.
 */
export function matchesDispatchSearch(task: TaskItemDto, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    propertyLabel(task).toLowerCase().includes(q) ||
    task.scheduledDate.includes(q) ||
    task.id.toLowerCase().includes(q)
  );
}
