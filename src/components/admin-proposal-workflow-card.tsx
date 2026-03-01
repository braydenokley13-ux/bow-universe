import type { updateProposalStatusAction } from "@/server/actions";
import type { ReviewReadinessResult } from "@/lib/review-readiness";
import { getProposalWorkflowOptions } from "@/lib/workflow-guards";
import { Badge } from "@/components/badge";

type ProposalWorkflowCardProps = {
  proposal: {
    id: string;
    title: string;
    status: import("@prisma/client").ProposalStatus;
    issue: { title: string };
    targetRuleSet: { version: number };
    voteStart: Date | null;
    voteEnd: Date | null;
  };
  readiness: ReviewReadinessResult;
  action: typeof updateProposalStatusAction;
};

export function AdminProposalWorkflowCard({
  proposal,
  readiness,
  action
}: ProposalWorkflowCardProps) {
  const options = getProposalWorkflowOptions(proposal.status, readiness);
  const currentOption = options.find((option) => option.status === proposal.status);

  return (
    <div className="rounded-[28px] border border-line bg-white/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium text-ink">{proposal.title}</p>
          <p className="mt-2 text-sm text-ink/62">
            {proposal.issue.title} · RuleSet v{proposal.targetRuleSet.version}
          </p>
        </div>
        <Badge tone={readiness.readyForWorkflow ? "success" : "warn"}>{readiness.statusLabel}</Badge>
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-white/70 p-4">
        <p className="font-medium text-ink">What happens next</p>
        <p className="mt-2 text-sm leading-6 text-ink/68">{currentOption?.guard.nextAction ?? readiness.nextAction}</p>
      </div>

      <form action={action} className="mt-4 space-y-4">
        <input type="hidden" name="proposalId" value={proposal.id} />
        <div className="grid gap-4 md:grid-cols-3">
          <select
            name="status"
            defaultValue={proposal.status}
            className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          >
            {options.map((option) => (
              <option key={option.status} value={option.status} disabled={!option.guard.enabled}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            name="voteStart"
            type="datetime-local"
            defaultValue={proposal.voteStart ? new Date(proposal.voteStart).toISOString().slice(0, 16) : ""}
            className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          />
          <input
            name="voteEnd"
            type="datetime-local"
            defaultValue={proposal.voteEnd ? new Date(proposal.voteEnd).toISOString().slice(0, 16) : ""}
            className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
          />
        </div>
        <div className="rounded-2xl border border-line bg-white/70 p-4">
          <p className="font-medium text-ink">Workflow guidance</p>
          <p className="mt-2 text-sm leading-6 text-ink/68">{currentOption?.guard.explanation ?? "Pick the next safe workflow state."}</p>
        </div>
        <button
          type="submit"
          className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
        >
          Save workflow
        </button>
      </form>
    </div>
  );
}
