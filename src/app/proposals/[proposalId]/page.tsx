import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/badge";
import { PrintButton } from "@/components/print-button";
import { ReviewSidebar } from "@/components/review-sidebar";
import { SectionHeading } from "@/components/section-heading";
import { SectionJumpNav } from "@/components/section-jump-nav";
import {
  castVoteAction,
  recordDecisionAction,
  reviewProposalAction,
  runProposalSandboxAction,
  saveProposalFeedbackAction
} from "@/server/actions";
import { getViewer } from "@/server/auth";
import { getProposalPageData, parseProposalJson } from "@/server/data";
import { getProposalReviewReadiness } from "@/lib/review-readiness";
import { publicationTypeLabels } from "@/lib/types";

const reviewStatuses = [
  "REVISION_REQUESTED",
  "APPROVED_FOR_INTERNAL_PUBLICATION",
  "READY_FOR_VOTING",
  "PUBLISHED_INTERNAL",
  "MARKED_EXTERNAL_READY",
  "APPROVED_FOR_EXTERNAL_PUBLICATION"
] as const;

const sandboxMetricNotes = {
  parityIndex: "Lower movement here usually means team strength is clustering more tightly.",
  taxConcentration: "A lower number means fewer clubs are carrying the tax burden alone.",
  smallVsBigCompetitiveness: "A higher number suggests smaller markets hold onto more competitive breathing room.",
  revenueInequality: "A lower value means the gap between high-revenue and low-revenue teams is narrowing."
};

