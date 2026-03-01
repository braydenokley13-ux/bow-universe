import type { ReactNode } from "react";

import { CoachPanel } from "@/components/coach-panel";
import type {
  CoachFieldEvaluationLike,
  CoachStepDefinitionLike,
  CoachStepEvaluationLike
} from "@/lib/coach-ui";

type ProjectStepLayoutProps = {
  step: CoachStepDefinitionLike;
  evaluation: CoachStepEvaluationLike;
  warningItems?: string[];
  children: ReactNode;
};

type ProjectFieldBlockProps = {
  label: string;
  detail: string;
  children: ReactNode;
  coach?: ReactNode;
};

export function ProjectStepLayout({
  step,
  evaluation,
  warningItems,
  children
}: ProjectStepLayoutProps) {
  return (
    <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="panel p-6">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent">{step.shortTitle}</p>
        <h3 className="mt-3 font-display text-3xl text-ink">{step.title}</h3>

        {warningItems && warningItems.length > 0 ? (
          <div className="mt-5 rounded-2xl border border-warn/25 bg-warn/10 p-4">
            <p className="font-medium text-ink">Before you continue</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/70">
              {warningItems.map((item) => (
                <li key={item} className="rounded-2xl border border-warn/20 bg-white/70 px-4 py-3">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-6 space-y-6">{children}</div>
      </div>

      <CoachPanel step={step} evaluation={evaluation} />
    </section>
  );
}

export function ProjectFieldBlock({
  label,
  detail,
  children,
  coach
}: ProjectFieldBlockProps) {
  return (
    <div className="rounded-[28px] border border-line bg-white/65 p-5">
      <div>
        <label className="block font-medium text-ink">{label}</label>
        <p className="mt-2 text-sm leading-6 text-ink/66">{detail}</p>
      </div>
      <div className="mt-4">{children}</div>
      {coach}
    </div>
  );
}

export function projectStatusSummaryCard(evaluation: CoachFieldEvaluationLike, title = "Field status") {
  return (
    <div className="rounded-2xl border border-line bg-white/70 p-4">
      <p className="font-medium text-ink">{title}</p>
      <p className="mt-2 text-sm leading-6 text-ink/68">{evaluation.message}</p>
    </div>
  );
}
