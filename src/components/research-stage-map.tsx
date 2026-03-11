import { cn } from "@/lib/utils";
import type { ResearchStageNextStep, ResearchStageStep } from "@/lib/research-stage";

type ResearchStageMapProps = {
  eyebrow?: string;
  title: string;
  description: string;
  steps: ResearchStageStep[];
  nextStep?: ResearchStageNextStep | null;
  compact?: boolean;
  simulationPreviewAvailable?: boolean;
  simulationPreviewLabel?: string;
  className?: string;
};

function toneForStatus(status: ResearchStageStep["status"]) {
  switch (status) {
    case "done":
      return "border-success/25 bg-success/10 text-success";
    case "active":
      return "border-accent bg-accent text-white";
    case "preview":
      return "border-accent/25 bg-accent/10 text-accent";
    default:
      return "border-line bg-white/75 text-ink/62";
  }
}

function badgeLabel(status: ResearchStageStep["status"]) {
  if (status === "done") return "Done";
  if (status === "active") return "Now";
  if (status === "preview") return "Preview";
  return "Later";
}

function descriptionTone(status: ResearchStageStep["status"]) {
  if (status === "active") return "text-white/88";
  if (status === "done") return "text-success";
  if (status === "preview") return "text-accent";
  return "text-ink/68";
}

export function ResearchStageMap({
  eyebrow = "Research map",
  title,
  description,
  steps,
  nextStep = null,
  compact = false,
  simulationPreviewAvailable = false,
  simulationPreviewLabel = "You can preview the system-testing step early, even before the full sandbox opens up later.",
  className
}: ResearchStageMapProps) {
  return (
    <section className={cn("panel p-6", className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">{eyebrow}</p>
          <h3 className="mt-3 font-display text-2xl text-ink">{title}</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/70">{description}</p>
        </div>
        {simulationPreviewAvailable ? (
          <div className="rounded-2xl border border-accent/20 bg-accent/5 px-4 py-3 text-sm leading-6 text-ink/70">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">System test</p>
            <p className="mt-2">{simulationPreviewLabel}</p>
          </div>
        ) : null}
      </div>

      <div className={cn("mt-6 grid gap-4", compact ? "md:grid-cols-5" : "md:grid-cols-2 xl:grid-cols-5")}>
        {steps.map((step, index) => (
          <article
            key={step.id}
            className={cn("rounded-[24px] border p-4 shadow-panel", toneForStatus(step.status))}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.18em]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="rounded-full border border-current/20 bg-current/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em]">
                {badgeLabel(step.status)}
              </span>
            </div>
            <p className="mt-4 font-medium">{step.label}</p>
            <p
              className={cn(
                "mt-2 text-sm leading-6",
                descriptionTone(step.status)
              )}
            >
              {step.description}
            </p>
          </article>
        ))}
      </div>

      {nextStep ? (
        <div className="mt-6 rounded-[24px] border border-line bg-white/70 p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-accent">Best next move</p>
          <p className="mt-3 font-medium text-ink">{nextStep.title}</p>
          <p className="mt-2 text-sm leading-6 text-ink/68">{nextStep.detail}</p>
        </div>
      ) : null}
    </section>
  );
}
