import { FieldCoach } from "@/components/field-coach";
import {
  ProposalFieldBlock,
  ProposalStepLayout,
  StepTextarea
} from "@/components/proposal-step-shared";
import type {
  ProposalCoachFieldEvaluation,
  ProposalCoachStepDefinition,
  ProposalCoachStepEvaluation
} from "@/lib/proposal-wizard";

type ProposalStepProblemProps = {
  step: ProposalCoachStepDefinition;
  evaluation: ProposalCoachStepEvaluation;
  fieldEvaluation: ProposalCoachFieldEvaluation;
  value: string;
  onChange: (value: string) => void;
  onUseStarter: (starter: string) => void;
  warningItems?: string[];
};

export function ProposalStepProblem({
  step,
  evaluation,
  fieldEvaluation,
  value,
  onChange,
  onUseStarter,
  warningItems
}: ProposalStepProblemProps) {
  return (
    <ProposalStepLayout step={step} evaluation={evaluation} warningItems={warningItems}>
      <ProposalFieldBlock
        label="Problem"
        detail="Describe what is going wrong, who feels the pressure, and why it matters."
        coach={<FieldCoach evaluation={fieldEvaluation} onUseStarter={onUseStarter} />}
      >
        <StepTextarea
          id="proposal-field-problem"
          name="problem"
          value={value}
          rows={7}
          onChange={onChange}
          placeholder="Right now, the league creates a problem because ..."
        />
      </ProposalFieldBlock>
    </ProposalStepLayout>
  );
}
