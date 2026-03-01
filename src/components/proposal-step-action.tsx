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

type ProposalStepActionProps = {
  step: ProposalCoachStepDefinition;
  evaluation: ProposalCoachStepEvaluation;
  recommendationEvaluation: ProposalCoachFieldEvaluation;
  methodsEvaluation: ProposalCoachFieldEvaluation;
  recommendation: string;
  methodsSummary: string;
  onChangeRecommendation: (value: string) => void;
  onChangeMethods: (value: string) => void;
  onUseRecommendationStarter: (starter: string) => void;
  onUseMethodsStarter: (starter: string) => void;
  warningItems?: string[];
};

export function ProposalStepAction({
  step,
  evaluation,
  recommendationEvaluation,
  methodsEvaluation,
  recommendation,
  methodsSummary,
  onChangeRecommendation,
  onChangeMethods,
  onUseRecommendationStarter,
  onUseMethodsStarter,
  warningItems
}: ProposalStepActionProps) {
  return (
    <ProposalStepLayout step={step} evaluation={evaluation} warningItems={warningItems}>
      <ProposalFieldBlock
        label="Recommendation"
        detail="Say who should act and what the league should do next."
        coach={<FieldCoach evaluation={recommendationEvaluation} onUseStarter={onUseRecommendationStarter} />}
      >
        <StepTextarea
          id="proposal-field-recommendation"
          name="recommendation"
          value={recommendation}
          rows={6}
          onChange={onChangeRecommendation}
          placeholder="The commissioner should ..."
        />
      </ProposalFieldBlock>

      <ProposalFieldBlock
        label="Methods summary"
        detail="Optional, but useful: explain how you studied the proposal and the rules."
        coach={<FieldCoach evaluation={methodsEvaluation} onUseStarter={onUseMethodsStarter} />}
      >
        <StepTextarea
          id="proposal-field-methodsSummary"
          name="methodsSummary"
          value={methodsSummary}
          rows={4}
          onChange={onChangeMethods}
          placeholder="I compared the active RuleSet to a proposed rule diff and used the BOW sandbox ..."
        />
      </ProposalFieldBlock>
    </ProposalStepLayout>
  );
}
