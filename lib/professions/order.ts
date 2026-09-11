import { professionLabel, type ProfessionDto } from "@/lib/types/profession.types";

/**
 * The skills list in the reading locale's alphabetical order.
 *
 * ⚠ **The server cannot do this for us.** `GET /api/professions` orders by `nameEn`
 * ascending and nothing else (`ProfessionService.cs:42`) — there is no
 * `Accept-Language` handling and no sort parameter on the route. So a German screen
 * receives German labels in *English* alphabetical order, and
 * `profession-fnd1-retrofit.md` §3.1 says outright: *"If you want German
 * alphabetical order, sort client-side."* This is that sort.
 *
 * `localeCompare` rather than `<`: German collates "Ärztlich" with the As, while a
 * codepoint comparison would exile every umlaut past Z. `sensitivity: "base"` also
 * keeps a lower-case entry from sorting after every capital.
 *
 * Returns a new array — this runs inside a render path and must not reorder the
 * query cache's own array.
 *
 * ⚠ **`isActive` is deliberately NOT a sort key.** A deactivated skill stays in its
 * alphabetical place and the row dims instead, which is what the server does too;
 * hoisting them into their own block would make a reactivation look like a move.
 * There is also no "pin `GENERAL` first" here — the guide offers that as an option
 * for pickers, and this screen is a management table where alphabetical is the
 * honest order.
 */
export function orderProfessions(
  professions: ProfessionDto[],
  locale: string,
): ProfessionDto[] {
  return [...professions].sort((a, b) =>
    professionLabel(a, locale).localeCompare(professionLabel(b, locale), locale, {
      sensitivity: "base",
    }),
  );
}
