import Link from "next/link";

import { Badge } from "@/components/badge";
import { SectionHeading } from "@/components/section-heading";
import { getProposalsPageData } from "@/server/data";

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
  const statuses = ["ALL", "DRAFT", "SUBMITTED", "VOTING", "DECISION"] as const;

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Proposals"
        title="Policy reform pipeline"
        description={`Proposal records are now live in Prisma. ${filteredProposals.length} proposals match the current filter.`}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {statuses.map((status) => (
            <Link
              key={status}
              href={status === "ALL" ? "/proposals" : `/proposals?status=${status}`}
              className="rounded-full border border-line bg-white/70 px-3 py-2 text-sm text-ink/75"
            >
              {status.replace("_", " ")}
            </Link>
          ))}
        </div>

        <Link
          href="/proposals/new"
          className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
        >
          New proposal
        </Link>
      </div>

      <section className="space-y-4">
        {filteredProposals.map((proposal) => (
          <Link
            key={proposal.id}
            href={`/proposals/${proposal.id}`}
            className="panel block p-6 hover:border-accent"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-ink">{proposal.title}</p>
                <p className="mt-2 text-sm text-ink/65">
                  Issue: {proposal.issue.title} · Created by {proposal.createdBy.name}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge>{proposal.status.replace("_", " ")}</Badge>
                {proposal.decision ? <Badge tone="success">{proposal.decision.decision}</Badge> : null}
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-line bg-white/60 p-4">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Votes</p>
                <p className="mt-2 text-sm text-ink/75">{proposal.votes.length}</p>
              </div>
              <div className="rounded-2xl border border-line bg-white/60 p-4">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Status</p>
                <p className="mt-2 text-sm text-ink/75">{proposal.status.replace("_", " ")}</p>
              </div>
              <div className="rounded-2xl border border-line bg-white/60 p-4">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Rule target</p>
                <p className="mt-2 text-sm text-ink/75">
                  RuleSet v{proposal.targetRuleSet.version}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
