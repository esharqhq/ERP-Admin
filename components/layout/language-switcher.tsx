"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const LOCALES = ["de", "en"] as const;

/**
 * The segmented pill from the admin system-pages spec: a 32px track in the warm
 * shell neutral, with the active locale on a white 26px pill. It replaced a
 * pair of Buttons, which after the DS resize would have been two 36px controls
 * — far too heavy for a switch that sits in the corner of a header.
 *
 * `size="topbar"` is the dashboard variant from the admin sidebar spec: a 36px
 * track on the cool canvas with a hairline ring, 30px pills. The two specs give
 * this control different sizes, which is not a mistake to reconcile away — on
 * the sign-in panel it sits alone in a corner, while in the topbar it stands
 * next to a 38px bell, and a 32px switch beside that reads short. Neither spec
 * knows about the other's context, so both sizes ship and the caller picks.
 */
export function LanguageSwitcher({
  size = "default",
}: {
  size?: "default" | "topbar";
}) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const topbar = size === "topbar";

  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-full p-[3px]",
        topbar ? "h-9 bg-canvas ring-1 ring-border" : "h-8 bg-shell-tint"
      )}
    >
      {LOCALES.map((l) => {
        const active = locale === l;
        return (
          <button
            key={l}
            type="button"
            aria-current={active ? "true" : undefined}
            onClick={() => router.replace(pathname, { locale: l })}
            className={cn(
              "flex items-center rounded-full px-3 text-xs transition-colors",
              topbar ? "h-[30px]" : "h-[26px]",
              active
                ? "bg-background font-semibold text-primary ring-1 ring-foreground/8"
                : "font-medium text-[var(--neutral-muted)] hover:text-foreground"
            )}
          >
            {l.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
