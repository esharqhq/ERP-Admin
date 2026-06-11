"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Users, UserCheck, UserX, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAttendance } from "@/hooks/use-attendance";
import { useHasPermission } from "@/hooks/use-current-permissions";
import { normalizeStatus } from "@/lib/types/task.types";
import type { AttendanceRowDto } from "@/lib/types/attendance.types";

/** UTC today — matches the backend's UTC-today default; stable across SSR/hydration. */
const todayUtc = () => new Date().toISOString().slice(0, 10);

function fmtTime(iso: string | null, locale: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

function OutcomeBadge({ value }: { value: string }) {
  const s = normalizeStatus(value);
  const variant =
    s === "completed" || s === "done"
      ? "default"
      : s === "pending"
        ? "secondary"
        : s === "rejected" || s === "cancelled"
          ? "destructive"
          : "outline";
  return <Badge variant={variant}>{value || "—"}</Badge>;
}

export default function AttendancePage() {
  const t = useTranslations("attendance");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const canRead = useHasPermission("system:attendance:read");
  const [date, setDate] = useState(todayUtc);
  const [search, setSearch] = useState("");

  const { data: rows = [], isLoading, isError } = useAttendance(date, canRead);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.workerName.toLowerCase().includes(q));
  }, [rows, search]);

  const stats = useMemo(() => {
    const present = rows.filter((r) => r.present).length;
    return { assigned: rows.length, present, absent: rows.length - present };
  }, [rows]);

  if (!canRead) {
    return (
      <div className="flex flex-col gap-6">
        <Header t={t} />
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            {t("noAccess")}
          </CardContent>
        </Card>
      </div>
    );
  }

  const statCards = [
    { key: "assigned", value: stats.assigned, icon: Users, color: "text-blue-500" },
    { key: "present", value: stats.present, icon: UserCheck, color: "text-emerald-500" },
    { key: "absent", value: stats.absent, icon: UserX, color: "text-destructive" },
  ] as const;

  return (
    <div className="flex flex-col gap-6">
      <Header t={t} />

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-muted-foreground">
            {t("dateLabel")}
          </span>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value || todayUtc())}
            className="w-44"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-muted-foreground">
            {tCommon("search")}
          </span>
          <Input
            type="search"
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {statCards.map(({ key, value, icon: Icon, color }) => (
          <Card key={key}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t(`stats.${key}`)}
              </CardTitle>
              <Icon className={`size-4 ${color}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-12 rounded-md" />
              ) : (
                <div className="text-3xl font-bold tracking-tight">{value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <p className="text-xs text-muted-foreground">
            {isLoading
              ? tCommon("loading")
              : tCommon("resultsFound", { count: filtered.length })}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columns.worker")}</TableHead>
                <TableHead>{t("columns.task")}</TableHead>
                <TableHead>{t("columns.property")}</TableHead>
                <TableHead>{t("columns.scheduled")}</TableHead>
                <TableHead>{t("columns.present")}</TableHead>
                <TableHead>{t("columns.checkIn")}</TableHead>
                <TableHead>{t("columns.checkOut")}</TableHead>
                <TableHead>{t("columns.outcome")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}>
                      <Skeleton className="h-8 w-full rounded-md" />
                    </TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-destructive">
                    {tCommon("error")}
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                    {t("empty")}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => <AttendanceRow key={r.taskId} row={r} locale={locale} t={t} />)
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function AttendanceRow({
  row,
  locale,
  t,
}: {
  row: AttendanceRowDto;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const hasCoords = row.checkinLat != null && row.checkinLng != null;
  return (
    <TableRow className="hover:bg-accent/40">
      <TableCell className="py-3 font-medium">{row.workerName}</TableCell>
      <TableCell className="text-sm">
        <Link
          href={`/dashboard/tasks/${row.taskGroupId}`}
          className="text-muted-foreground underline-offset-2 hover:underline"
        >
          {row.taskGroupTitle || row.taskId.slice(0, 8)}
        </Link>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{row.propertyName}</TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {fmtTime(row.scheduledAt, locale)}
      </TableCell>
      <TableCell>
        <Badge variant={row.present ? "default" : "destructive"}>
          {row.present ? t("present.yes") : t("present.no")}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          {fmtTime(row.checkinAt, locale)}
          {hasCoords && (
            <a
              href={`https://www.google.com/maps?q=${row.checkinLat},${row.checkinLng}`}
              target="_blank"
              rel="noopener noreferrer"
              title={`${row.checkinLat}, ${row.checkinLng}`}
              className="text-primary hover:opacity-80"
            >
              <MapPin className="size-3.5" />
            </a>
          )}
        </span>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {fmtTime(row.checkoutAt, locale)}
      </TableCell>
      <TableCell>
        <OutcomeBadge value={row.outcome} />
      </TableCell>
    </TableRow>
  );
}

function Header({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="flex flex-col gap-1">
      <h1 className="font-heading text-3xl font-bold tracking-tight leading-tight">
        {t("title")}
      </h1>
      <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
    </div>
  );
}
