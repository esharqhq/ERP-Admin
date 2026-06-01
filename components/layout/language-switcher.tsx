"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(newLocale: string) {
    // Replace current locale prefix with new one
    const segments = pathname.split("/");
    segments[1] = newLocale;
    router.push(segments.join("/"));
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant={locale === "en" ? "default" : "ghost"}
        size="sm"
        onClick={() => switchLocale("en")}
        className="h-7 px-2 text-xs"
      >
        EN
      </Button>
      <Button
        variant={locale === "de" ? "default" : "ghost"}
        size="sm"
        onClick={() => switchLocale("de")}
        className="h-7 px-2 text-xs"
      >
        DE
      </Button>
    </div>
  );
}
