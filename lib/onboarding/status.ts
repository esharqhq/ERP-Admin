import type {
  ContractPhase,
  OnboardingStatus,
} from "@/lib/types/onboarding.types";

/** Variants actually implemented by components/ui/badge.tsx. */
type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "ghost"
  | "link";

export interface StatusPresentation {
  variant: BadgeVariant;
  /** Extra classes for tones the Badge has no variant for. */
  className?: string;
  /** Key under the `onboarding.status` / `onboarding.phase` i18n namespace. */
  labelKey: string;
}

// Tones follow the emerald/amber convention already used by the worker stat cards.
const EMERALD = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
const AMBER = "bg-amber-500/10 text-amber-700 dark:text-amber-400";
const SKY = "bg-sky-500/10 text-sky-700 dark:text-sky-400";
const MUTED = "bg-muted text-muted-foreground";

const ONBOARDING: Record<OnboardingStatus, StatusPresentation> = {
  // Subject has not submitted anything yet — nothing for the admin to do.
  Kyc: { variant: "outline", labelKey: "kyc" },
  // The work queue: this is the only state where approve/reject are legal.
  Review: { variant: "secondary", className: AMBER, labelKey: "review" },
  Rejected: { variant: "destructive", labelKey: "rejected" },
  // Approved unlocks nothing on its own — a contract still has to be authored and signed.
  Approved: { variant: "secondary", labelKey: "approved" },
  Contract: { variant: "secondary", className: SKY, labelKey: "contract" },
  Active: { variant: "secondary", className: EMERALD, labelKey: "active" },
};

const PHASE: Record<ContractPhase, StatusPresentation> = {
  Draft: { variant: "outline", labelKey: "draft" },
  Sent: { variant: "secondary", className: AMBER, labelKey: "sent" },
  // Signed but not started yet — the normal shape of an early renewal, NOT an error.
  Scheduled: { variant: "secondary", className: SKY, labelKey: "scheduled" },
  InForce: { variant: "secondary", className: EMERALD, labelKey: "inForce" },
  // Lapsed vs Expired is a <=1h job artifact; render them identically.
  Lapsed: { variant: "destructive", labelKey: "expired" },
  Expired: { variant: "destructive", labelKey: "expired" },
  // "Ended early" — an admin force-terminate, or a period cut short when a watched
  // document expired (F-03·1). Never render this as "expired".
  Terminated: { variant: "secondary", className: MUTED, labelKey: "terminated" },
};

export function onboardingStatusPresentation(
  status: OnboardingStatus,
): StatusPresentation {
  return ONBOARDING[status] ?? { variant: "outline", labelKey: "unknown" };
}

export function contractPhasePresentation(
  phase: ContractPhase,
): StatusPresentation {
  return PHASE[phase] ?? { variant: "outline", labelKey: "unknown" };
}

/** The subject is waiting on an admin decision. */
export function needsReview(status: OnboardingStatus): boolean {
  return status === "Review";
}

/** Approve/reject are legal only from `Review` — the server 400s otherwise. */
export function canDecide(status: OnboardingStatus): boolean {
  return status === "Review";
}

/** Contract authoring is legal only from `Approved` or `Active` (else 409). */
export function canAuthorContract(status: OnboardingStatus): boolean {
  return status === "Approved" || status === "Active";
}
