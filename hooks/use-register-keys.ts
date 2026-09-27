"use client";

import { useEffect, useEffectEvent } from "react";

/** Open popups whose own keys `/` and `N` must not steal (a Select's listbox, a menu). */
const POPUP = '[role="dialog"], [role="listbox"], [role="menu"]';

/**
 * `/` focuses search, `N` opens Assign on the next unstaffed row on screen (design
 * 01 "Fast") — the caller's `onNext` is responsible for narrowing to what the
 * admin can currently see (tab, search, filters) before picking one. Ignored
 * while typing, and while a dialog, a listbox or a menu is open (or the key
 * lands inside one) — a Select's typeahead reads letters. J/K/Enter/A row focus
 * moves to the Detail phase — the table shell does not expose its on-screen order.
 *
 * Subscribed once: the handlers are read through `useEffectEvent`, so the
 * caller's fresh closures every render never re-subscribe the listener.
 */
export function useRegisterKeys({ onSearch, onNext }: { onSearch: () => void; onNext: () => void }) {
  const search = useEffectEvent(onSearch);
  const next = useEffectEvent(onNext);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target instanceof HTMLElement ? e.target : null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      if (el?.closest(POPUP) || document.querySelector(POPUP)) return;
      if (e.key === "/") { e.preventDefault(); search(); }
      else if (e.key === "n" || e.key === "N") { e.preventDefault(); next(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
