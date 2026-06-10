"use client";

import type { ReactNode } from "react";
import { useHasPermission } from "@/hooks/use-current-permissions";

interface CanProps {
  /** Backend [RequirePermission] code that gates this UI (e.g. "worker:approve"). */
  permission: string;
  children: ReactNode;
  /** Rendered when the admin lacks the permission (defaults to nothing). */
  fallback?: ReactNode;
}

/**
 * Conditionally render UI based on the current admin's permissions. Cosmetic
 * only — the backend independently enforces the same code on every endpoint.
 */
export function Can({ permission, children, fallback = null }: CanProps) {
  const allowed = useHasPermission(permission);
  return <>{allowed ? children : fallback}</>;
}
