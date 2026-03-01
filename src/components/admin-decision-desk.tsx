import type { recordDecisionAction } from "@/server/actions";
import type { ReviewReadinessResult } from "@/lib/review-readiness";
import { getDecisionGuard } from "@/lib/workflow-guards";
import { Badge } from "@/components/badge";

type AdminDecisionDeskProps = {
  proposal: {
    id: string;
    status: import("@prisma/client").ProposalStatus;
    title: string;
  };
  readiness: ReviewReadinessResult;
  action: typeof recordDecisionAction;
};

export function AdminDecisionDesk({ proposal, readiness, action }: AdminDecisionDeskProps) {
  const guard = getDecisionGuard(proposal.status, readiness);

  return (
    <section className="rounded-[28px] border border-line bg-white/60 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Decision desk</p>
          <h3 className="mt-3 font-display text-2xl text-ink">Final commissioner decision</h3>
        </div>
        <Badge tone={guard.enabled ? "success" : "warn"}>{guard.tone}</Badge>
      </div>
      <p className="mt-3 text-sm leading-6 text-ink/70">{guard.explanation}</p>
      <p className="mt-2 text-sm leading-6 text-ink/60">{guard.nextAction}</p>

      <form action={action} className="mt-5 space-y-4">
        <input type="hidden" name="proposalId" value={proposal.id} />
        <div className="grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
          <select
            name="decision"
            defaultValue="APPROVE"
            disabled={!guard.enabled}
            className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="APPROVE">APPROVE</option>
            <option value="DENY">DENY</option>
            <option value="AMEND">AMEND</option>
          </select>
          <input
            name="notes"
            placeholder="Explain what happens next"
            disabled={!guard.enabled}
            className="rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <textarea
          name="amendedDiffJson"
          rows={4}
          placeholder='Only fill this in when the decision is AMEND. Use valid diff JSON.'
          disabled={!guard.enabled}
          className="w-full rounded-2xl border border-line bg-white px-4 py-3 font-mono text-sm text-ink outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!guard.enabled}
          className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          Record decision
        </button>
      </form>
    </section>
  );
}
