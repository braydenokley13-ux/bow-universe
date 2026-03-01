import { roundTo } from "@/lib/utils";
import { FieldCoach } from "@/components/field-coach";
import {
  ProposalFieldBlock,
  ProposalStepLayout,
  StepTextarea
} from "@/components/proposal-step-shared";
import type {
  ProposalCoachFieldEvaluation,
  ProposalCoachStepDefinition,
  ProposalCoachStepEvaluation,
  SandboxFreshnessState
} from "@/lib/proposal-wizard";
import type { SandboxImpactReport } from "@/lib/types";

type ProposalStepSandboxProps = {
  step: ProposalCoachStepDefinition;
  evaluation: ProposalCoachStepEvaluation;
  diffEvaluation: ProposalCoachFieldEvaluation;
  sandboxEvaluation: ProposalCoachFieldEvaluation;
  interpretationEvaluation: ProposalCoachFieldEvaluation;
  diffJson: string;
  sandboxInterpretation: string;
  sandboxResult: SandboxImpactReport | null;
  sandboxFreshness: SandboxFreshnessState;
  sandboxError: string | null;
  isPending: boolean;
  diffError: string | null;
  onChangeDiff: (value: string) => void;
  onChangeInterpretation: (value: string) => void;
  onUseDiffStarter: (starter: string) => void;
  onUseInterpretationStarter: (starter: string) => void;
  onRunSandbox: () => void;
  warningItems?: string[];
};

function freshnessMessage(freshness: SandboxFreshnessState) {
  switch (freshness) {
    case "fresh":
      return "Fresh result. The evidence matches the current ruleset and diff.";
    case "stale":
      return "Stale result. You changed the ruleset or diff after the last run.";
    case "invalid":
      return "The diff is invalid, so the sandbox cannot run yet.";
    default:
      return "No sandbox result yet. Run the model once the diff is ready.";
  }
}

function metricLabel(label: string, value: number) {
  return `${label}: ${roundTo(value)}`;
}

export function ProposalStepSandbox({
  step,
  evaluation,
  diffEvaluation,
  sandboxEvaluation,
  interpretationEvaluation,
  diffJson,
  sandboxInterpretation,
  sandboxResult,
  sandboxFreshness,
  sandboxError,
  isPending,
  diffError,
  onChangeDiff,
  onChangeInterpretation,
  onUseDiffStarter,
  onUseInterpretationStarter,
  onRunSandbox,
  warningItems
}: ProposalStepSandboxProps) {
  return (
    <ProposalStepLayout step={step} evaluation={evaluation} warningItems={warningItems}>
      <ProposalFieldBlock
        label="Rule diff"
        detail="Build a usable JSON diff so the sandbox can test the rule change."
        coach={<FieldCoach evaluation={diffEvaluation} onUseStarter={onUseDiffStarter} />}
      >
        <StepTextarea
          id="proposal-field-diffJson"
          name="diffJson"
          value={diffJson}
          rows={14}
          onChange={onChangeDiff}
          placeholder='{"changes":[{"op":"replace","path":"/revenueSharingRate","value":0.16,"reason":"..."}]}'
        />
        <div className="mt-4 rounded-2xl border border-line bg-white/70 p-4">
          <p className="font-medium text-ink">Diff shape reminder</p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/68">
            <li className="rounded-2xl border border-line bg-white/80 px-4 py-3">
              <span className="font-medium text-ink">`op`</span>: what kind of change to make.
            </li>
            <li className="rounded-2xl border border-line bg-white/80 px-4 py-3">
              <span className="font-medium text-ink">`path`</span>: where in the rules the change goes.
            </li>
            <li className="rounded-2xl border border-line bg-white/80 px-4 py-3">
              <span className="font-medium text-ink">`value`</span>: the new rule value when needed.
            </li>
            <li className="rounded-2xl border border-line bg-white/80 px-4 py-3">
              <span className="font-medium text-ink">`reason`</span>: why this change belongs in the memo.
            </li>
          </ul>
        </div>
      </ProposalFieldBlock>

      <ProposalFieldBlock
        label="Sandbox evidence"
        detail="Run the model after the diff is valid, then read what changed."
        coach={<FieldCoach evaluation={sandboxEvaluation} />}
      >
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onRunSandbox}
            disabled={Boolean(diffError) || isPending}
            className="rounded-2xl border border-line bg-white/85 px-4 py-3 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "Running sandbox..." : "Run sandbox model"}
          </button>
          <div className="rounded-2xl border border-line bg-white/70 px-4 py-3 text-sm text-ink/72">
            {freshnessMessage(sandboxFreshness)}
          </div>
        </div>

        {diffError ? (
          <p className="mt-4 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
            {diffError}
          </p>
        ) : null}

        {sandboxError ? (
          <p className="mt-4 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3 text-sm text-danger">
            {sandboxError}
          </p>
        ) : null}

        <div className="mt-4 rounded-2xl border border-line bg-white/70 p-4">
          <p className="font-medium text-ink">What changed</p>
          {sandboxResult ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink/72">
                {metricLabel("Parity delta", sandboxResult.delta.parityIndex)}
              </div>
              <div className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink/72">
                {metricLabel("Tax concentration delta", sandboxResult.delta.taxConcentration)}
              </div>
              <div className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink/72">
                {metricLabel("Small vs big delta", sandboxResult.delta.smallVsBigCompetitiveness)}
              </div>
              <div className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink/72">
                {metricLabel("Revenue inequality delta", sandboxResult.delta.revenueInequality)}
              </div>
              {sandboxResult.explanation.map((line) => (
                <div
                  key={line}
                  className="rounded-2xl border border-line bg-accent/5 px-4 py-3 text-sm leading-6 text-ink/72 md:col-span-2"
                >
                  {line}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-ink/68">
              Run the sandbox to compare the baseline rules against your proposed rule diff.
            </p>
          )}
        </div>
      </ProposalFieldBlock>

      <ProposalFieldBlock
        label="Sandbox interpretation"
        detail="Do not just repeat the metrics. Explain what they mean for a decision-maker."
        coach={
          <FieldCoach
            evaluation={interpretationEvaluation}
            onUseStarter={onUseInterpretationStarter}
          />
        }
      >
        <StepTextarea
          id="proposal-field-sandboxInterpretation"
          name="sandboxInterpretation"
          value={sandboxInterpretation}
          rows={7}
          onChange={onChangeInterpretation}
          placeholder="The sandbox suggests this reform would ..."
        />
      </ProposalFieldBlock>
    </ProposalStepLayout>
  );
}
