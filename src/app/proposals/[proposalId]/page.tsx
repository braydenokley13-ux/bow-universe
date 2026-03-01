import { notFound } from "next/navigation";

import { Badge } from "@/components/badge";
import { SectionHeading } from "@/components/section-heading";
import { castVoteAction, recordDecisionAction, runProposalSandboxAction } from "@/server/actions";
import { getViewer } from "@/server/auth";
import { getProposalPageData, parseProposalJson } from "@/server/data";

export default async function ProposalDetailPage({ params }: { params: { proposalId: string } }) {
  const [viewer, proposal] = await Promise.all([getViewer(), getProposalPageData(params.proposalId)]);

  if (!proposal) {
    notFound();
  }

  const parsed = parseProposalJson(proposal);
  const yesVotes = proposal.votes.filter((vote) => vote.value === "YES").length;
  const noVotes = proposal.votes.filter((vote) => vote.value === "NO").length;

  return (
    <div className="space-y-8">
      <SectionHeading eyebrow="Proposal Detail" title={proposal.title} description={`Issue: ${proposal.issue.title}`} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="panel p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Status</p>
          <p className="mt-3"><Badge>{proposal.status.replace("_", " ")}</Badge></p>
        </div>
        <div className="panel p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Yes votes</p>
          <p className="mt-3 font-display text-3xl text-ink">{yesVotes}</p>
        </div>
        <div className="panel p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">No votes</p>
          <p className="mt-3 font-display text-3xl text-ink">{noVotes}</p>
        </div>
        <div className="panel p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Target ruleset</p>
          <p className="mt-3 font-display text-3xl text-ink">v{proposal.targetRuleSet.version}</p>
        </div>
      </section>

      <section className="panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-2xl text-ink">Governance status</h3>
            <p className="mt-2 text-sm leading-6 text-ink/70">
              Proposal author: {proposal.createdBy.name}. Voting window:{" "}
              {proposal.voteStart ? new Date(proposal.voteStart).toLocaleString() : "Not set"} to{" "}
              {proposal.voteEnd ? new Date(proposal.voteEnd).toLocaleString() : "Not set"}.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge>{proposal.status.replace("_", " ")}</Badge>
            <form action={runProposalSandboxAction}>
              <input type="hidden" name="proposalId" value={proposal.id} />
              <button
                type="submit"
                className="rounded-full border border-line bg-white/75 px-4 py-2 text-sm font-medium text-ink"
              >
                Run sandbox
              </button>
            </form>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <article className="panel p-6">
          <h3 className="font-display text-2xl text-ink">Narrative</h3>
          <div className="mt-5 space-y-4 text-sm leading-7 text-ink/72">
            <div>
              <p className="font-medium text-ink">Problem</p>
              <p>{parsed.narrative.problem}</p>
            </div>
            <div>
              <p className="font-medium text-ink">Proposed change</p>
              <p>{parsed.narrative.proposedChange}</p>
            </div>
            <div>
              <p className="font-medium text-ink">Expected impact</p>
              <p>{parsed.narrative.expectedImpact}</p>
            </div>
            <div>
              <p className="font-medium text-ink">Tradeoffs</p>
              <p>{parsed.narrative.tradeoffs}</p>
            </div>
          </div>
        </article>

        <article className="panel p-6">
          <h3 className="font-display text-2xl text-ink">Structured rule diff</h3>
          <pre className="mt-5 overflow-auto rounded-2xl border border-line bg-white/70 p-4 font-mono text-sm text-ink/80">
            {JSON.stringify(parsed.diff, null, 2)}
          </pre>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <article className="panel p-6">
          <h3 className="font-display text-2xl text-ink">Sandbox impact report</h3>
          {parsed.sandbox ? (
            <div className="mt-5 space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-line bg-white/60 p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Parity delta</p>
                  <p className="mt-2 text-sm text-ink/75">{parsed.sandbox.delta.parityIndex}</p>
                </div>
                <div className="rounded-2xl border border-line bg-white/60 p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Tax concentration delta</p>
                  <p className="mt-2 text-sm text-ink/75">{parsed.sandbox.delta.taxConcentration}</p>
                </div>
                <div className="rounded-2xl border border-line bg-white/60 p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Small vs big delta</p>
                  <p className="mt-2 text-sm text-ink/75">{parsed.sandbox.delta.smallVsBigCompetitiveness}</p>
                </div>
                <div className="rounded-2xl border border-line bg-white/60 p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Revenue inequality delta</p>
                  <p className="mt-2 text-sm text-ink/75">{parsed.sandbox.delta.revenueInequality}</p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-line bg-white/60 p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Baseline metrics</p>
                  <pre className="mt-3 whitespace-pre-wrap text-sm text-ink/72">
                    {JSON.stringify(parsed.sandbox.baseline, null, 2)}
                  </pre>
                </div>
                <div className="rounded-2xl border border-line bg-white/60 p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Proposed metrics</p>
                  <pre className="mt-3 whitespace-pre-wrap text-sm text-ink/72">
                    {JSON.stringify(parsed.sandbox.proposed, null, 2)}
                  </pre>
                </div>
              </div>
              <ul className="space-y-2 text-sm leading-6 text-ink/70">
                {parsed.sandbox.explanation.map((line) => (
                  <li key={line} className="rounded-2xl border border-line bg-white/55 px-4 py-3">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-5 text-sm text-ink/65">No sandbox report has been saved for this proposal yet.</p>
          )}
        </article>

        <article className="panel p-6">
          <h3 className="font-display text-2xl text-ink">Votes and decision</h3>

          {viewer && proposal.canVote ? (
            <form action={castVoteAction} className="mt-5 flex flex-wrap gap-3">
              <input type="hidden" name="proposalId" value={proposal.id} />
              <button
                type="submit"
                name="value"
                value="YES"
                className="rounded-2xl border border-success bg-success px-4 py-3 text-sm font-semibold text-white"
              >
                Vote yes
              </button>
              <button
                type="submit"
                name="value"
                value="NO"
                className="rounded-2xl border border-danger bg-danger px-4 py-3 text-sm font-semibold text-white"
              >
                Vote no
              </button>
            </form>
          ) : proposal.status === "VOTING" ? (
            <p className="mt-5 text-sm text-ink/68">
              Voting is only available during the active voting window, and each user may vote once.
            </p>
          ) : null}

          <div className="mt-6 space-y-3">
            {proposal.votes.slice(0, 8).map((vote) => (
              <div key={vote.id} className="flex items-center justify-between rounded-2xl border border-line bg-white/60 px-4 py-3 text-sm">
                <span className="text-ink/72">{vote.user.name}</span>
                <Badge tone={vote.value === "YES" ? "success" : "danger"}>{vote.value}</Badge>
              </div>
            ))}
          </div>

          {proposal.decision ? (
            <div className="mt-6 rounded-2xl border border-line bg-white/60 p-4">
              <p className="font-medium text-ink">Commissioner decision: {proposal.decision.decision}</p>
              <p className="mt-2 text-sm leading-6 text-ink/68">{proposal.decision.notes}</p>
              <p className="mt-2 text-sm text-ink/60">
                Recorded by {proposal.decision.decidedBy.name} on{" "}
                {new Date(proposal.decision.decidedAt).toLocaleDateString()}.
              </p>
            </div>
          ) : null}

          {viewer?.role === "ADMIN" ? (
            <form action={recordDecisionAction} className="mt-6 space-y-4">
              <input type="hidden" name="proposalId" value={proposal.id} />
              <select
                name="decision"
                defaultValue="APPROVE"
                className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
              >
                <option value="APPROVE">Approve</option>
                <option value="DENY">Deny</option>
                <option value="AMEND">Amend</option>
              </select>
              <textarea
                name="notes"
                rows={4}
                placeholder="Commissioner notes"
                className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
              />
              <textarea
                name="amendedDiffJson"
                rows={7}
                placeholder='Optional amended diff JSON for AMEND decisions'
                className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 font-mono text-sm text-ink outline-none focus:border-accent"
              />
              <button
                type="submit"
                className="rounded-2xl border border-accent bg-accent px-4 py-3 text-sm font-semibold text-white"
              >
                Save decision
              </button>
            </form>
          ) : null}
        </article>
      </section>

      <section className="panel p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-2xl text-ink">Supporting projects</h3>
          <Badge>{proposal.supportingProjects.length}</Badge>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {proposal.supportingProjects.length > 0 ? (
            proposal.supportingProjects.map((project) => (
              <a
                key={project.id}
                href={`/projects/${project.id}`}
                className="rounded-2xl border border-line bg-white/60 p-4 hover:border-accent"
              >
                <p className="font-medium text-ink">{project.title}</p>
                <p className="mt-2 text-sm leading-6 text-ink/68">{project.summary}</p>
                <p className="mt-2 text-sm text-ink/55">By {project.createdBy.name}</p>
              </a>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-ink/60">
              No proposal-support projects are linked yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
