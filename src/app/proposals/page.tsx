import Link from "next/link";

import { Badge } from "@/components/badge";
import { SectionHeading } from "@/components/section-heading";
import { parseProposalJson, getProposalsPageData } from "@/server/data";
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

export default async function ProposalsPage({
  searchParams
}: {
  searchParams?: { status?: string };
}) {
  const proposals = await getProposalsPageData();
  const selectedStatus = searchParams?.status ?? "ALL";
  const filteredProposals = proposals.filter(
    (proposal) => selectedStatus === "ALL" || proposal.status === selectedStatus
  );

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Proposals"
        title="Policy memos and governance records"
        description={`Proposals now live in two roles at once: they are governance records for league decisions and structured policy memos that can later be archived as research publications.`}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
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

      <section className="space-y-4">
        {filteredProposals.map((proposal) => {
          const parsed = parseProposalJson(proposal);

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
                <div className="rounded-2xl border border-line bg-white/60 p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Publication</p>
                  <p className="mt-2 text-sm text-ink/75">
                    {proposal.publishedInternalAt ? "Internal archive" : "Studio record"}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
