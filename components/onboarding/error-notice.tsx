"use client";

import { AlertTriangle, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  describeApiError,
  isPermissionDenied,
  SETTINGS_DEEP_LINK,
  SETTINGS_LINK_TARGET,
} from "@/lib/onboarding/errors";
import { cn } from "@/lib/utils";

/**
 * Renders a catalogued API error **together with its reaction**.
 *
 * The catalog in `lib/onboarding/errors.ts` has classified every error's
 * reaction since Phase 0, and until now nothing read that field — a
 * `settings-link` error rendered as a sentence with no link, which is the
 * worst case: the admin is told a system setting blocks them and given no
 * way to reach it.
 *
 * Only `settings-link` is handled here. `refetch`, `gate`, `inline-period`
 * and `toast` belong to the screen that owns the mutation, because each needs
 * that screen's own state — this component would have to guess.
 */
export function ErrorNotice({
  error,
  className,
}: {
  error: unknown;
  className?: string;
}) {
  const t = useTranslations("onboarding");
  if (!error) return null;

  const described = describeApiError(error);
  const message = isPermissionDenied(error)
    ? t("permissionDenied")
    : t(`apiErrors.${described?.labelKey ?? "unknown"}`);

  const settingKey = described?.code
    ? SETTINGS_LINK_TARGET[described.code]
    : undefined;
  const showLink = described?.reaction === "settings-link" && !!settingKey;

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3",
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
        <p className="text-sm leading-snug text-foreground">{message}</p>
      </div>
      {showLink ? (
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          className="ml-6 w-fit gap-1.5"
          render={<Link href={`${SETTINGS_DEEP_LINK}${settingKey}`} />}
        >
          {t("goToSettings")}
          <ArrowRight className="size-3.5" />
        </Button>
      ) : null}
    </div>
  );
}
