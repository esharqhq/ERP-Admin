"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMinutes, formatPeriodLabel } from "@/lib/format-hours";
import type { HoursPeriodBucket } from "@/lib/types/analytics.types";

const BAR_COLOR = "#6366f1"; // indigo

const TOOLTIP_STYLE: React.CSSProperties = {
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--popover)",
  color: "var(--popover-foreground)",
  fontSize: 12,
};

/**
 * Hours-per-period bar chart. Periods are discrete buckets (`"2026-06"` /
 * `"2026-W23"`), so this uses `Bar`, not a continuous area series — and labels
 * via `formatPeriodLabel`, never `new Date(period)` (which would be Invalid Date).
 * The Y axis shows whole hours; the tooltip shows exact `Xh Ym`.
 */
export function HoursPeriodChart({
  data,
  locale,
  seriesLabel,
}: {
  data: HoursPeriodBucket[];
  locale: string;
  seriesLabel: string;
}) {
  const rows = data.map((d) => ({
    period: d.period,
    label: formatPeriodLabel(d.period, locale),
    minutes: d.totalMinutes,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          minTickGap={8}
        />
        <YAxis
          allowDecimals={false}
          tickFormatter={(m: number) => `${Math.floor(m / 60)}h`}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          width={44}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          cursor={{ fill: "var(--accent)", opacity: 0.4 }}
          formatter={(value) => [formatMinutes(Number(value)), seriesLabel]}
        />
        <Bar dataKey="minutes" name={seriesLabel} fill={BAR_COLOR} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
