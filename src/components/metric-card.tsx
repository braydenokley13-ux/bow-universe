import { TrendingDown, TrendingUp, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
  accent?: "default" | "success" | "warn" | "danger" | "info";
  trend?: { direction: "up" | "down" | "flat"; label: string };
};

const accentBorder: Record<NonNullable<MetricCardProps["accent"]>, string> = {
  default: "border-l-accent",
  success: "border-l-success",
  warn:    "border-l-warn",
  danger:  "border-l-danger",
  info:    "border-l-info"
};

const accentLabel: Record<NonNullable<MetricCardProps["accent"]>, string> = {
  default: "text-accent",
  success: "text-success",
  warn:    "text-warn",
  danger:  "text-danger",
  info:    "text-info"
};

const trendIcon = {
  up:   TrendingUp,
  down: TrendingDown,
  flat: Minus
};

const trendColor = {
  up:   "text-success",
  down: "text-danger",
  flat: "text-ink/50"
};

export function MetricCard({ label, value, detail, accent = "default", trend }: MetricCardProps) {
  const TrendIcon = trend ? trendIcon[trend.direction] : null;

  return (
    <article className={cn("panel border-l-[3px] p-5", accentBorder[accent])}>
      <p className={cn("text-[11px] font-semibold uppercase tracking-wider", accentLabel[accent])}>{label}</p>
      <p className="mt-3 font-display text-4xl font-bold text-ink">{value}</p>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <p className="text-[13px] leading-5 text-ink/65">{detail}</p>
        {TrendIcon && trend && (
          <span className={cn("flex items-center gap-1 font-mono text-[11px]", trendColor[trend.direction])}>
            <TrendIcon className="h-3.5 w-3.5" />
            {trend.label}
          </span>
        )}
      </div>
    </article>
  );
}
