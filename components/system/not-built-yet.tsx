"use client";

import { useTranslations } from "next-intl";
import { Construction } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

/**
 * A dashboard section whose nav row ships before its screen does.
 *
 * ⚠ **This is a stopgap with an owner, not a permanent surface.** It exists
 * because `lib/nav-items.ts` carries the Agency group — which
 * `assets/Admin/Uyer-Admin-Sidebar.dc.html:118-140` draws — while F-05's screens
 * are still sub-project #3 of the work-queue roadmap. A missing route answers
 * `404`, which an operator correctly reads as a bug; this says the true thing
 * instead. Every page that renders it should be **replaced** by the real screen,
 * not extended, and this file goes away with the last one.
 *
 * It deliberately does **not** use `SystemShell`/`SystemState`. Those are
 * full-bleed states for 403/404/maintenance, which take over the viewport and
 * hide the rail; this is a normal dashboard page whose body happens to be one
 * card, so the operator keeps the nav and can leave without going back.
 *
 * No action button: the honest primary verb here is "wait", and the two exits
 * that work (the rail, the back button) are already on screen.
 */
export function NotBuiltYet({
  title,
  subtitle,
}: {
  /** The section's own heading — the same string its finished screen will use. */
  title: string;
  /** One line on what the section will do, so the row is not a mystery. */
  subtitle: string;
}) {
  const t = useTranslations("system.notBuilt");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
          {title}
        </h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="flex size-10 items-center justify-center rounded-full bg-accent text-primary">
            <Construction className="size-5" />
          </div>
          <p className="font-heading text-lg font-semibold">{t("title")}</p>
          <p className="max-w-md text-sm text-muted-foreground">{t("body")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
