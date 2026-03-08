import type { SandboxImpactReport } from "@/lib/types";

type SandboxScenarioCardProps = {
  id: string;
  name: string;
  description?: string | null;
  ruleSetVersion: number;
  result?: SandboxImpactReport | null;
  createdByName?: string;
  isPublic: boolean;
  createdAt: Date;
  isOwner: boolean;
};

function deltaLabel(value: number) {
  if (value > 0.005) return `+${value.toFixed(2)} ↑`;
  if (value < -0.005) return `${value.toFixed(2)} ↓`;
  return "~0 (no change)";
}

export function SandboxScenarioCard({
  name,
  description,
  ruleSetVersion,
  result,
  createdByName,
  isPublic,
  createdAt
}: SandboxScenarioCardProps) {
  return (
    <div className="rounded-2xl border border-line bg-white/60 p-5 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-ink">{name}</p>
          {description && <p className="mt-1 text-sm leading-5 text-ink/62">{description}</p>}
        </div>
        <div className="flex flex-wrap gap-2 text-right">
          <span className="inline-flex rounded-full border border-line bg-white/70 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-ink/60">
            v{ruleSetVersion}
          </span>
          {isPublic && (
            <span className="inline-flex rounded-full border border-success/30 bg-success/10 px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-success">
              Shared
            </span>
          )}
        </div>
      </div>

      {result && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Parity Δ", value: result.delta.parityIndex },
            { label: "Inequality Δ", value: result.delta.revenueInequality },
            { label: "Tax conc. Δ", value: result.delta.taxConcentration },
            { label: "Small vs big Δ", value: result.delta.smallVsBigCompetitiveness }
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-line bg-mist/40 px-3 py-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink/45">{label}</p>
              <p className="mt-1 text-sm font-medium text-ink">{deltaLabel(value)}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-ink/45">
        {createdByName && <span>By {createdByName}</span>}
        <span>
          {new Date(createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric"
          })}
        </span>
      </div>
    </div>
  );
}
