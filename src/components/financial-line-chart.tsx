import { formatCompactCurrency } from "@/lib/utils";

type DataPoint = { year: number; value: number };
type Series = { name: string; color: string; points: DataPoint[] };

type FinancialLineChartProps = {
  series: Series[];
  yLabel: string;
  height?: number;
  formatValue?: (v: number) => string;
};

const COLORS = [
  "#6366f1", // indigo
  "#f59e0b", // amber
  "#10b981", // emerald
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#f97316", // orange
  "#84cc16", // lime
  "#ec4899", // pink
  "#14b8a6", // teal
  "#a855f7", // purple
  "#fb923c", // light orange
];

export function defaultColor(index: number) {
  return COLORS[index % COLORS.length];
}

export function FinancialLineChart({
  series,
  yLabel,
  height = 220,
  formatValue = formatCompactCurrency,
}: FinancialLineChartProps) {
  if (series.length === 0 || series.every((s) => s.points.length === 0)) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-dashed border-line bg-mist/30 py-10">
        <p className="text-sm text-ink/50">No historical data yet.</p>
      </div>
    );
  }

  const allPoints = series.flatMap((s) => s.points);
  const allYears = [...new Set(allPoints.map((p) => p.year))].sort((a, b) => a - b);
  const allValues = allPoints.map((p) => p.value);
  const minY = Math.min(...allValues) * 0.9;
  const maxY = Math.max(...allValues) * 1.1;
  const rangeY = maxY - minY || 1;

  const PADDING = { top: 16, right: 16, bottom: 32, left: 52 };
  const chartW = 600;
  const chartH = height;
  const innerW = chartW - PADDING.left - PADDING.right;
  const innerH = chartH - PADDING.top - PADDING.bottom;

  function xPos(year: number) {
    if (allYears.length === 1) return PADDING.left + innerW / 2;
    const idx = allYears.indexOf(year);
    return PADDING.left + (idx / (allYears.length - 1)) * innerW;
  }

  function yPos(value: number) {
    return PADDING.top + innerH - ((value - minY) / rangeY) * innerH;
  }

  const yTicks = 4;

  return (
    <div className="space-y-3">
      <svg
        viewBox={`0 0 ${chartW} ${chartH}`}
        className="w-full"
        style={{ maxHeight: height }}
        aria-label={`${yLabel} chart`}
      >
        {/* Y axis gridlines + labels */}
        {Array.from({ length: yTicks + 1 }).map((_, i) => {
          const value = minY + (rangeY * i) / yTicks;
          const y = yPos(value);
          return (
            <g key={i}>
              <line
                x1={PADDING.left}
                y1={y}
                x2={PADDING.left + innerW}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.08}
                strokeWidth={1}
              />
              <text
                x={PADDING.left - 6}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={10}
                fill="currentColor"
                fillOpacity={0.5}
              >
                {formatValue(value)}
              </text>
            </g>
          );
        })}

        {/* X axis labels */}
        {allYears.map((year) => (
          <text
            key={year}
            x={xPos(year)}
            y={chartH - 6}
            textAnchor="middle"
            fontSize={10}
            fill="currentColor"
            fillOpacity={0.5}
          >
            {year}
          </text>
        ))}

        {/* Series lines */}
        {series.map((s) => {
          if (s.points.length < 2) {
            return s.points.map((p) => (
              <circle
                key={`${s.name}-${p.year}`}
                cx={xPos(p.year)}
                cy={yPos(p.value)}
                r={4}
                fill={s.color}
              />
            ));
          }
          const d = s.points
            .sort((a, b) => a.year - b.year)
            .map((p, i) => `${i === 0 ? "M" : "L"} ${xPos(p.year)} ${yPos(p.value)}`)
            .join(" ");
          return (
            <g key={s.name}>
              <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" />
              {s.points.map((p) => (
                <circle key={p.year} cx={xPos(p.year)} cy={yPos(p.value)} r={3.5} fill={s.color}>
                  <title>
                    {s.name} — Season {p.year}: {formatValue(p.value)}
                  </title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      {series.length > 1 && (
        <div className="flex flex-wrap gap-4 px-1">
          {series.map((s) => (
            <div key={s.name} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span className="text-xs text-ink/60">{s.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
