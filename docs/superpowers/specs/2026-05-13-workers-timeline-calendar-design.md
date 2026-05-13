# Workers Timeline Calendar — Design Spec

**Date:** 2026-05-13  
**Status:** Approved

## Goal

Replace the current month-grid `WorkersCalendar` component in `app/dashboard/(worker)/workers/page.tsx` with a horizontal timeline table: workers as rows, dates as columns (7-day week view).

## Layout

```
[← Oldingi hafta]  Du 12 – Ya 18 May 2026  [Keyingi hafta →]  [Bugun]

┌────────────────────┬──────────────┬──────────┬──────────┬─────────┬─────────┬─────────┬─────────┐
│ Ishchi ismi        │ Statistikasi │ Du 12    │ Se 13    │ Cho 14  │ Pa 15   │ Ju 16   │ Sha 17  │ Ya 18 │
├────────────────────┼──────────────┼──────────┼──────────┼─────────┼─────────┼─────────┼─────────┤
│ [AV] Jasur T.      │ 12 ish ★4.8  │          │ [chip]   │ [chip]  │         │         │         │       │
├────────────────────┼──────────────┼──────────┼──────────┼─────────┼─────────┼─────────┼─────────┤
│ [AV] Dilnoza Y.    │ 8 ish ★4.5   │ [chip]   │          │ [chip]  │         │         │         │       │
└────────────────────┴──────────────┴──────────┴──────────┴─────────┴─────────┴─────────┴─────────┘
```

## Data

Reuse existing `assignmentSeed`, `workers`, `workerHues` already defined in the file. No new data needed.

- Week range: compute Mon–Sun for the selected week
- Navigation state: `weekOffset: number` (0 = current week, -1 = previous, +1 = next)
- Build a `Map<workerId, Map<dateKey, Assignment>>` from `assignmentSeed` for O(1) cell lookup

## Columns

| Column | Width | Sticky |
|--------|-------|--------|
| Ishchi ismi | 180px min | Yes (left: 0) |
| Statistikasi | 140px min | Yes (left: 180px) |
| Each date (×7) | flexible, min 100px | No |

## Cell Content

- **Worker name cell:** Avatar (size-8) + name + `ID #000X` below
- **Stats cell:** `{tasks} ish` + `★ {rating}`
- **Date cell (assignment):** Colored chip using `workerHues[worker.id].chip` — truncated assignment title
- **Date cell (empty):** Empty, no hover state
- **Today column:** `bg-primary/5` background on header + all cells

## Header

- Column headers: short weekday (Du/Se/Cho/Pa/Ju/Sha/Ya) + date number
- Today column header: date number in `bg-primary text-primary-foreground` pill
- Navigation row above table: `←` (ghost icon button), week range label, `→` (ghost icon button), `Bugun` (outline button)

## Implementation

Single self-contained `WorkersCalendar` function — replaces the current one entirely. No new files. All logic (week computation, event map building) stays inside the component using `useMemo`.

## Removed

The old `Sheet` (day-detail sidebar), `buildMonthGrid`, `formatLongDate`, `WEEKDAYS_LONG_UZ`, `MONTHS_UZ` helpers — all removed or replaced with the week helpers.
