import { formatCompactCurrency } from "@/lib/utils";

type BarSeries = { name: string; color: string; values: number[] };

type FinancialBarChartProps = {
  seasons: number[];
  series: BarSeries[];
  yLabel?: string;
  height?: number;
  formatValue?: (v: number) => string;
};

export function FinancialBarChart({
  seasons,
  series,
  height = 200,
  formatValue = formatCompactCurrency,
}: FinancialBarChartProps) {
  if (seasons.length === 0 || series.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-dashed border-line bg-mist/30 py-10">
        <p className="text-sm text-ink/50">No historical data yet.</p>
      </div>
    );
  }

  const allValues = series.flatMap((s) => s.values);
  const maxY = Math.max(...allValues, 0.1) * 1.12;

  const PADDING = { top: 16, right: 16, bottom: 32, left: 52 };
  const chartW = 600;
  const chartH = height;
  const innerW = chartW - PADDING.left - PADDING.right;
  const innerH = chartH - PADDING.top - PADDING.bottom;

  const groupW = innerW / seasons.length;
  const barW = Math.max(4, (groupW * 0.7) / series.length);
  const groupPad = groupW * 0.15;

  function barX(seasonIdx: number, seriesIdx: number) {
    return PADDING.left + seasonIdx * groupW + groupPad + seriesIdx * barW;
  }

  function barH(value: number) {
    return Math.max(2, (value / maxY) * innerH);
  }

  function barY(value: number) {
    return PADDING.top + innerH - barH(value);
  }

  const yTicks = 4;

  return (
    <div className="space-y-3">
      <svg
        viewBox={`0 0 ${chartW} ${chartH}`}
        className="w-full"
        style={{ maxHeight: height }}
        aria-label="Bar chart"
      >
        {/* Y gridlines + labels */}
        {Array.from({ length: yTicks + 1 }).map((_, i) => {
          const value = (maxY * i) / yTicks;
          const y = PADDING.top + innerH - (value / maxY) * innerH;
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

        {/* X labels */}
        {seasons.map((year, i) => (
          <text
            key={year}
            x={PADDING.left + i * groupW + groupW / 2}
            y={chartH - 6}
            textAnchor="middle"
            fontSize={10}
            fill="currentColor"
            fillOpacity={0.5}
          >
            {year}
          </text>
        ))}

        {/* Bars */}
        {series.map((s, si) =>
          seasons.map((year, yi) => {
            const value = s.values[yi] ?? 0;
            return (
              <rect
                key={`${s.name}-${year}`}
                x={barX(yi, si)}
                y={barY(value)}
                width={barW - 1}
                height={barH(value)}
                fill={s.color}
                rx={2}
                opacity={0.85}
              >
                <title>
                  {s.name} — Season {year}: {formatValue(value)}
                </title>
              </rect>
            );
          })
        )}
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
