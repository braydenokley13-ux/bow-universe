import type { RuleSet } from "@prisma/client";

import { FieldCoach } from "@/components/field-coach";
import {
  ProposalFieldBlock,
  ProposalStepLayout
} from "@/components/proposal-step-shared";
import type {
  ProposalCoachFieldEvaluation,
  ProposalCoachStepDefinition,
  ProposalCoachStepEvaluation
} from "@/lib/proposal-wizard";

type ProposalStepRulesetProps = {
  step: ProposalCoachStepDefinition;
  evaluation: ProposalCoachStepEvaluation;
  fieldEvaluation: ProposalCoachFieldEvaluation;
  value: string;
  ruleSets: RuleSet[];
  onChange: (value: string) => void;
  warningItems?: string[];
};

export function ProposalStepRuleset({
  step,
  evaluation,
  fieldEvaluation,
  value,
  ruleSets,
  onChange,
  warningItems
}: ProposalStepRulesetProps) {
  return (
    <ProposalStepLayout step={step} evaluation={evaluation} warningItems={warningItems}>
      <ProposalFieldBlock
        label="Rule baseline"
        detail="Pick the exact ruleset version this proposal wants to change."
        coach={<FieldCoach evaluation={fieldEvaluation} />}
      >
        <select
          id="proposal-field-ruleSetId"
          name="ruleSetId"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-2xl border border-line bg-white/90 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
        >
          <option value="">Choose RuleSet</option>
          {ruleSets.map((ruleSet) => (
            <option key={ruleSet.id} value={ruleSet.id}>
              RuleSet v{ruleSet.version}
            </option>
          ))}
        </select>
      </ProposalFieldBlock>
    </ProposalStepLayout>
  );
}
