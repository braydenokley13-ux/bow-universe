import Link from "next/link";

import { Badge } from "@/components/badge";
import { MetricCard } from "@/components/metric-card";
import { SectionHeading } from "@/components/section-heading";
import { advanceSeasonAction } from "@/server/actions";
import { getViewer } from "@/server/auth";
import { formatCompactCurrency } from "@/lib/utils";
import { getDashboardData } from "@/server/data";

function eventHref(entityType: string | null, entityId: string | null) {
  if (!entityType || !entityId) {
    return "#";
  }

  if (entityType === "Proposal" || entityType === "CommissionerDecision") {
    return `/proposals/${entityId}`;
  }

  if (entityType === "Project") {
    return `/projects/${entityId}`;
  }

  if (entityType === "Issue") {
    return `/issues/${entityId}`;
  }

  if (entityType === "Season") {
    return "/";
  }

  return "#";
}

export default async function HomePage() {
  const [viewer, { currentSeason, metrics, activity, latestTeamSeasons }] = await Promise.all([
    getViewer(),
    getDashboardData()
  ]);
  const topTaxTeams = [...latestTeamSeasons].sort((a, b) => b.taxPaid - a.taxPaid).slice(0, 3);

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="League Dashboard"
        title="A calm operating view for the BOW League"
        description="The league dashboard now reads from the live Prisma-backed universe. It tracks institutional pressure points, active rules, and the latest governance activity."
      />

      <section className="metric-grid">
        <MetricCard
          label="Active Ruleset"
          value={`v${currentSeason?.activeRuleSet.version ?? "-"}`}
          detail="The current season follows the active RuleSet version stored in the database."
        />
        <MetricCard
          label="Season"
          value={String(currentSeason?.year ?? "-")}
          detail="Season state is now read from Prisma and tied to the active rule environment."
        />
        <MetricCard
          label="Parity Index"
          value={metrics.parityIndex.toFixed(1)}
          detail="A lower value means team strength is clustered more tightly across the league."
        />
        <MetricCard
          label="Revenue Inequality"
          value={metrics.revenueInequality.toFixed(2)}
          detail="This compares the highest team revenue to the lowest team revenue in the current season snapshot."
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-2xl text-ink">Current institutional pressure</h3>
              <p className="mt-2 text-sm leading-6 text-ink/70">
                The dashboard highlights the most stressed parts of the league economy so students can trace how rules, money, and team behavior connect.
              </p>
            </div>
            <Badge tone="warn">Current season snapshot</Badge>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-line bg-white/60 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Tax concentration</p>
              <p className="mt-3 font-display text-3xl text-ink">{metrics.taxConcentration.toFixed(2)}</p>
              <p className="mt-2 text-sm leading-6 text-ink/65">
                Share of league tax paid by the top three taxpayers.
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-white/60 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Small vs big</p>
              <p className="mt-3 font-display text-3xl text-ink">
                {metrics.smallVsBigCompetitiveness.toFixed(2)}
              </p>
              <p className="mt-2 text-sm leading-6 text-ink/65">
                Competitive balance between small-market clubs and large or mega-market clubs.
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-white/60 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Cap number</p>
              <p className="mt-3 font-display text-3xl text-ink">
                {currentSeason ? formatCompactCurrency(currentSeason.capNumber) : "-"}
              </p>
              <p className="mt-2 text-sm leading-6 text-ink/65">
                Active cap baseline attached to this season record.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/proposals/new"
              className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
            >
              Draft proposal
            </Link>
            <Link
              href="/projects"
              className="rounded-full border border-line bg-white/70 px-4 py-2 text-sm font-medium text-ink"
            >
              Publish project
            </Link>
            {viewer?.role === "ADMIN" ? (
              <form action={advanceSeasonAction}>
                <button
                  type="submit"
                  className="rounded-full border border-line bg-white/70 px-4 py-2 text-sm font-medium text-ink"
                >
                  Advance season
                </button>
              </form>
            ) : null}
          </div>
        </article>

        <article className="panel p-6">
          <h3 className="font-display text-2xl text-ink">Top tax-paying teams</h3>
          <p className="mt-2 text-sm leading-6 text-ink/70">
            These clubs are currently carrying the biggest share of the league&apos;s tax burden.
          </p>

          <div className="mt-6 space-y-3">
            {topTaxTeams.map((teamSeason, index) => (
              <Link
                key={teamSeason.id}
                href={`/teams/${teamSeason.team.id}`}
                className="flex items-center justify-between rounded-2xl border border-line bg-white/60 p-4 hover:border-accent"
              >
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
                    Rank {index + 1}
                  </p>
                  <p className="mt-1 font-medium text-ink">{teamSeason.team.name}</p>
                  <p className="text-sm text-ink/65">{teamSeason.team.marketSizeTier} market</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl text-ink">
                    {formatCompactCurrency(teamSeason.taxPaid)}
                  </p>
                  <p className="text-sm text-ink/60">tax paid</p>
                </div>
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className="panel p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-2xl text-ink">Recent activity</h3>
            <p className="mt-2 text-sm leading-6 text-ink/70">
              Every issue update, proposal milestone, and commissioner action is preserved in the archive feed.
            </p>
          </div>
          <Badge>Archive feed</Badge>
        </div>

        <div className="mt-6 space-y-4">
          {activity.map((event) => (
            <Link
              key={event.id}
              href={eventHref(event.entityType, event.entityId)}
              className="block rounded-2xl border border-line bg-white/55 p-4 hover:border-accent"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-medium text-ink">{event.title}</p>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink/55">
                  {new Date(event.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                  })}
                </p>
              </div>
              <p className="mt-2 text-sm leading-6 text-ink/68">{event.summary}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
