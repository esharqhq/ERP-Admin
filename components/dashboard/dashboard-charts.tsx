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

/**
 * Every colour here is a token reference, not a hex. The literals this replaced
 * — indigo, emerald, amber, a violet fallback — were the one part of the console
 * that a palette swap in `globals.css` could not reach, so the charts stayed on
 * the old brand while everything around them moved.
 *
 * The trend pair is separated by lightness rather than hue: forest against fresh
 * green stays legible where two mid-tone greens would not.
 */
const CREATED_COLOR = "var(--chart-1)"; /* forest 700 */
const COMPLETED_COLOR = "var(--chart-3)"; /* fresh */

/**
 * Donut slices speak the DS's controlled status vocabulary. `active` takes the
 * forest ramp rather than the success green it shares a meaning with in the DS
 * chip set — adjacent slices have to be told apart, and a donut has no label to
 * lean on.
 */
const STATUS_COLORS: Record<string, string> = {
  pending: "var(--status-pending)",
  active: "var(--chart-2)",
  done: "var(--status-active)",
  completed: "var(--status-active)",
  cancelled: "var(--neutral-muted)",
  rejected: "var(--status-cancelled)",
};
const STATUS_FALLBACK = "var(--forest-300)";

const TOOLTIP_STYLE: React.CSSProperties = {
  borderRadius: 10 /* DS md — chips, tiles and small overlays */,
  border: "1px solid var(--border)",
  background: "var(--popover)",
  color: "var(--popover-foreground)",
  fontSize: 12,
};

/**
 * Both charts are sized as `width="100%" height={CHART_HEIGHT}` rather than two
 * percentages, and the wrappers below carry the matching `h-[260px]`. With both
 * dimensions percentage-based, `ResponsiveContainer` renders one pass on its
 * `initialDimension` of -1/-1 before the ResizeObserver reports the real box,
 * and that pass trips recharts' own "The width(-1) and height(-1) of chart
 * should be greater than 0" warning on every mount — twice per dashboard load.
 * One fixed dimension satisfies the check; the width is still measured, so the
 * charts stay responsive. Change this number and the wrapper class together.
 */
const CHART_HEIGHT = 260;

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
    <div className="relative h-[260px] w-full">
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
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
    </div>
  );
}

/** TaskGroup status distribution donut. */
export function StatusDonut({ data }: { data: StatusBreakdownItem[] }) {
  // Drop zero slices so the donut renders only real segments (legend still
  // covers what's present); the parent shows an empty state when total === 0.
  const slices = data.filter((d) => d.count > 0);

  return (
    <div className="relative h-[260px] w-full">
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
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
            // The gap between slices is the card showing through, so it tracks
            // `--card` — the donut lives inside one, not on the page ground.
            stroke="var(--card)"
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
    </div>
  );
}
