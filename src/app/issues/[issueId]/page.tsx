import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";

import { Badge } from "@/components/badge";
import { SectionHeading } from "@/components/section-heading";
import { parseIssueMetrics, getIssuePageData } from "@/server/data";

export default async function IssueDetailPage({ params }: { params: { issueId: string } }) {
  const issue = await getIssuePageData(params.issueId);

  if (!issue) {
    notFound();
  }

  const metrics = parseIssueMetrics(issue.metricsJson);

  return (
    <div className="space-y-8">
      <SectionHeading eyebrow="Issue Detail" title={issue.title} description={issue.description} />

      {issue.team ? (
        <div className="flex">
          <Link
            href={`/teams/${issue.team.id}`}
            className="rounded-full border border-line bg-white/70 px-4 py-2 text-sm text-ink/75"
          >
            Linked team: {issue.team.name}
          </Link>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="panel p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Severity</p>
          <p className="mt-3 font-display text-3xl text-ink">{issue.severity}</p>
        </div>
        <div className="panel p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Status</p>
          <p className="mt-3"><Badge>{issue.status.replace("_", " ")}</Badge></p>
        </div>
        <div className="panel p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Revenue inequality</p>
          <p className="mt-3 font-display text-3xl text-ink">{metrics.revenueInequality ?? "-"}</p>
        </div>
        <div className="panel p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Tax concentration</p>
          <p className="mt-3 font-display text-3xl text-ink">{metrics.taxConcentration ?? "-"}</p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <article className="panel p-6">
          <h3 className="font-display text-2xl text-ink">Evidence and notes</h3>
          <div className="prose prose-sm mt-5 max-w-none text-ink/75 prose-p:leading-7 prose-li:leading-7">
            <ReactMarkdown>{issue.evidenceMd ?? "No evidence notes recorded yet."}</ReactMarkdown>
          </div>
        </article>

        <article className="panel p-6">
          <h3 className="font-display text-2xl text-ink">Linked projects</h3>
          <div className="mt-5 space-y-4">
            {issue.projectLinks.map(({ project }) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="block rounded-2xl border border-line bg-white/60 p-4 hover:border-accent"
              >
                <p className="font-medium text-ink">{project.title}</p>
                <p className="mt-2 text-sm leading-6 text-ink/68">{project.summary}</p>
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className="panel p-6">
        <h3 className="font-display text-2xl text-ink">Linked proposals</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {issue.proposals.map((proposal) => (
            <Link
              key={proposal.id}
              href={`/proposals/${proposal.id}`}
              className="rounded-2xl border border-line bg-white/60 p-4 hover:border-accent"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-ink">{proposal.title}</p>
                <Badge>{proposal.status.replace("_", " ")}</Badge>
              </div>
              <p className="mt-2 text-sm text-ink/62">Created by {proposal.createdBy.name}</p>
              {proposal.decision ? (
                <p className="mt-2 text-sm text-ink/68">Decision: {proposal.decision.decision}</p>
              ) : null}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
