import Link from "next/link";

import { Badge } from "@/components/badge";

type SourceLineageCardProps = {
  sourceType: "PROJECT" | "PROPOSAL";
  sourceTitle: string;
  sourceHref: string;
  workflowLabel: string;
  issueTitle?: string | null;
  teamTitle?: string | null;
};

export function SourceLineageCard({
  sourceType,
  sourceTitle,
  sourceHref,
  workflowLabel,
  issueTitle,
  teamTitle
}: SourceLineageCardProps) {
  return (
    <section className="rounded-[28px] border border-line bg-white/75 p-5 shadow-panel">
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Source lineage</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge>{sourceType === "PROJECT" ? "Project source" : "Proposal source"}</Badge>
        <Badge>{workflowLabel}</Badge>
      </div>
      <h3 className="mt-4 font-display text-2xl text-ink">{sourceTitle}</h3>
      <p className="mt-3 text-sm leading-6 text-ink/68">
        This publication comes from the original source record below, so reviewers can trace where the archived work came from.
      </p>
      <div className="mt-4 space-y-2 text-sm text-ink/70">
        {issueTitle ? <p>Issue: {issueTitle}</p> : null}
        {teamTitle ? <p>Team: {teamTitle}</p> : null}
      </div>
      <Link
        href={sourceHref}
        className="mt-4 inline-flex rounded-full border border-line bg-white/85 px-4 py-2 text-sm font-medium text-ink"
      >
        Open source record
      </Link>
    </section>
  );
}
