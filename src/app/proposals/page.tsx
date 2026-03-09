import Link from "next/link";

import { Badge } from "@/components/badge";
import { SectionHeading } from "@/components/section-heading";
import { StudentFeatureGate } from "@/components/student-feature-gate";
import { shouldGateAdvancedStudentWork } from "@/lib/classroom";
import { getProposalStageNote } from "@/lib/discovery-guidance";
import { parseProposalJson, getProposalsPageData } from "@/server/data";
import { getViewer } from "@/server/auth";
import { getStudentExperienceState } from "@/server/showcase-data";
import { publicationTypeLabels } from "@/lib/types";

const statuses = [
  "ALL",
  "DRAFT",
  "SUBMITTED",
  "REVISION_REQUESTED",
  "APPROVED_FOR_INTERNAL_PUBLICATION",
  "READY_FOR_VOTING",
  "VOTING",
  "DECISION",
  "PUBLISHED_INTERNAL",
  "MARKED_EXTERNAL_READY",
  "APPROVED_FOR_EXTERNAL_PUBLICATION"
] as const;

function categoryForStatus(status: string) {
  if (["DRAFT", "SUBMITTED", "REVISION_REQUESTED"].includes(status)) {
    return "Open memo work";
  }

  if (["APPROVED_FOR_INTERNAL_PUBLICATION", "READY_FOR_VOTING", "VOTING", "DECISION"].includes(status)) {
    return "Active governance review";
  }

  return "Archived or publication-ready";
}

