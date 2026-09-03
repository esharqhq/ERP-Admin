import type {
  AvailabilityDto,
  AvailabilitySource,
} from "@/lib/types/availability.types";
import { fromDayKey, type DayKey } from "@/lib/ui/week";

/**
 * What a worker said about each day of one week.
 *
 * The layer the Matrix draws **beneath** an expanded row — never the ground. It
 * costs one request per worker, so it arrives for one row at a time.
 */

/** One resolved day of the strip. */
export type AvailabilityDay =
  /** No base row at all — absence is unknown, **not** unavailable. */
  | { state: "unknown" }
  | { state: "closed"; source: AvailabilitySource }
  | { state: "open"; from: string; to: string; source: AvailabilitySource };

/** `"Monday"` … `"Sunday"`, Monday-first, matching the wire's own spelling. */
const WEEKDAY = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

/**
 * Resolve one week against the declared schedule.
 *
 * **Precedence: a dated exception beats the weekday row, in either direction.**
 * It can close a normally-open day *and* add hours to a normally-closed one, so
 * it is checked first and its answer is final — not merged with the weekday's.
 *
 * ⚠ **The two layers do not carry `source` the same way.** A weekday row has
 * `source: "Base" | "Worker" | "Admin"`. An exception has no `source` at all — it
 * has `setByAdmin: boolean` — so an exception resolves to **`Admin` or `Worker`
 * and can never be `Base`**. The strip draws three pills and a reader will expect
 * three cases on both branches; one branch has two, and that is the contract, not
 * an omission.
 *
 * ⚠ `isSet: false` makes **every** day `unknown` rather than closed. A worker who
 * has never saved a base has not said they are unavailable; they have said
 * nothing, and drawing a closed week would invent a refusal.
 */
export function resolveAvailabilityWeek(
  dto: AvailabilityDto | undefined,
  dayKeys: DayKey[],
): AvailabilityDay[] {
  if (!dto || !dto.isSet) return dayKeys.map(() => ({ state: "unknown" }));

  const exceptions = new Map(dto.exceptions.map((e) => [e.date, e]));
  const byWeekday = new Map(dto.days.map((d) => [d.dayOfWeek, d]));

  return dayKeys.map((key) => {
    const exception = exceptions.get(key);
    if (exception) {
      // `setByAdmin` is the only source signal an exception carries.
      const source: AvailabilitySource = exception.setByAdmin ? "Admin" : "Worker";
      if (!exception.isAvailable) return { state: "closed", source };
      // `isAvailable: true` requires both times server-side; a row missing one is
      // malformed rather than open-ended, and reads better as "said nothing".
      if (!exception.startTime || !exception.endTime) return { state: "unknown" };
      return {
        state: "open",
        from: exception.startTime,
        to: exception.endTime,
        source,
      };
    }

    // `getDay()` is Sunday-first; the wire's rows are Monday-first.
    const mondayFirst = (fromDayKey(key).getDay() + 6) % 7;
    const day = byWeekday.get(WEEKDAY[mondayFirst]);
    if (!day) return { state: "unknown" };
    if (!day.isAvailable) return { state: "closed", source: day.source };
    if (!day.startTime || !day.endTime) return { state: "unknown" };
    return { state: "open", from: day.startTime, to: day.endTime, source: day.source };
  });
}

/**
 * `"08:00:00"` → `"08:00"`.
 *
 * The wire sends seconds and no schedule is ever set to a second. Kept out of the
 * component so the strip and any future editor print the same thing.
 */
export function shortTime(time: string | null | undefined): string {
  if (!time) return "";
  const [h, m] = time.split(":");
  return h && m ? `${h}:${m}` : time;
}

/** `08:00 – 16:00`, or `""` when the day is not open. */
export function windowLabel(day: AvailabilityDay): string {
  return day.state === "open"
    ? `${shortTime(day.from)} – ${shortTime(day.to)}`
    : "";
}

/**
 * The exception window the read must ask for.
 *
 * ⚠ `from`/`to` bound the **exceptions only**, and the server's default window is
 * *today … +90 days*. A Matrix looking at a past week that did not pass explicit
 * bounds would get zero exceptions and quietly draw the plain weekday pattern —
 * every admin override invisible, which is the one thing the strip exists to show.
 */
export function exceptionWindow(dayKeys: DayKey[]): { from: DayKey; to: DayKey } {
  return { from: dayKeys[0], to: dayKeys[dayKeys.length - 1] };
}
