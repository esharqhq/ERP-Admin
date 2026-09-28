import type { FilterField, FilterOption, FilterSection } from "@/components/ui/filter-bar";
import type { RegisterT } from "@/components/tasks/register/register-columns";
import type { DerivedTaskStatus } from "@/lib/tasks/derived-status";
import type { StaffingBucket } from "@/lib/tasks/register/filters";
import { locationName } from "@/lib/properties/location-fields";
import type { OwnerSummaryDto } from "@/lib/types/owner.types";
import { professionLabel, type ProfessionDto } from "@/lib/types/profession.types";
import type { PropertyDto } from "@/lib/types/property.types";

/** The nine derived states, in the design's lifecycle order (design 04). */
const STATUSES: DerivedTaskStatus[] = [
  "Open", "Scheduled", "Running", "Review", "Disputed", "Done", "Unstaffed", "Overdue", "Cancelled",
];

const STAFFING: StaffingBucket[] = ["none", "short", "full", "over"];

/** Every hour the design offers for "starts between", as the wire's `HH:mm`. */
const HOURS: string[] = Array.from({ length: 17 }, (_, i) => `${String(i + 6).padStart(2, "0")}:00`);

const RATING_FLOORS = ["3", "3.5", "4", "4.5"];

export interface RegisterFieldsOptions {
  t: RegisterT;
  locale: string;
  /** `useProperties()` — options for Property, and the names behind City. */
  properties: PropertyDto[];
  /** `useOwnerDirectory()` — empty when the admin may not list owners. */
  owners: OwnerSummaryDto[];
  /**
   * `owner:list`. Walk-in resolves the walk-in account through the owners list,
   * so without it the toggle could never match — it is not offered at all.
   */
  canListOwners: boolean;
  /** `useProfessions()` — active only, as every picker. */
  professions: ProfessionDto[];
}

function byLabel(locale: string) {
  return (a: FilterOption, b: FilterOption) =>
    a.label.localeCompare(b.label, locale, { sensitivity: "base" });
}

/**
 * The band (spec §4, design 05): fourteen filters in four sections. Only the
 * date goes to the server; `matchesRegister` applies the rest to the loaded
 * window. A select or multi-select with no options is hidden by the band itself,
 * so an admin without `owner:list` simply has no Owner control — and no Walk-in
 * toggle, which is dropped here (a boolean has no options to run out of).
 */
export function registerFields({
  t,
  locale,
  properties,
  owners,
  canListOwners,
  professions,
}: RegisterFieldsOptions): { fields: FilterField[]; sections: FilterSection[] } {
  const sort = byLabel(locale);

  const propertyOptions = properties
    .map((p) => ({ value: p.id, label: p.name || p.id }))
    .sort(sort);

  // `lookups.cityByProperty` carries the city **id** (what the filter compares);
  // the name comes off the same property's `city` ref.
  const cities = new Map<string, string>();
  for (const p of properties) {
    if (p.city && !cities.has(p.city.id)) {
      cities.set(p.city.id, locationName(p.city, locale) ?? p.city.id);
    }
  }
  const cityOptions = [...cities].map(([value, label]) => ({ value, label })).sort(sort);

  const ownerOptions = owners
    .map((o) => ({ value: o.id, label: o.fullName || o.email || o.id }))
    .sort(sort);

  const professionOptions = professions
    .map((p) => ({ value: p.id, label: professionLabel(p, locale) || p.code }))
    .sort(sort);

  const number = new Intl.NumberFormat(locale);
  const hourOptions = HOURS.map((h) => ({ value: h, label: h }));

  const fields: FilterField[] = [
    // When
    { kind: "dateRange", section: "when", fromKey: "from", toKey: "to", label: t("filters.dates") },
    { kind: "select", section: "when", key: "startAfter", label: t("filters.timeOfDay"), options: hourOptions },
    { kind: "select", section: "when", key: "startBefore", label: t("filters.timeOfDayEnd"), options: hourOptions },
    {
      kind: "booleanGroup",
      section: "when",
      label: t("filters.overdue"),
      items: [
        { key: "overdue", label: t("filters.overdue") },
        { key: "repeating", label: t("filters.repeating") },
      ],
    },
    // State
    {
      kind: "multiSelect",
      section: "state",
      key: "status",
      label: t("filters.status"),
      options: STATUSES.map((s) => ({ value: s, label: t(`status.${s}`) })),
    },
    {
      kind: "multiSelect",
      section: "state",
      key: "staffing",
      label: t("filters.staffing"),
      options: STAFFING.map((s) => ({ value: s, label: t(`filters.staffingOptions.${s}`) })),
    },
    {
      kind: "booleanGroup",
      section: "state",
      label: t("filters.checkedIn"),
      items: [{ key: "checkedIn", label: t("filters.checkedIn") }],
    },
    // Where & who for
    {
      kind: "multiSelect",
      section: "where",
      key: "property",
      label: t("filters.property"),
      searchable: true,
      options: propertyOptions,
    },
    { kind: "select", section: "where", key: "city", label: t("filters.city"), options: cityOptions },
    { kind: "select", section: "where", key: "owner", label: t("filters.owner"), options: ownerOptions },
    ...(canListOwners
      ? [{
          kind: "booleanGroup",
          section: "where",
          label: t("filters.walkIn"),
          items: [{ key: "walkIn", label: t("filters.walkIn") }],
        } satisfies FilterField]
      : []),
    // What it needs
    {
      kind: "multiSelect",
      section: "needs",
      key: "profession",
      label: t("filters.profession"),
      searchable: professionOptions.length > 8,
      options: professionOptions,
    },
    { kind: "numberRange", section: "needs", minKey: "reqMin", maxKey: "reqMax", label: t("filters.required") },
    {
      kind: "select",
      section: "needs",
      key: "ratingMin",
      label: t("filters.ratingMin"),
      options: RATING_FLOORS.map((r) => ({ value: r, label: `≥ ${number.format(Number(r))} ★` })),
    },
  ];

  const sections: FilterSection[] = [
    { id: "when", title: t("sections.when") },
    { id: "state", title: t("sections.state") },
    { id: "where", title: t("sections.where") },
    { id: "needs", title: t("sections.needs") },
  ];

  return { fields, sections };
}
