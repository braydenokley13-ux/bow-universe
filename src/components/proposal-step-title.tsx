import { FieldCoach } from "@/components/field-coach";
import {
  ProposalFieldBlock,
  ProposalStepLayout,
  StepInput
} from "@/components/proposal-step-shared";
import type {
  ProposalCoachFieldEvaluation,
  ProposalCoachStepDefinition,
  ProposalCoachStepEvaluation
} from "@/lib/proposal-wizard";

type ProposalStepTitleProps = {
  step: ProposalCoachStepDefinition;
  evaluation: ProposalCoachStepEvaluation;
  fieldEvaluation: ProposalCoachFieldEvaluation;
  value: string;
  onChange: (value: string) => void;
  onUseStarter: (starter: string) => void;
  warningItems?: string[];
};

export function ProposalStepTitle({
  step,
  evaluation,
  fieldEvaluation,
  value,
  onChange,
  onUseStarter,
  warningItems
}: ProposalStepTitleProps) {
  return (
    <ProposalStepLayout step={step} evaluation={evaluation} warningItems={warningItems}>
      <ProposalFieldBlock
        label="Decision title"
        detail="Write the title like a decision the league could actually make."
        coach={<FieldCoach evaluation={fieldEvaluation} onUseStarter={onUseStarter} />}
      >
        <StepInput
          id="proposal-field-title"
          name="title"
          value={value}
          onChange={onChange}
          placeholder="Raise the revenue sharing rate to protect small-market flexibility"
        />
      </ProposalFieldBlock>

      <div className="mt-6 rounded-2xl border border-line bg-white/65 p-5">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">See an example</p>
        <p className="mt-2 font-medium text-ink">
          Raise the revenue sharing rate to protect small-market flexibility
        </p>
        <p className="mt-2 text-sm leading-6 text-ink/68">
          Small-market teams lose long-term flexibility faster than large-market teams when tax concentration rises, because the current revenue sharing rate does not compensate for the structural revenue gap between markets.
        </p>
        <p className="mt-3 text-xs text-ink/50">
          A strong title names the reform. A strong problem statement says who is hurt and why the current rule causes it.
        </p>
      </div>
    </ProposalStepLayout>
  );
}
