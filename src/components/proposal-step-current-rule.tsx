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

type ProposalStepCurrentRuleProps = {
  step: ProposalCoachStepDefinition;
  evaluation: ProposalCoachStepEvaluation;
  fieldEvaluation: ProposalCoachFieldEvaluation;
  value: string;
  onChange: (value: string) => void;
  onUseStarter: (starter: string) => void;
  warningItems?: string[];
};

export function ProposalStepCurrentRule({
  step,
  evaluation,
  fieldEvaluation,
  value,
  onChange,
  onUseStarter,
  warningItems
}: ProposalStepCurrentRuleProps) {
  return (
    <ProposalStepLayout step={step} evaluation={evaluation} warningItems={warningItems}>
      <ProposalFieldBlock
        label="Current rule context"
        detail="Explain how the rule works today before you argue for the change."
        coach={<FieldCoach evaluation={fieldEvaluation} onUseStarter={onUseStarter} />}
      >
        <StepTextarea
          id="proposal-field-currentRuleContext"
          name="currentRuleContext"
          value={value}
          rows={7}
          onChange={onChange}
          placeholder="Under the current RuleSet, the league ..."
        />
      </ProposalFieldBlock>
    </ProposalStepLayout>
  );
}
