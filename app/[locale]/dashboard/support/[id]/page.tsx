"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { TicketDetailPane } from "@/components/support/ticket-detail-pane";

export default function SupportTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("support");

  return (
    <div className="flex h-[calc(100vh-7.5rem)] min-h-[30rem] flex-col gap-3">
      <Button
        variant="ghost"
        size="sm"
        nativeButton={false}
        className="w-fit gap-1.5 text-muted-foreground"
        render={<Link href="/dashboard/support" />}
      >
        <ArrowLeft className="size-4" />
        {t("detail.back")}
      </Button>
      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <TicketDetailPane ticketId={id} />
      </div>
    </div>
  );
}
