import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/badge";
import { Breadcrumb } from "@/components/breadcrumb";
import { SectionHeading } from "@/components/section-heading";
import { formatCompactCurrency } from "@/lib/utils";
import { getTeamPageData } from "@/server/data";

export default async function TeamDetailPage({ params }: { params: { teamId: string } }) {
  const data = await getTeamPageData(params.teamId);

  if (!data) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Teams", href: "/teams" }, { label: data.team.name }]} />
      <SectionHeading
        eyebrow="Team Detail"
        title={data.team.name}
        description={data.team.ownerProfile}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="panel p-5">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Market tier</p>
          <p className="mt-3 font-display text-3xl text-ink">{data.team.marketSizeTier}</p>
        </div>
        <div className="panel p-5">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Payroll</p>
          <p className="mt-3 font-display text-3xl text-ink">
            {data.teamSeason ? formatCompactCurrency(data.teamSeason.payroll) : "-"}
          </p>
        </div>
        <div className="panel p-5">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Revenue</p>
          <p className="mt-3 font-display text-3xl text-ink">
            {data.teamSeason ? formatCompactCurrency(data.teamSeason.revenue) : "-"}
          </p>
        </div>
        <div className="panel p-5">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Valuation</p>
          <p className="mt-3 font-display text-3xl text-ink">
            {data.teamSeason ? formatCompactCurrency(data.teamSeason.valuation) : "-"}
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="table-shell">
          <div className="border-b border-line px-5 py-4">
            <h3 className="font-display text-2xl text-ink">Cap table</h3>
            <p className="mt-2 text-sm leading-6 text-ink/68">
              Active contracts shaping the team payroll structure.
            </p>
          </div>

          <div className="divide-y divide-line/80">
            {data.team.contracts.map((contract) => {
              const salaries = contract.annualSalaryJson as number[];

              return (
                <div key={contract.id} className="grid gap-3 px-5 py-5 md:grid-cols-[1.3fr_0.8fr_1fr]">
                  <div>
                    <p className="font-medium text-ink">{contract.playerName}</p>
                    {contract.notes ? <p className="mt-1 text-sm text-ink/62">{contract.notes}</p> : null}
                  </div>
                  <p className="text-sm text-ink/72">{contract.years} years</p>
                  <p className="text-sm text-ink/72">
                    {salaries.map((salary) => `${salary}M`).join(" · ")}
                  </p>
                </div>
              );
            })}
          </div>
        </article>

        <article className="panel p-6">
          <h3 className="font-display text-2xl text-ink">League context</h3>
          <div className="mt-5 space-y-4 text-sm leading-6 text-ink/70">
            <p>
              Owner discipline score: <span className="font-medium text-ink">{data.team.ownerDisciplineScore.toFixed(2)}</span>
            </p>
            <p>
              Performance proxy: <span className="font-medium text-ink">{data.teamSeason?.performanceProxy ?? "-"}</span>
            </p>
            <p>
              Tax status:{" "}
              <Badge tone={data.teamSeason && data.teamSeason.taxPaid > 0 ? "warn" : "success"}>
                {data.teamSeason && data.teamSeason.taxPaid > 0 ? "Taxpayer" : "Below tax"}
              </Badge>
            </p>
          </div>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <article className="panel p-6">
          <h3 className="font-display text-2xl text-ink">Strategy archive</h3>
          <div className="mt-5 space-y-4">
            {data.strategyProjects.length > 0 ? (
              data.strategyProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="block rounded-2xl border border-line bg-white/60 p-4 hover:border-accent"
                >
                  <p className="font-medium text-ink">{project.title}</p>
                  <p className="mt-2 text-sm leading-6 text-ink/68">{project.summary}</p>
                  <p className="mt-2 text-sm text-ink/55">By {project.createdBy.name}</p>
                </Link>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-ink/60">
                No strategy archive entries exist for this team yet.
              </p>
            )}
          </div>
        </article>

        <article className="panel p-6">
          <h3 className="font-display text-2xl text-ink">Linked issues</h3>
          <div className="mt-5 space-y-4">
            {data.linkedIssues.length > 0 ? (
              data.linkedIssues.map((issue) => (
                <Link
                  key={issue.id}
                  href={`/issues/${issue.id}`}
                  className="flex items-center justify-between rounded-2xl border border-line bg-white/60 p-4 hover:border-accent"
                >
                  <div>
                    <p className="font-medium text-ink">{issue.title}</p>
                    <p className="mt-1 text-sm text-ink/62">Severity {issue.severity}</p>
                  </div>
                  <Badge tone={issue.status === "OPEN" ? "warn" : issue.status === "IN_REVIEW" ? "default" : "success"}>
                    {issue.status.replace("_", " ")}
                  </Badge>
                </Link>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-ink/60">
                No issues are directly linked to this team right now.
              </p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
