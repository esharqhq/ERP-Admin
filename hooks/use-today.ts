"use client";

import { useSyncExternalStore } from "react";
import { toLocalDateKey } from "@/lib/tasks/weekly-rows";

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;

function subscribeNever() {
  return () => {};
}

/**
 * The start of today in ms, and `0` before the clock is known.
 *
 * Read through `useSyncExternalStore` so the server snapshot is a constant: a
 * bare `Date.now()` in a client component still runs during SSR, and any value
 * derived from it hydrates against a different one. `0` is the server snapshot
 * and callers treat it as "no clock yet" — a date is still a date without a
 * countdown beside it, so nothing has to be hidden while it resolves.
 *
 * Quantized to the day on purpose. Every consumer is asking a day-granular
 * question — days until an expiry, whether a shift is in the past — and a
 * date-only deadline should read "1 day left" for the whole of the day before
 * rather than flipping to "0" at some hour of the afternoon.
 *
 * It does not tick. Nothing here changes meaningfully inside one sitting, and a
 * subscription that re-rendered every open detail page at midnight would cost
 * more than it is worth.
 */
export function useToday(): number {
  return useSyncExternalStore(
    subscribeNever,
    () => Math.floor(Date.now() / DAY_MS) * DAY_MS,
    () => 0,
  );
}

/**
 * Now, to the minute, and `0` before the clock is known.
 *
 * `useToday` is quantized to the **day**, which is right for every question it was
 * written for — days until an expiry, whether a shift is past — and useless for
 * *"last seen 12 minutes ago"*: at day granularity everything that happened today
 * happened zero days ago.
 *
 * Same `useSyncExternalStore` shape and the same `0` server snapshot, so a
 * relative age is simply absent on the server pass and appears on hydration
 * rather than hydrating against a different number. Quantized to the minute
 * because `getSnapshot` must be stable across the calls React makes within one
 * render, and because no reader of this needs a second.
 *
 * It does not tick. A dormancy column that re-rendered every minute would cost
 * more than the minute it bought.
 */
export function useClock(): number {
  return useSyncExternalStore(
    subscribeNever,
    () => Math.floor(Date.now() / MINUTE_MS) * MINUTE_MS,
    () => 0,
  );
}

/**
 * Today as a **local** `"yyyy-MM-dd"` key, and `""` before the clock is known.
 *
 * Not derivable from `useToday()`. That value is quantized to UTC days, which is
 * correct for *differencing* two dates — both sides floor the same way, so the
 * offset cancels — and wrong for naming a day: west of Greenwich its local date
 * is yesterday's. Anything comparing against a server-sent `scheduledDate`, which
 * is a local calendar date, has to compare keys rather than instants.
 *
 * `""` is the server snapshot. Callers treat it as "no clock yet" and must not
 * read it as a date before every other one.
 */
export function useTodayKey(): string {
  return useSyncExternalStore(
    subscribeNever,
    () => toLocalDateKey(new Date()),
    () => "",
  );
}

/**
 * Now, to the minute, **and it ticks**.
 *
 * `useClock` above refuses to, for a reason it states: a dormancy column that
 * re-rendered every minute would cost more than the minute it bought. The
 * attendance day is the case that inverts that trade. Its whole status grammar is
 * a comparison against now — a row is `Awaiting` until its shift starts and
 * `Overdue` after — so without a tick the screen freezes at whatever minute it was
 * opened: a 09:59 arrival stays "not due yet" at 10:30, and the number beside an
 * overdue row stops counting. React Query's `staleTime: 0` does not help, because
 * nothing refetches on a timer and the stale value here is *ours*, not the
 * server's.
 *
 * Same `useSyncExternalStore` shape and the same `0` server snapshot as its
 * siblings, so the SSR pass derives nothing from a clock it does not have. One
 * interval per mounted subscriber, cleared on unmount; it is only ever the
 * attendance screen, and only while it is open.
 */
export function useLiveClock(): number {
  return useSyncExternalStore(
    (onChange) => {
      const id = setInterval(onChange, MINUTE_MS);
      return () => clearInterval(id);
    },
    () => Math.floor(Date.now() / MINUTE_MS) * MINUTE_MS,
    () => 0,
  );
}
