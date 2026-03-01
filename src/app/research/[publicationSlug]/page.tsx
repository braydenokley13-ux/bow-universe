import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";

import { Badge } from "@/components/badge";
import { PrintButton } from "@/components/print-button";
import { SectionHeading } from "@/components/section-heading";
import { SourceLineageCard } from "@/components/source-lineage-card";
import { getLaneLabel } from "@/lib/publications";
import { publicationTypeLabels } from "@/lib/types";
import {
  getPublicationPageData,
  parseProjectJson,
  parseProposalJson
} from "@/server/data";

export default async function PublicationDetailPage({
  params
}: {
  params: { publicationSlug: string };
}) {
  const record = await getPublicationPageData(params.publicationSlug);

  if (!record?.publication) {
    notFound();
  }

  const { publication } = record;

  if (record.project) {
    const parsed = parseProjectJson(record.project);

    return (
      <div className="space-y-8 print-publication">
        <SectionHeading
          eyebrow="Research Publication"
          title={publication.title}
          description={publication.abstract}
        />

        <section className="panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{publicationTypeLabels[publication.publicationType]}</Badge>
              {publication.lanePrimary ? <Badge>{getLaneLabel(publication.lanePrimary)}</Badge> : null}
              {publication.externalReady ? <Badge tone="success">External ready</Badge> : null}
            </div>
            <PrintButton />
          </div>
          <div className="mt-5 rounded-3xl border border-line bg-white/60 p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">How to cite</p>
            <p className="mt-3 text-sm leading-7 text-ink/72">{publication.citationText}</p>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <article className="panel p-6">
            <div className="space-y-6">
              <section>
                <h3 className="font-display text-2xl text-ink">Abstract</h3>
                <p className="mt-3 text-sm leading-7 text-ink/72">{publication.abstract}</p>
              </section>
              <section>
                <h3 className="font-display text-2xl text-ink">Question or mission</h3>
                <p className="mt-3 text-sm leading-7 text-ink/72">{record.project.essentialQuestion}</p>
              </section>
              <section>
                <h3 className="font-display text-2xl text-ink">Body</h3>
                <div className="prose prose-sm mt-3 max-w-none text-ink/75 prose-p:leading-7 prose-li:leading-7">
                  <ReactMarkdown>
                    {record.project.findingsMd || parsed.content.analysis || parsed.content.recommendations}
                  </ReactMarkdown>
                </div>
              </section>

              {parsed.keyTakeaways.length > 0 ? (
                <section className="print-key-box rounded-3xl border border-line bg-white/55 p-5">
                  <h3 className="font-display text-2xl text-ink">Key takeaways</h3>
                  <ul className="mt-4 space-y-2 text-sm leading-7 text-ink/72">
                    {parsed.keyTakeaways.map((takeaway) => (
                      <li key={takeaway} className="rounded-2xl border border-line bg-white/65 px-4 py-3">
                        {takeaway}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          </article>

          <div className="space-y-6">
            <SourceLineageCard
              sourceType="PROJECT"
              sourceTitle={record.project.title}
              sourceHref={`/projects/${record.project.id}`}
              workflowLabel={record.project.submissionStatus.replaceAll("_", " ")}
              issueTitle={publication.issue?.title}
              teamTitle={publication.team?.name}
            />

            <section className="panel p-6">
              <h3 className="font-display text-2xl text-ink">Archive metadata</h3>
              <div className="mt-5 space-y-3 text-sm leading-6 text-ink/70">
                <p>Author line: {publication.authorLine}</p>
                <p>Slug: {publication.slug}</p>
                <p>Version: {publication.canonicalVersion}</p>
                {publication.issue ? <p>Issue: {publication.issue.title}</p> : null}
                {publication.team ? <p>Team: {publication.team.name}</p> : null}
                {publication.season ? <p>Season: {publication.season.year}</p> : null}
              </div>
            </section>

            {parsed.references.length > 0 ? (
              <section className="panel p-6">
                <h3 className="font-display text-2xl text-ink">References</h3>
                <div className="mt-4 space-y-3">
                  {parsed.references.map((reference) => (
                    <a
                      key={`${reference.label}-${reference.url}`}
                      href={reference.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-2xl border border-line bg-white/60 p-4 hover:border-accent"
                    >
                      <p className="font-medium text-ink">{reference.label}</p>
                      <p className="mt-1 text-sm text-ink/62">{reference.sourceType}</p>
                      {reference.note ? <p className="mt-2 text-sm leading-6 text-ink/68">{reference.note}</p> : null}
                    </a>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </section>
      </div>
    );
  }

  if (!record.proposal) {
    notFound();
  }

  const parsed = parseProposalJson(record.proposal);

  return (
    <div className="space-y-8 print-publication">
      <SectionHeading
        eyebrow="Research Publication"
        title={publication.title}
        description={publication.abstract}
      />

      <section className="panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{publicationTypeLabels[publication.publicationType]}</Badge>
            {publication.externalReady ? <Badge tone="success">External ready</Badge> : null}
          </div>
          <PrintButton />
        </div>
        <div className="mt-5 rounded-3xl border border-line bg-white/60 p-5">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">How to cite</p>
          <p className="mt-3 text-sm leading-7 text-ink/72">{publication.citationText}</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="panel p-6">
          <div className="space-y-6">
            <section>
              <h3 className="font-display text-2xl text-ink">Abstract</h3>
              <p className="mt-3 text-sm leading-7 text-ink/72">{publication.abstract}</p>
            </section>
            <section>
              <h3 className="font-display text-2xl text-ink">Problem</h3>
              <p className="mt-3 text-sm leading-7 text-ink/72">{parsed.content.problem}</p>
            </section>
            <section>
              <h3 className="font-display text-2xl text-ink">Reform memo</h3>
              <div className="space-y-4 text-sm leading-7 text-ink/72">
                <p>{parsed.content.currentRuleContext}</p>
                <p>{parsed.content.proposedChange}</p>
                <p>{parsed.content.impactAnalysis}</p>
                <p>{parsed.content.recommendation}</p>
              </div>
            </section>

            {parsed.keyTakeaways.length > 0 ? (
              <section className="print-key-box rounded-3xl border border-line bg-white/55 p-5">
                <h3 className="font-display text-2xl text-ink">Key takeaways</h3>
                <ul className="mt-4 space-y-2 text-sm leading-7 text-ink/72">
                  {parsed.keyTakeaways.map((takeaway) => (
                    <li key={takeaway} className="rounded-2xl border border-line bg-white/65 px-4 py-3">
                      {takeaway}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </article>

        <div className="space-y-6">
          <SourceLineageCard
            sourceType="PROPOSAL"
            sourceTitle={record.proposal.title}
            sourceHref={`/proposals/${record.proposal.id}`}
            workflowLabel={record.proposal.status.replaceAll("_", " ")}
            issueTitle={publication.issue?.title}
            teamTitle={publication.team?.name}
          />

          <section className="panel p-6">
            <h3 className="font-display text-2xl text-ink">Archive metadata</h3>
            <div className="mt-5 space-y-3 text-sm leading-6 text-ink/70">
              <p>Author line: {publication.authorLine}</p>
              <p>Slug: {publication.slug}</p>
              <p>Version: {publication.canonicalVersion}</p>
              {publication.issue ? <p>Issue: {publication.issue.title}</p> : null}
              {publication.team ? <p>Team: {publication.team.name}</p> : null}
              {publication.season ? <p>Season: {publication.season.year}</p> : null}
            </div>
          </section>

          {parsed.references.length > 0 ? (
            <section className="panel p-6">
              <h3 className="font-display text-2xl text-ink">References</h3>
              <div className="mt-4 space-y-3">
                {parsed.references.map((reference) => (
                  <a
                    key={`${reference.label}-${reference.url}`}
                    href={reference.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-2xl border border-line bg-white/60 p-4 hover:border-accent"
                  >
                    <p className="font-medium text-ink">{reference.label}</p>
                    <p className="mt-1 text-sm text-ink/62">{reference.sourceType}</p>
                    {reference.note ? <p className="mt-2 text-sm leading-6 text-ink/68">{reference.note}</p> : null}
                  </a>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </section>
    </div>
  );
}
