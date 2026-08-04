import type { CompanyType } from "@/lib/types/identity.types";

/**
 * `CompanyType` serializes as its enum member name — `Gmbh`, not `GmbH`;
 * `IndividualEntrepreneur`, not `Individual entrepreneur`. The backend prints the raw
 * member in its own generated PDF and treats the display strings as a pending business
 * ruling, so every place we show a company type maps it ourselves. No general rule
 * derives `GmbH` from `Gmbh`.
 *
 * Returns a key under the `onboarding.companyType` i18n namespace.
 */
export function companyTypeLabelKey(type: CompanyType | null | undefined): string {
  switch (type) {
    case "Llc":
      return "llc";
    case "Gmbh":
      return "gmbh";
    case "IndividualEntrepreneur":
      return "individualEntrepreneur";
    case "SoleTrader":
      return "soleTrader";
    case "Other":
      return "other";
    default:
      return "unknown";
  }
}
