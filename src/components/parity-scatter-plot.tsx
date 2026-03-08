type ScatterPoint = { year: number; value: number; label?: string };

type ParityScatterPlotProps = {
  points: ScatterPoint[];
  yLabel?: string;
  height?: number;
};

export function ParityScatterPlot({
  points,
  yLabel = "Parity Index",
  height = 180,
}: ParityScatterPlotProps) {
  if (points.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-dashed border-line bg-mist/30 py-10">
        <p className="text-sm text-ink/50">No parity data yet. Advance a season to see trends.</p>
      </div>
    );
  }

  const allValues = points.map((p) => p.value);
  const minY = Math.min(...allValues) * 0.85;
  const maxY = Math.max(...allValues) * 1.15;
  const rangeY = maxY - minY || 1;
  const allYears = [...new Set(points.map((p) => p.year))].sort((a, b) => a - b);

  const PADDING = { top: 16, right: 24, bottom: 32, left: 48 };
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

  const yTicks = 3;

  return (
    <svg
      viewBox={`0 0 ${chartW} ${chartH}`}
      className="w-full"
      style={{ maxHeight: height }}
      aria-label={`${yLabel} scatter plot`}
    >
      {/* Gridlines + Y labels */}
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
              {value.toFixed(1)}
            </text>
          </g>
        );
      })}

      {/* Trend line if enough points */}
      {allYears.length >= 2 && (
        <line
          x1={xPos(allYears[0])}
          y1={yPos(points.find((p) => p.year === allYears[0])?.value ?? 0)}
          x2={xPos(allYears[allYears.length - 1])}
          y2={yPos(points.find((p) => p.year === allYears[allYears.length - 1])?.value ?? 0)}
          stroke="#6366f1"
          strokeOpacity={0.2}
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
      )}

      {/* X labels */}
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

      {/* Scatter dots */}
      {points.map((p) => (
        <circle
          key={p.year}
          cx={xPos(p.year)}
          cy={yPos(p.value)}
          r={5}
          fill="#6366f1"
          fillOpacity={0.75}
        >
          <title>
            {yLabel} — Season {p.year}: {p.value.toFixed(2)}
            {p.label ? ` (${p.label})` : ""}
          </title>
        </circle>
      ))}
    </svg>
  );
}
