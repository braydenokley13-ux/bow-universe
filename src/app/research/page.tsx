import Link from "next/link";

import { Badge } from "@/components/badge";
import { SectionHeading } from "@/components/section-heading";
import { getLaneLabel } from "@/lib/publications";
import { publicationTypeLabels } from "@/lib/types";
import { getResearchPageData } from "@/server/data";

type BrowseMode = "recent" | "lane" | "type" | "context";

function groupLabel(mode: BrowseMode, publication: Awaited<ReturnType<typeof getResearchPageData>>[number]) {
  if (mode === "lane") {
    return publication.lanePrimary ? getLaneLabel(publication.lanePrimary) : "No lane";
  }

  if (mode === "type") {
    return publicationTypeLabels[publication.publicationType];
  }

  if (mode === "context") {
    if (publication.issue) {
      return `Issue · ${publication.issue.title}`;
    }

    if (publication.team) {
      return `Team · ${publication.team.name}`;
    }

    return "League-wide";
  }

  return "Recent publications";
}

export default async function ResearchPage({
  searchParams
}: {
  searchParams?: { view?: string };
}) {
  const publications = await getResearchPageData();
  const view = (searchParams?.view as BrowseMode | undefined) ?? "recent";
  const groups = publications.reduce<Record<string, typeof publications>>((accumulator, publication) => {
    const key = groupLabel(view, publication);
    accumulator[key] ??= [];
    accumulator[key].push(publication);
    return accumulator;
  }, {});

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Research Archive"
        title="Published work across the BOW Universe"
        description="Use the archive to read polished work by lane, type, or context. Each card now tells you why it is worth opening, not just what it is called."
      />

      <section className="panel p-4">
        <div className="flex flex-wrap items-center gap-2">
          {([
            ["recent", "Recent"],
            ["lane", "By lane"],
            ["type", "By type"],
            ["context", "By issue/team"]
          ] as const).map(([mode, label]) => (
            <Link
              key={mode}
              href={mode === "recent" ? "/research" : `/research?view=${mode}`}
              className="rounded-full border border-line bg-white/70 px-3 py-2 text-sm text-ink/75"
            >
              {label}
            </Link>
          ))}
        </div>
      </section>

      {publications.length === 0 ? (
        <section className="panel p-6">
          <p className="text-sm leading-6 text-ink/68">
            No internal publications have been archived yet. Publish a project or proposal internally first, then come back here to browse it.
          </p>
        </section>
      ) : null}

      {Object.entries(groups).map(([groupTitle, groupItems]) => (
        <section key={groupTitle} className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-2xl text-ink">{groupTitle}</h3>
            <Badge>{groupItems.length}</Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {groupItems.map((publication) => (
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
                <div className="mt-4 rounded-2xl border border-line bg-white/60 px-4 py-3 text-sm leading-6 text-ink/68">
                  Why read this: {publication.issue ? "It helps explain a live league issue." : publication.team ? "It gives team-specific context and strategy." : "It adds league-wide evidence and interpretation."}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
