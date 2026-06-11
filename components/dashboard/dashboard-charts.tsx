"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { normalizeStatus } from "@/lib/types/task.types";
import type {
  StatusBreakdownItem,
  TrendPoint,
} from "@/lib/types/analytics.types";

const CREATED_COLOR = "#6366f1"; // indigo
const COMPLETED_COLOR = "#10b981"; // emerald

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  active: "#3b82f6",
  done: "#10b981",
  completed: "#10b981",
  cancelled: "#94a3b8",
  rejected: "#ef4444",
};
const STATUS_FALLBACK = "#a78bfa";

const TOOLTIP_STYLE: React.CSSProperties = {
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--popover)",
  color: "var(--popover-foreground)",
  fontSize: 12,
};

/** 30-day created-vs-completed task trend. */
export function TrendChart({
  data,
  locale,
  labels,
}: {
  data: TrendPoint[];
  locale: string;
  labels: { created: string; completed: string };
}) {
  const fmtTick = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? iso
      : d.toLocaleDateString(locale, { month: "short", day: "numeric" });
  };

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="grad-created" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CREATED_COLOR} stopOpacity={0.35} />
            <stop offset="95%" stopColor={CREATED_COLOR} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="grad-completed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={COMPLETED_COLOR} stopOpacity={0.35} />
            <stop offset="95%" stopColor={COMPLETED_COLOR} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={fmtTick}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          minTickGap={24}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          width={36}
        />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelFormatter={(iso) => fmtTick(String(iso))}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area
          type="monotone"
          dataKey="created"
          name={labels.created}
          stroke={CREATED_COLOR}
          strokeWidth={2}
          fill="url(#grad-created)"
        />
        <Area
          type="monotone"
          dataKey="completed"
          name={labels.completed}
          stroke={COMPLETED_COLOR}
          strokeWidth={2}
          fill="url(#grad-completed)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** TaskGroup status distribution donut. */
export function StatusDonut({ data }: { data: StatusBreakdownItem[] }) {
  // Drop zero slices so the donut renders only real segments (legend still
  // covers what's present); the parent shows an empty state when total === 0.
  const slices = data.filter((d) => d.count > 0);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Pie
          data={slices}
          dataKey="count"
          nameKey="status"
          cx="50%"
          cy="50%"
          innerRadius={56}
          outerRadius={92}
          paddingAngle={2}
          stroke="var(--background)"
          strokeWidth={2}
        >
          {slices.map((d) => (
            <Cell
              key={d.status}
              fill={STATUS_COLORS[normalizeStatus(d.status)] ?? STATUS_FALLBACK}
            />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
