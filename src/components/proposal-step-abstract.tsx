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

type ProposalStepAbstractProps = {
  step: ProposalCoachStepDefinition;
  evaluation: ProposalCoachStepEvaluation;
  fieldEvaluation: ProposalCoachFieldEvaluation;
  value: string;
  onChange: (value: string) => void;
  onUseStarter: (starter: string) => void;
  warningItems?: string[];
};

export function ProposalStepAbstract({
  step,
  evaluation,
  fieldEvaluation,
  value,
  onChange,
  onUseStarter,
  warningItems
}: ProposalStepAbstractProps) {
  return (
    <ProposalStepLayout step={step} evaluation={evaluation} warningItems={warningItems}>
      <ProposalFieldBlock
        label="Fast summary"
        detail="Tell the reader the problem, the reform, and the likely result before anything else."
        coach={<FieldCoach evaluation={fieldEvaluation} onUseStarter={onUseStarter} />}
      >
        <StepTextarea
          id="proposal-field-abstract"
          name="abstract"
          value={value}
          rows={6}
          onChange={onChange}
          placeholder="The league is struggling with ... This memo proposes ... If adopted, the change would likely ..."
        />
      </ProposalFieldBlock>
    </ProposalStepLayout>
  );
}
