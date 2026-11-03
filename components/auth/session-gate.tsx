"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import {
  idleExpired,
  idleExpiredHere,
  readLastActivity,
  recordActivity,
  shouldRecordActivity,
} from "@/lib/auth/idle";
import { signedOutElsewhere } from "@/lib/http/sign-out";
import { signOutHere } from "@/lib/http/sign-out-here";
import { useAuthStore } from "@/store/auth.store";

/** Input that counts as the admin being here. Polling and sockets do not. */
const ACTIVITY_EVENTS = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"] as const;

/** How often an open tab checks the idle hour while nobody touches it. */
const CHECK_EVERY_MS = 30_000;

/**
 * Wraps the dashboard. Nothing inside renders, mounts a query or opens a
 * socket until this browser's session is known to be live.
 *
 * - **On open:** an hour without activity (`lib/auth/idle.ts`) signs out
 *   before the first paint of the dashboard. A browser reopened after a
 *   weekend used to show the panel, with data, for a few seconds.
 * - **While open:** the admin's input moves the shared clock; a timer, focus
 *   and the tab becoming visible check it. Input after the hour signs out
 *   rather than reviving the session.
 * - **Other tabs:** a sign-out in one tab signs this one out
 *   (`signedOutElsewhere`). Tokens another tab refreshed are read back into
 *   this tab's store, so its memory can never persist the old pair over them.
 */
export function SessionGate({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const [live, setLive] = useState(false);

  useEffect(() => {
    let leaving = false;
    const leave = () => {
      if (leaving) return;
      leaving = true;
      void signOutHere(locale);
    };

    if (idleExpiredHere()) {
      leave();
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the check reads localStorage, which exists only after mount
    setLive(true);

    const check = () => {
      if (idleExpiredHere()) leave();
    };
    const onInput = () => {
      const now = Date.now();
      const last = readLastActivity();
      if (idleExpired(last, now)) return leave();
      if (shouldRecordActivity(last, now)) recordActivity(now);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.storageArea !== localStorage) return;
      if (signedOutElsewhere(e.key, e.newValue)) return leave();
      if (e.key === "auth-storage") void useAuthStore.persist.rehydrate();
    };

    for (const name of ACTIVITY_EVENTS) {
      window.addEventListener(name, onInput, { passive: true });
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    const timer = setInterval(check, CHECK_EVERY_MS);

    return () => {
      for (const name of ACTIVITY_EVENTS) window.removeEventListener(name, onInput);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
      clearInterval(timer);
    };
  }, [locale]);

  return live ? <>{children}</> : null;
}
