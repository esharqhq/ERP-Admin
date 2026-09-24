import type { DerivedTaskStatus } from "@/lib/tasks/derived-status";

export interface StatusVisual {
  bg: string;
  fg: string;
  dot: string;
  ring: string | null;
  rail: string | null;
}

/** Uyer_Admin_Tasks_v2 §04 (Status & staffing) — palette copied, not eyeballed. */
export const TASK_STATUS_VISUAL: Record<DerivedTaskStatus, StatusVisual> = {
  Open: { bg: "transparent", fg: "#5B6B63", dot: "#B6C2CC", ring: null, rail: null },
  Scheduled: { bg: "transparent", fg: "#1C6B4C", dot: "#7FB79B", ring: null, rail: null },
  Running: { bg: "#E1EFE8", fg: "#0F3D2E", dot: "#1C6B4C", ring: null, rail: null },
  Review: { bg: "#FEF6E7", fg: "#9A5E00", dot: "#E08A00", ring: null, rail: null },
  // F-07 ·5. The review family: handed in and waiting on a person, not on staff.
  Disputed: { bg: "#FEF6E7", fg: "#9A5E00", dot: "#E08A00", ring: null, rail: null },
  Done: { bg: "transparent", fg: "#8D9AA3", dot: "#C3D6CB", ring: null, rail: null },
  Unstaffed: { bg: "#FDECEC", fg: "#B22B2B", dot: "#DC3B3B", ring: null, rail: "#DC3B3B" },
  Overdue: {
    bg: "#FDECEC",
    fg: "#B22B2B",
    dot: "#B22B2B",
    ring: "inset 0 0 0 1px rgba(178,43,43,0.35)",
    rail: null,
  },
  Cancelled: { bg: "transparent", fg: "#B6C2CC", dot: "#DDE3E7", ring: null, rail: null },
};

export function taskStatusRail(status: DerivedTaskStatus): string | null {
  return TASK_STATUS_VISUAL[status].rail;
}
