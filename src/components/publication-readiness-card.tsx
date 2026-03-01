import Link from "next/link";

import { Badge } from "@/components/badge";
import { SourceStatusChipRow } from "@/components/source-status-chip-row";
import type { PublicationQueueState } from "@/lib/publication-queue";

type PublicationReadinessCardProps = {
  publication: {
    id: string;
    title: string;
    slug: string;
    abstract: string;
    sourceType: "PROJECT" | "PROPOSAL";
    sourceId: string;
    sourceStatus: string | null | undefined;
    issue?: { title: string } | null;
    team?: { name: string } | null;
    season?: { year: number } | null;
    externalReady: boolean;
    externalApproved: boolean;
  };
  state: PublicationQueueState;
};

export function PublicationReadinessCard({ publication, state }: PublicationReadinessCardProps) {
  return (
    <article className="rounded-[28px] border border-line bg-white/60 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-2xl text-ink">{publication.title}</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/70">{publication.abstract}</p>
        </div>
        <Link
          href={publication.sourceType === "PROJECT" ? `/projects/${publication.sourceId}` : `/proposals/${publication.sourceId}`}
          className="rounded-full border border-line bg-white/80 px-4 py-2 text-sm font-medium text-ink"
        >
          Open source record
        </Link>
      </div>

      <div className="mt-4">
        <SourceStatusChipRow
          sourceLabel={publication.sourceType === "PROJECT" ? "Project source" : "Proposal source"}
          sourceStatus={publication.sourceStatus}
          externalReady={publication.externalReady}
          externalApproved={publication.externalApproved}
        />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-3xl border border-line bg-white/70 p-4">
          <p className="font-medium text-ink">Archive quality</p>
          <div className="mt-3 space-y-2 text-sm leading-6 text-ink/68">
            <p>Slug: {publication.slug}</p>
            {publication.issue ? <p>Issue: {publication.issue.title}</p> : null}
            {publication.team ? <p>Team: {publication.team.name}</p> : null}
            {publication.season ? <p>Season: {publication.season.year}</p> : null}
          </div>
          <div className="mt-4 space-y-2">
            {state.qualityChecklist.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm"
              >
                <span className="text-ink/70">{item.label}</span>
                <Badge tone={item.complete ? "success" : "warn"}>{item.complete ? "Ready" : "Missing"}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-line bg-white/70 p-4">
          <p className="font-medium text-ink">Release guidance</p>
          <p className="mt-3 text-sm leading-6 text-ink/68">{state.nextAction}</p>
          <div className="mt-4 space-y-2">
            {state.warnings.length > 0 ? (
              state.warnings.map((warning) => (
                <div key={warning} className="rounded-2xl border border-warn/20 bg-warn/10 px-4 py-3 text-sm text-ink/72">
                  {warning}
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-success/20 bg-success/10 px-4 py-3 text-sm text-ink/72">
                Archive quality and source workflow are aligned.
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
