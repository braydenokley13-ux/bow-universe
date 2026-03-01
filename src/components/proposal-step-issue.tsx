import type { Issue } from "@prisma/client";

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

type ProposalStepIssueProps = {
  step: ProposalCoachStepDefinition;
  evaluation: ProposalCoachStepEvaluation;
  fieldEvaluation: ProposalCoachFieldEvaluation;
  value: string;
  issues: Array<Issue & { team?: { name: string } | null }>;
  onChange: (value: string) => void;
  warningItems?: string[];
};

export function ProposalStepIssue({
  step,
  evaluation,
  fieldEvaluation,
  value,
  issues,
  onChange,
  warningItems
}: ProposalStepIssueProps) {
  return (
    <ProposalStepLayout step={step} evaluation={evaluation} warningItems={warningItems}>
      <ProposalFieldBlock
        label="Live issue"
        detail="Choose the real league problem this memo is trying to solve."
        coach={<FieldCoach evaluation={fieldEvaluation} />}
      >
        <select
          id="proposal-field-issueId"
          name="issueId"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-2xl border border-line bg-white/90 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
        >
          <option value="">Choose issue</option>
          {issues.map((issue) => (
            <option key={issue.id} value={issue.id}>
              {issue.title}
              {issue.team ? ` · ${issue.team.name}` : ""}
            </option>
          ))}
        </select>
      </ProposalFieldBlock>
    </ProposalStepLayout>
  );
}
