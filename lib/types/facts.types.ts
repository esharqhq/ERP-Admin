import type {
  OwnerCompanyDto,
  OwnerIdentityDto,
  WorkerIdentityDto,
} from "@/lib/types/identity.types";

/**
 * What FactsRail checks a submission against. Tagged rather than a flat
 * optional-fields shape — an owner who is a natural person and a worker (who has
 * no legal-form concept at all) both have `company: null`/no company, but render
 * differently: the owner still states "Natural person", the worker states nothing.
 * A discriminant is what lets the two stay distinguishable.
 */
export type FactsData =
  | {
      kind: "owner";
      identity: OwnerIdentityDto | null;
      company: OwnerCompanyDto | null;
    }
  | {
      kind: "worker";
      identity: WorkerIdentityDto | null;
    };

export function ownerToFactsData(
  identity: OwnerIdentityDto | null,
  company: OwnerCompanyDto | null,
): FactsData {
  return { kind: "owner", identity, company };
}

export function workerToFactsData(identity: WorkerIdentityDto | null): FactsData {
  return { kind: "worker", identity };
}
