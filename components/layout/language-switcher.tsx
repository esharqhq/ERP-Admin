"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(newLocale: string) {
    router.replace(pathname, { locale: newLocale });
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