export default async function ProposalsPage({
  searchParams
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const [viewer, proposals] = await Promise.all([getViewer(), getProposalsPageData()]);
  const experience =
    viewer?.role === "STUDENT" ? await getStudentExperienceState(viewer.id) : null;
  const resolvedSearchParams = (await searchParams) ?? {};
  const selectedStatus = resolvedSearchParams.status ?? "ALL";
  const isLocked =
    viewer?.role === "STUDENT" &&
    shouldGateAdvancedStudentWork({
      hasSubmittedFirstProject: experience?.hasSubmittedFirstProject ?? false
    });
  const filteredProposals = proposals.filter(
    (proposal) => selectedStatus === "ALL" || proposal.status === selectedStatus
  );
  const grouped = filteredProposals.reduce<Record<string, typeof filteredProposals>>((accumulator, proposal) => {
    const key = categoryForStatus(proposal.status);
    accumulator[key] ??= [];
    accumulator[key].push(proposal);
    return accumulator;
  }, {});
  const myOpenWork = viewer
    ? proposals.filter(
        (proposal) =>
          proposal.createdByUserId === viewer.id &&
          ["DRAFT", "SUBMITTED", "REVISION_REQUESTED"].includes(proposal.status)
      )
    : [];

  if (isLocked) {
    return (
      <div className="space-y-8">
        <SectionHeading
          eyebrow="Proposals"
          title="Policy memos and governance records"
          description="This board now surfaces open memo work first, then shows where each proposal sits in the governance and publication pipeline."
        />

        <StudentFeatureGate
          eyebrow="Unlocks after your first project"
          title="Finish one project before you worry about formal memos"
          description="Proposals are the deeper rule-change path. Start by finishing one guided project first, then come back here when you are ready to argue for a full league rule change."
          primaryHref={experience?.currentProjectId ? `/projects/${experience.currentProjectId}/edit` : "/start"}
          primaryLabel={experience?.currentProjectId ? "Open current project" : "Start first project"}
          secondaryHref="/start"
          secondaryLabel="Go to start page"
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Proposals"
        title="Policy memos and governance records"
        description="This board now surfaces open memo work first, then shows where each proposal sits in the governance and publication pipeline."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {statuses.map((status) => (
            <Link
              key={status}
              href={status === "ALL" ? "/proposals" : `/proposals?status=${status}`}
              className="rounded-full border border-line bg-white/70 px-3 py-2 text-sm text-ink/75"
            >
              {status.replaceAll("_", " ")}
            </Link>
          ))}
        </div>

        <Link
          href="/proposals/new"
          className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
        >
          New proposal memo
        </Link>
      </div>

      {viewer ? (
        <section className="panel p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-2xl text-ink">Your open memo work</h3>
              <p className="mt-2 text-sm leading-6 text-ink/70">
                Drafts and revision requests stay here so you can return to the exact memo that still needs work.
              </p>
            </div>
            <Badge>{myOpenWork.length}</Badge>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {myOpenWork.length > 0 ? (
              myOpenWork.map((proposal) => (
                <Link
                  key={proposal.id}
                  href={`/proposals/${proposal.id}/edit`}
                  className="rounded-2xl border border-line bg-white/60 p-4 hover:border-accent"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-ink">{proposal.title}</p>
                    <Badge>{proposal.status.replaceAll("_", " ")}</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-ink/68">{proposal.abstract}</p>
                </Link>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-ink/60">
                You do not have open memo work right now.
              </p>
            )}
          </div>
        </section>
      ) : null}

      {Object.keys(grouped).length === 0 ? (
        <div className="panel p-8 text-center">
          <p className="font-display text-2xl text-ink">No proposals yet.</p>
          <p className="mt-3 text-sm leading-6 text-ink/68">
            {selectedStatus !== "ALL"
              ? "No proposals match that status filter. Try switching to All."
              : "When you're ready to change a league rule, start here. Pick an issue, describe the problem, and propose a fix."}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {selectedStatus !== "ALL" ? (
              <Link
                href="/proposals"
                className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
              >
                Show all proposals
              </Link>
            ) : (
              <Link
                href="/proposals/new"
                className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
              >
                Write your first memo
              </Link>
            )}
            <Link
              href="/issues"
              className="rounded-full border border-line bg-white/70 px-4 py-2 text-sm font-medium text-ink"
            >
              Browse open issues
            </Link>
          </div>
        </div>
      ) : null}

      {Object.entries(grouped).map(([groupTitle, groupItems]) => (
        <section key={groupTitle} className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-2xl text-ink">{groupTitle}</h3>
            <Badge>{groupItems.length}</Badge>
          </div>

          {groupItems.map((proposal) => {
            const parsed = parseProposalJson(proposal);
            const stageNote = getProposalStageNote(proposal.status, Boolean(proposal.sandboxResultJson));

            return (
              <Link
                key={proposal.id}
                href={`/proposals/${proposal.id}`}
                className="panel block p-6 hover:border-accent"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-ink">{proposal.title}</p>
                    <p className="mt-2 text-sm text-ink/65">
                      Issue: {proposal.issue.title} · By {proposal.createdBy.name}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{proposal.status.replaceAll("_", " ")}</Badge>
                    <Badge>{publicationTypeLabels[proposal.publicationType]}</Badge>
                    {proposal.decision ? <Badge tone="success">{proposal.decision.decision}</Badge> : null}
                  </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-ink/68">
                  {proposal.abstract ?? parsed.narrative.problem}
                </p>

                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <div className="rounded-2xl border border-line bg-white/60 p-4">
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Stage note</p>
                    <p className="mt-2 text-sm text-ink/75">{stageNote}</p>
                  </div>
                  <div className="rounded-2xl border border-line bg-white/60 p-4">
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Votes</p>
                    <p className="mt-2 text-sm text-ink/75">{proposal.votes.length}</p>
                  </div>
                  <div className="rounded-2xl border border-line bg-white/60 p-4">
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Rule target</p>
                    <p className="mt-2 text-sm text-ink/75">RuleSet v{proposal.targetRuleSet.version}</p>
                  </div>
                  <div className="rounded-2xl border border-line bg-white/60 p-4">
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Sandbox</p>
                    <p className="mt-2 text-sm text-ink/75">
                      {proposal.sandboxResultJson ? "Saved" : "Not saved"}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      ))}
    </div>
  );
}
