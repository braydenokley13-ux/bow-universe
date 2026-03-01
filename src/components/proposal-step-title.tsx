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
    </ProposalStepLayout>
  );
}
