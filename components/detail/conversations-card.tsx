"use client";

import { MessagesSquare } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { CardRowsSkeleton, CardState } from "@/components/detail/card-state";
import { useSubjectTickets } from "@/hooks/use-subject-tickets";
import { normalizeStatus } from "@/lib/types/task.types";
import { cn } from "@/lib/utils";

const CLOSED = new Set(["resolved", "closed"]);

/**
 * The support threads this account has open, and the last few it had.
 *
 * Read-only and deliberately shallow — the thread itself lives on
 * `/dashboard/support/{id}`, which carries the messages, the assignment and the
 * resolve/close verbs. Rebuilding any of that here would put the same rules in
 * two places, and two copies of a rule drift apart.
 *
 * Capped at six rows. This is a card in a sidebar column, not the inbox: an
 * account with forty threads needs the inbox, and a list that grows without
 * bound would push everything below it off the screen.
 */
const MAX_ROWS = 6;

export function ConversationsCard({
  userId,
}: {
  userId: string | null | undefined;
}) {
  const t = useTranslations("detail.conversations");
  const locale = useLocale();
  const { tickets, openCount, canRead, isPending, isError } =
    useSubjectTickets(userId);

  const rows = tickets.slice(0, MAX_ROWS);

  function formatWhen(iso: string): string {
    return new Date(iso).toLocaleDateString(locale, {
      day: "2-digit",
      month: "short",
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <h2 className="font-heading text-sm font-semibold tracking-tight">
          {t("title")}
        </h2>
        {openCount > 0 ? (
          <Badge tone="danger" className="tabular-nums">
            {openCount}
          </Badge>
        ) : null}
      </CardHeader>

      <CardContent>
        {canRead === null || isPending ? (
          <CardRowsSkeleton rows={2} />
        ) : canRead === false ? (
          <CardState
            icon={<MessagesSquare className="size-7" />}
            title={t("refused")}
            hint={t("refusedHint")}
            note="gated · support_ticket:list_any"
          />
        ) : isError ? (
          <CardState
            icon={<MessagesSquare className="size-7" />}
            title={t("failed")}
            note="read failed"
          />
        ) : rows.length === 0 ? (
          <CardState
            icon={<MessagesSquare className="size-7" />}
            title={t("empty")}
            hint={t("emptyHint")}
            note="200 · empty list"
          />
        ) : (
          <div className="flex flex-col gap-1.5">
            {rows.map((ticket) => {
              const closed = CLOSED.has(normalizeStatus(ticket.status));
              return (
                <Link
                  key={ticket.id}
                  href={`/dashboard/support/${ticket.id}`}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 ring-1 ring-inset ring-border transition-colors hover:bg-muted/40",
                    closed && "opacity-70",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "size-[7px] shrink-0 rounded-full",
                      closed ? "bg-muted-foreground/40" : "bg-status-cancelled",
                    )}
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-xs font-semibold leading-tight">
                      {ticket.subject || t("untitled")}
                    </span>
                    <span className="truncate text-[10px] text-muted-foreground">
                      {t("meta", {
                        category: ticket.category,
                        date: formatWhen(ticket.createdAt),
                      })}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 font-mono text-[10px]",
                      closed
                        ? "text-muted-foreground"
                        : "text-status-cancelled-deep",
                    )}
                  >
                    {t(`status.${closed ? "closed" : "open"}`)}
                  </span>
                </Link>
              );
            })}
            {tickets.length > rows.length ? (
              <Link
                href="/dashboard/support"
                className="px-2.5 pt-1 text-[11px] font-medium text-primary hover:underline"
              >
                {t("more", { count: tickets.length - rows.length })}
              </Link>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
