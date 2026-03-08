"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";

type SparkChartProps = {
  data: Array<{ label: string; value: number }>;
  color?: string;
  height?: number;
  type?: "area" | "bar";
  showAxis?: boolean;
  yLabel?: string;
};

function CustomTooltip({
  active,
  payload,
  label
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2 shadow-panel">
      <p className="font-mono text-[10px] uppercase tracking-wider text-ink/50">{label}</p>
      <p className="mt-0.5 font-display text-sm font-semibold text-ink">{payload[0].value}</p>
    </div>
  );
}

export function SparkChart({
  data,
  color = "#6366f1",
  height = 80,
  type = "area",
  showAxis = false
}: SparkChartProps) {
  const gradientId = `grad-${color.replace("#", "")}`;

  if (type === "bar") {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: showAxis ? 32 : 0 }}>
          {showAxis && (
            <>
              <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#94a3b8", fontFamily: "var(--font-mono)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8", fontFamily: "var(--font-mono)" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) =>
                  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}k` : String(v)
                }
              />
            </>
          )}
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.06)" }} />
          <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: showAxis ? 32 : 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {showAxis && (
          <>
            <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#94a3b8", fontFamily: "var(--font-mono)" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#94a3b8", fontFamily: "var(--font-mono)" }}
              tickLine={false}
              axisLine={false}
            />
          </>
        )}
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
