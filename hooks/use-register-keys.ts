"use client";

import { useEffect } from "react";

/**
 * `/` focuses search, `N` opens Assign on the next unstaffed day (design 01 "Fast").
 * Ignored while typing or while a dialog is open. J/K/Enter/A row focus moves to
 * the Detail phase — the table shell does not expose its on-screen order.
 */
export function useRegisterKeys({ onSearch, onNext }: { onSearch: () => void; onNext: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      if (document.querySelector('[role="dialog"]')) return;
      if (e.key === "/") { e.preventDefault(); onSearch(); }
      else if (e.key === "n" || e.key === "N") { e.preventDefault(); onNext(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSearch, onNext]);
}