export default async function ProposalDetailPage({ params }: { params: { proposalId: string } }) {
  const [viewer, proposal] = await Promise.all([getViewer(), getProposalPageData(params.proposalId)]);

  if (!proposal) {
    notFound();
  }

  const parsed = parseProposalJson(proposal);
  const sandboxReport = parsed.sandbox;
  const readiness = getProposalReviewReadiness(proposal);
  const yesVotes = proposal.votes.filter((vote) => vote.value === "YES").length;
  const noVotes = proposal.votes.filter((vote) => vote.value === "NO").length;
  const canEdit = viewer?.id === proposal.createdByUserId || viewer?.role === "ADMIN";

  return (
    <div className="space-y-8 print-publication">
      <SectionHeading
        eyebrow="Policy Memo"
        title={proposal.title}
        description={proposal.abstract ?? parsed.narrative.problem}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="panel p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Memo status</p>
          <p className="mt-3">
            <Badge>{proposal.status.replaceAll("_", " ")}</Badge>
          </p>
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
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Rule target</p>
          <p className="mt-3 font-display text-3xl text-ink">v{proposal.targetRuleSet.version}</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="panel p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{publicationTypeLabels[proposal.publicationType]}</Badge>
            {proposal.publication?.externalReady ? <Badge tone="success">External ready</Badge> : null}
            <PrintButton label="Print memo" />
            {canEdit ? (
              <Link
                href={`/proposals/${proposal.id}/edit`}
                className="print-hide rounded-full border border-line bg-white/75 px-4 py-2 text-sm font-medium text-ink"
              >
                Edit memo
              </Link>
            ) : null}
          </div>

          <div className="mt-6 rounded-3xl border border-line bg-white/55 p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Executive summary</p>
            <p className="mt-3 text-sm leading-7 text-ink/76">{proposal.abstract ?? parsed.narrative.problem}</p>
          </div>

          <div className="mt-6">
            <SectionJumpNav
              sections={[
                { id: "problem", label: "Problem" },
                { id: "current-rule", label: "Current rule" },
                { id: "reform", label: "Reform" },
                { id: "impact", label: "Impact" },
                { id: "tradeoffs", label: "Tradeoffs" },
                { id: "recommendation", label: "Recommendation" },
                { id: "sandbox", label: "Sandbox" },
                { id: "diff", label: "Rule diff" }
              ]}
            />
          </div>

          <div className="mt-6 space-y-6">
            <section id="problem">
              <h3 className="font-display text-2xl text-ink">Problem</h3>
              <p className="mt-3 text-sm leading-7 text-ink/72">{parsed.content.problem || parsed.narrative.problem}</p>
            </section>

            <section id="current-rule">
              <h3 className="font-display text-2xl text-ink">Current rule context</h3>
              <p className="mt-3 text-sm leading-7 text-ink/72">{parsed.content.currentRuleContext}</p>
            </section>

            <section id="reform">
              <h3 className="font-display text-2xl text-ink">Proposed reform</h3>
              <p className="mt-3 text-sm leading-7 text-ink/72">
                {parsed.content.proposedChange || parsed.narrative.proposedChange}
              </p>
            </section>

            <section id="impact">
              <h3 className="font-display text-2xl text-ink">Impact analysis</h3>
              <p className="mt-3 text-sm leading-7 text-ink/72">
                {parsed.content.impactAnalysis || parsed.narrative.expectedImpact}
              </p>
            </section>

            <section id="tradeoffs">
              <h3 className="font-display text-2xl text-ink">Tradeoffs</h3>
              <p className="mt-3 text-sm leading-7 text-ink/72">
                {parsed.content.tradeoffs || parsed.narrative.tradeoffs}
              </p>
            </section>

            <section id="recommendation">
              <h3 className="font-display text-2xl text-ink">Recommendation</h3>
              <p className="mt-3 text-sm leading-7 text-ink/72">{parsed.content.recommendation}</p>
            </section>

            {parsed.keyTakeaways.length > 0 ? (
              <section className="rounded-3xl border border-line bg-white/55 p-5">
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Key takeaways</p>
                <ul className="mt-4 space-y-2 text-sm leading-7 text-ink/72">
                  {parsed.keyTakeaways.map((takeaway) => (
                    <li key={takeaway} className="rounded-2xl border border-line bg-white/65 px-4 py-3">
                      {takeaway}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section id="sandbox" className="rounded-3xl border border-line bg-white/55 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-2xl text-ink">Sandbox evidence</h3>
                  <p className="mt-2 text-sm leading-6 text-ink/68">
                    Read the metric shifts as decision evidence, not just numbers.
                  </p>
                </div>
                <form action={runProposalSandboxAction} className="print-hide">
                  <input type="hidden" name="proposalId" value={proposal.id} />
                  <button
                    type="submit"
                    className="rounded-full border border-line bg-white/85 px-4 py-2 text-sm font-medium text-ink"
                  >
                    Rerun sandbox
                  </button>
                </form>
              </div>

              <div className="mt-5 rounded-2xl border border-line bg-white/70 p-4">
                <p className="font-medium text-ink">Sandbox interpretation</p>
                <p className="mt-2 text-sm leading-6 text-ink/68">
                  {parsed.content.sandboxInterpretation || "No written interpretation has been saved yet."}
                </p>
              </div>

              {sandboxReport ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {(
                    [
                      ["parityIndex", "Parity delta"],
                      ["taxConcentration", "Tax concentration delta"],
                      ["smallVsBigCompetitiveness", "Small vs big delta"],
                      ["revenueInequality", "Revenue inequality delta"]
                    ] as const
                  ).map(([key, label]) => (
                    <div key={key} className="rounded-2xl border border-line bg-white/70 p-4">
                      <p className="text-sm text-ink/60">{label}</p>
                      <p className="mt-2 font-display text-3xl text-ink">{sandboxReport.delta[key]}</p>
                      <p className="mt-2 text-sm leading-6 text-ink/65">{sandboxMetricNotes[key]}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-ink/65">No sandbox report has been saved for this proposal yet.</p>
              )}
            </section>

            <section id="diff">
              <h3 className="font-display text-2xl text-ink">Structured rule diff</h3>
              <pre className="mt-4 overflow-auto rounded-2xl border border-line bg-white/70 p-4 font-mono text-sm text-ink/80">
                {JSON.stringify(parsed.diff, null, 2)}
              </pre>
            </section>
          </div>
        </article>

        <div className="space-y-6">
          <ReviewSidebar eyebrow="Memo review" title="What is strong and what is missing" readiness={readiness} />

          <section className="panel p-6">
            <h3 className="font-display text-2xl text-ink">Workflow and governance</h3>
            <div className="mt-5 space-y-4 text-sm leading-6 text-ink/70">
              <p>Author: {proposal.createdBy.name}</p>
              <p>Issue: {proposal.issue.title}</p>
              <p>
                Voting window: {proposal.voteStart ? new Date(proposal.voteStart).toLocaleString() : "Not set"} to{" "}
                {proposal.voteEnd ? new Date(proposal.voteEnd).toLocaleString() : "Not set"}
              </p>
              <p>Publication slug: {proposal.publicationSlug ?? "Will be generated when published."}</p>
            </div>

            {viewer && proposal.canVote ? (
              <form action={castVoteAction} className="print-hide mt-5 flex flex-wrap gap-3">
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
            ) : null}

            {proposal.decision ? (
              <div className="mt-5 rounded-2xl border border-line bg-white/60 p-4">
                <p className="font-medium text-ink">Commissioner decision: {proposal.decision.decision}</p>
                <p className="mt-2 text-sm leading-6 text-ink/68">{proposal.decision.notes}</p>
                <p className="mt-2 text-sm text-ink/60">
                  Recorded by {proposal.decision.decidedBy.name} on{" "}
                  {new Date(proposal.decision.decidedAt).toLocaleDateString()}.
                </p>
              </div>
            ) : null}

            {viewer?.role === "ADMIN" ? (
              <>
                <form
                  action={reviewProposalAction}
                  className="print-hide mt-5 space-y-4 rounded-2xl border border-line bg-white/60 p-4"
                >
                  <input type="hidden" name="proposalId" value={proposal.id} />
                  <p className="font-medium text-ink">Reviewer move</p>
                  <select
                    name="status"
                    defaultValue={proposal.status}
                    className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                  >
                    {reviewStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="rounded-2xl border border-accent bg-accent px-4 py-3 text-sm font-semibold text-white"
                  >
                    Update review state
                  </button>
                </form>

                <form
                  action={recordDecisionAction}
                  className="print-hide mt-5 space-y-4 rounded-2xl border border-line bg-white/60 p-4"
                >
                  <input type="hidden" name="proposalId" value={proposal.id} />
                  <p className="font-medium text-ink">Decision desk</p>
                  <select
                    name="decision"
                    defaultValue="APPROVE"
                    className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                  >
                    <option value="APPROVE">Approve</option>
                    <option value="DENY">Deny</option>
                    <option value="AMEND">Amend</option>
                  </select>
                  <textarea
                    name="notes"
                    rows={4}
                    placeholder="Explain what happens next for the league and the writer."
                    className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                  />
                  <textarea
                    name="amendedDiffJson"
                    rows={7}
                    placeholder='Optional amended diff JSON for AMEND decisions'
                    className="w-full rounded-2xl border border-line bg-white px-4 py-3 font-mono text-sm text-ink outline-none focus:border-accent"
                  />
                  <button
                    type="submit"
                    className="rounded-2xl border border-line bg-white px-4 py-3 text-sm font-semibold text-ink"
                  >
                    Save decision
                  </button>
                </form>
              </>
            ) : null}
          </section>

          <section className="panel p-6">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Section feedback</p>
            <div className="mt-3 space-y-3">
              {proposal.feedbackEntries.length > 0 ? (
                proposal.feedbackEntries.map((feedback) => (
                  <div key={feedback.id} className="rounded-2xl border border-line bg-white/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-medium text-ink">{feedback.sectionKey}</p>
                      <Badge>{feedback.feedbackType}</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-ink/68">{feedback.body}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.2em] text-ink/50">
                      {feedback.createdBy.name}
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-ink/60">
                  No section feedback yet.
                </p>
              )}
            </div>

            {viewer ? (
              <form action={saveProposalFeedbackAction} className="print-hide mt-6 space-y-4">
                <input type="hidden" name="proposalId" value={proposal.id} />
                <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-ink/50">
                  <span className="rounded-full border border-line bg-white/80 px-3 py-1">problem</span>
                  <span className="rounded-full border border-line bg-white/80 px-3 py-1">currentRuleContext</span>
                  <span className="rounded-full border border-line bg-white/80 px-3 py-1">impactAnalysis</span>
                  <span className="rounded-full border border-line bg-white/80 px-3 py-1">sandboxInterpretation</span>
                </div>
                <input
                  name="sectionKey"
                  placeholder="Section key (for example: impactAnalysis)"
                  className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                />
                <select
                  name="feedbackType"
                  defaultValue="CLARITY"
                  className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                >
                  <option value="CLARITY">Clarity</option>
                  <option value="EVIDENCE">Evidence</option>
                  <option value="REASONING">Reasoning</option>
                  <option value="STRUCTURE">Structure</option>
                  <option value="REVISION_REQUEST">Revision request</option>
                </select>
                <textarea
                  name="body"
                  rows={3}
                  placeholder="Leave targeted feedback that tells the writer exactly what to strengthen next."
                  className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                />
                <button
                  type="submit"
                  className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm font-semibold text-ink"
                >
                  Save feedback
                </button>
              </form>
            ) : null}
          </section>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <article className="panel p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-2xl text-ink">Revision history</h3>
            <Badge>{proposal.revisions.length}</Badge>
          </div>

          <div className="mt-5 space-y-3">
            {proposal.revisions.length > 0 ? (
              proposal.revisions.map((revision) => (
                <div key={revision.id} className="rounded-2xl border border-line bg-white/60 p-4">
                  <p className="font-medium text-ink">{revision.createdBy.name}</p>
                  <p className="mt-1 text-sm text-ink/62">{new Date(revision.createdAt).toLocaleString()}</p>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-ink/60">
                No revision snapshots yet.
              </p>
            )}
          </div>
        </article>

        <article className="panel p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-2xl text-ink">Supporting projects</h3>
            <Badge>{proposal.supportingProjects.length}</Badge>
          </div>

          <div className="mt-5 grid gap-4">
            {proposal.supportingProjects.length > 0 ? (
              proposal.supportingProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="rounded-2xl border border-line bg-white/60 p-4 hover:border-accent"
                >
                  <p className="font-medium text-ink">{project.title}</p>
                  <p className="mt-2 text-sm leading-6 text-ink/68">{project.summary}</p>
                  <p className="mt-2 text-sm text-ink/55">By {project.createdBy.name}</p>
                </Link>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-ink/60">
                No proposal-support projects are linked yet.
              </p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
