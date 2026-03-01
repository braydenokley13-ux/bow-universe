import type { CoachStepDefinitionLike, CoachStepEvaluationLike } from "@/lib/coach-ui";

type CoachPanelProps = {
  step: CoachStepDefinitionLike;
  evaluation: CoachStepEvaluationLike;
};

export function CoachPanel({ step, evaluation }: CoachPanelProps) {
  return (
    <aside className="rounded-[28px] border border-line bg-white/75 p-5 shadow-panel">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Coach</p>
          <h3 className="mt-3 font-display text-2xl text-ink">{step.title}</h3>
        </div>
        <span className="rounded-full border border-line bg-mist px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-ink/70">
          {evaluation.status.replace("_", " ")}
        </span>
      </div>

      <div className="mt-5 space-y-5">
        <section>
          <p className="font-medium text-ink">Right now</p>
          <p className="mt-2 text-sm leading-6 text-ink/68">{step.rightNow}</p>
        </section>

        <section>
          <p className="font-medium text-ink">Why this matters</p>
          <p className="mt-2 text-sm leading-6 text-ink/68">{step.whyItMatters}</p>
        </section>

        <section>
          <p className="font-medium text-ink">Strong answer recipe</p>
          <ul className="mt-2 space-y-2 text-sm leading-6 text-ink/68">
            {step.recipe.map((item) => (
              <li key={item} className="rounded-2xl border border-line bg-white/65 px-4 py-3">
                {item}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <p className="font-medium text-ink">Next move</p>
          <p className="mt-2 rounded-2xl border border-accent/20 bg-accent/5 px-4 py-3 text-sm leading-6 text-ink/72">
            {evaluation.nextMove}
          </p>
        </section>
      </div>
    </aside>
  );
}
