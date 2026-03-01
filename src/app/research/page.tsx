import Link from "next/link";

import { Badge } from "@/components/badge";
import { SectionHeading } from "@/components/section-heading";
import { getLaneLabel } from "@/lib/publications";
import { publicationTypeLabels } from "@/lib/types";
import { getResearchPageData } from "@/server/data";

export default async function ResearchPage() {
  const publications = await getResearchPageData();

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Research Archive"
        title="Published work across the BOW Universe"
        description="This archive only shows polished internal publications. Each record is structured so it can later be mirrored as a public web article or turned into a clean PDF without redesigning the content model."
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {publications.map((publication) => (
          <Link
            key={publication.id}
            href={`/research/${publication.slug}`}
            className="panel block p-6 hover:border-accent"
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{publicationTypeLabels[publication.publicationType]}</Badge>
              {publication.lanePrimary ? <Badge>{getLaneLabel(publication.lanePrimary)}</Badge> : null}
              {publication.externalReady ? <Badge tone="success">External ready</Badge> : null}
            </div>
            <h3 className="mt-4 font-display text-2xl text-ink">{publication.title}</h3>
            <p className="mt-3 text-sm leading-6 text-ink/68">{publication.abstract}</p>
            <div className="mt-4 text-sm text-ink/58">
              {publication.issue ? <p>Issue: {publication.issue.title}</p> : null}
              {publication.team ? <p>Team: {publication.team.name}</p> : null}
              <p>Published: {new Date(publication.publishedAt).toLocaleDateString()}</p>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
