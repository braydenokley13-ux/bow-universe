import type { ReactNode } from "react";

import { CoachPanel } from "@/components/coach-panel";
import type {
  ProposalCoachFieldEvaluation,
  ProposalCoachStepDefinition,
  ProposalCoachStepEvaluation
} from "@/lib/proposal-wizard";

type ProposalStepLayoutProps = {
  step: ProposalCoachStepDefinition;
  evaluation: ProposalCoachStepEvaluation;
  warningItems?: string[];
  children: ReactNode;
};

type ProposalFieldBlockProps = {
  label: string;
  detail: string;
  children: ReactNode;
  coach?: ReactNode;
};

export function ProposalStepLayout({
  step,
  evaluation,
  warningItems,
  children
}: ProposalStepLayoutProps) {
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

export function ProposalFieldBlock({
  label,
  detail,
  children,
  coach
}: ProposalFieldBlockProps) {
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

type StepTextareaProps = {
  id: string;
  name: string;
  rows?: number;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
};

type StepInputProps = {
  id: string;
  name: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
};

export function StepTextarea({
  id,
  name,
  rows = 5,
  value,
  placeholder,
  onChange
}: StepTextareaProps) {
  return (
    <textarea
      id={id}
      name={name}
      rows={rows}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full rounded-2xl border border-line bg-white/90 px-4 py-3 text-sm leading-6 text-ink outline-none focus:border-accent"
    />
  );
}

export function StepInput({ id, name, value, placeholder, onChange }: StepInputProps) {
  return (
    <input
      id={id}
      name={name}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full rounded-2xl border border-line bg-white/90 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
    />
  );
}

export function statusSummaryCard(evaluation: ProposalCoachFieldEvaluation, title = "Field status") {
  return (
    <div className="rounded-2xl border border-line bg-white/70 p-4">
      <p className="font-medium text-ink">{title}</p>
      <p className="mt-2 text-sm leading-6 text-ink/68">{evaluation.message}</p>
    </div>
  );
}
