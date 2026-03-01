import Link from "next/link";

import { Badge } from "@/components/badge";
import { SectionHeading } from "@/components/section-heading";
import { parseIssueMetrics, getIssuesPageData } from "@/server/data";

function toneForSeverity(severity: number) {
  if (severity >= 5) {
    return "danger" as const;
  }
  if (severity >= 3) {
    return "warn" as const;
  }
  return "default" as const;
}

export default async function IssuesPage({
  searchParams
}: {
  searchParams?: { status?: string; severity?: string };
}) {
  const issues = await getIssuesPageData();
  const statuses = ["ALL", "OPEN", "IN_REVIEW", "RESOLVED"] as const;
  const severityBands = ["ALL", "4", "3", "2", "1"] as const;
  const selectedStatus = searchParams?.status ?? "ALL";
  const selectedSeverity = searchParams?.severity ?? "ALL";
  const filteredIssues = issues.filter((issue) => {
    const statusMatches = selectedStatus === "ALL" || issue.status === selectedStatus;
    const severityMatches =
      selectedSeverity === "ALL" || issue.severity >= Number(selectedSeverity);

    return statusMatches && severityMatches;
  });

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Issues Board"
        title="Systemic league problems"
        description={`Issues are now real records in Prisma. ${filteredIssues.length} issues match the current filters.`}
      />

      <section className="panel p-4">
        <div className="flex flex-wrap items-center gap-2">
          {statuses.map((status) => (
            <Link
              key={status}
              href={status === "ALL" ? "/issues" : `/issues?status=${status}`}
              className="rounded-full border border-line bg-white/70 px-3 py-2 text-sm text-ink/75"
            >
              {status.replace("_", " ")}
            </Link>
          ))}
          {severityBands.map((severity) => (
            <Link
              key={severity}
              href={severity === "ALL" ? "/issues" : `/issues?severity=${severity}`}
              className="rounded-full border border-line bg-white/70 px-3 py-2 text-sm text-ink/75"
            >
              {severity === "ALL" ? "All severities" : `Severity ${severity}+`}
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        {filteredIssues.map((issue) => {
          const metrics = parseIssueMetrics(issue.metricsJson);

          return (
            <Link
              key={issue.id}
              href={`/issues/${issue.id}`}
              className="panel block p-6 hover:border-accent"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={toneForSeverity(issue.severity)}>Severity {issue.severity}</Badge>
                    <Badge>{issue.status.replace("_", " ")}</Badge>
                    {issue.team ? <Badge tone="success">{issue.team.name}</Badge> : null}
                  </div>
                  <h3 className="font-display text-2xl text-ink">{issue.title}</h3>
                  <p className="max-w-3xl text-sm leading-6 text-ink/70">{issue.description}</p>
                </div>
                <div className="text-sm text-ink/62">
                  {issue.projectLinks.length} linked project{issue.projectLinks.length === 1 ? "" : "s"}
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <div className="rounded-2xl border border-line bg-white/60 p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Revenue inequality</p>
                  <p className="mt-2 text-sm text-ink/75">{metrics.revenueInequality ?? "-"}</p>
                </div>
                <div className="rounded-2xl border border-line bg-white/60 p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Tax concentration</p>
                  <p className="mt-2 text-sm text-ink/75">{metrics.taxConcentration ?? "-"}</p>
                </div>
                <div className="rounded-2xl border border-line bg-white/60 p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Parity</p>
                  <p className="mt-2 text-sm text-ink/75">{metrics.parityIndex ?? "-"}</p>
                </div>
                <div className="rounded-2xl border border-line bg-white/60 p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Small vs big</p>
                  <p className="mt-2 text-sm text-ink/75">{metrics.smallVsBigCompetitiveness ?? "-"}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
