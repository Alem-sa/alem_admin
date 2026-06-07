"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--popover-foreground)",
} as const;

const axisTick = { fontSize: 12, fill: "var(--muted-foreground)" } as const;

/** Single-metric daily chart, rendered as an area or bar chart. */
export function MetricChart({
  data,
  dataKey,
  name,
  color,
  kind,
}: {
  data: ReadonlyArray<Record<string, string | number>>;
  dataKey: string;
  name: string;
  color: string;
  kind: "area" | "bar";
}) {
  // Render only after mount: Recharts needs a real width, and this avoids any
  // SSR/hydration mismatch from the responsive container.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) {
    return <div className="h-64 w-full animate-pulse rounded-lg bg-muted/40" />;
  }

  const gradId = `grad-${dataKey}`;
  const margin = { top: 8, right: 12, left: -12, bottom: 0 };

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {kind === "area" ? (
          <AreaChart data={data as unknown[]} margin={margin}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axisTick} minTickGap={24} />
            <YAxis allowDecimals={false} width={40} tickLine={false} axisLine={false} tick={axisTick} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area
              type="monotone"
              dataKey={dataKey}
              name={name}
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradId})`}
            />
          </AreaChart>
        ) : (
          <BarChart data={data as unknown[]} margin={margin}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axisTick} minTickGap={24} />
            <YAxis allowDecimals={false} width={40} tickLine={false} axisLine={false} tick={axisTick} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
            <Bar dataKey={dataKey} name={name} fill={color} radius={[2, 2, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
