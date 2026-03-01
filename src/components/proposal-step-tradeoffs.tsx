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

type ProposalStepTradeoffsProps = {
  step: ProposalCoachStepDefinition;
  evaluation: ProposalCoachStepEvaluation;
  fieldEvaluation: ProposalCoachFieldEvaluation;
  value: string;
  onChange: (value: string) => void;
  onUseStarter: (starter: string) => void;
  warningItems?: string[];
};

export function ProposalStepTradeoffs({
  step,
  evaluation,
  fieldEvaluation,
  value,
  onChange,
  onUseStarter,
  warningItems
}: ProposalStepTradeoffsProps) {
  return (
    <ProposalStepLayout step={step} evaluation={evaluation} warningItems={warningItems}>
      <ProposalFieldBlock
        label="Tradeoffs"
        detail="A strong memo admits what becomes harder if the reform is adopted."
        coach={<FieldCoach evaluation={fieldEvaluation} onUseStarter={onUseStarter} />}
      >
        <StepTextarea
          id="proposal-field-tradeoffs"
          name="tradeoffs"
          value={value}
          rows={7}
          onChange={onChange}
          placeholder="This reform helps ..., but it also risks ..."
        />
      </ProposalFieldBlock>
    </ProposalStepLayout>
  );
}
