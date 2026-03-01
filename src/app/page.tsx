import Link from "next/link";

import { Badge } from "@/components/badge";
import { MetricCard } from "@/components/metric-card";
import { SectionHeading } from "@/components/section-heading";
import { advanceSeasonAction } from "@/server/actions";
import { getViewer } from "@/server/auth";
import { getDashboardData, getIssuesPageData, getProjectsPageData, getProposalsPageData, getResearchPageData } from "@/server/data";
import { buildDashboardGuidance } from "@/lib/discovery-guidance";
import { formatCompactCurrency } from "@/lib/utils";

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
  const [
    viewer,
    { currentSeason, metrics, activity, latestTeamSeasons },
    { projects },
    proposals,
    issues,
    publications
  ] = await Promise.all([
    getViewer(),
    getDashboardData(),
    getProjectsPageData(),
    getProposalsPageData(),
    getIssuesPageData(),
    getResearchPageData()
  ]);
  const topTaxTeams = [...latestTeamSeasons].sort((a, b) => b.taxPaid - a.taxPaid).slice(0, 3);
  const guidance = buildDashboardGuidance({
    viewerRole: viewer?.role ?? null,
    viewerId: viewer?.id ?? null,
    proposals,
    projects,
    issues,
    publications
  });

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="League Dashboard"
        title="A calmer operating view for the BOW League"
        description="The dashboard now answers three questions at once: where the pressure is, what work needs attention, and where a student or commissioner should go next."
      />

      <section className="metric-grid">
        <MetricCard
          label="Active Ruleset"
          value={`v${currentSeason?.activeRuleSet.version ?? "-"}`}
          detail="This is the baseline rule environment that current proposals and sandbox runs are testing against."
        />
        <MetricCard
          label="Season"
          value={String(currentSeason?.year ?? "-")}
          detail="The live season controls which team snapshots and rule context the whole app is reading."
        />
        <MetricCard
          label="Parity Index"
          value={metrics.parityIndex.toFixed(1)}
          detail="A lower value means team strength is clustering more tightly across the league."
        />
        <MetricCard
          label="Revenue Inequality"
          value={metrics.revenueInequality.toFixed(2)}
          detail="A higher value means the league still has a wider gap between top and bottom revenue clubs."
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="panel p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">What needs attention now</p>
              <h3 className="mt-3 font-display text-2xl text-ink">Pressure points and open work</h3>
            </div>
            <Badge>{guidance.attentionCards.length}</Badge>
          </div>

          <div className="mt-6 grid gap-4">
            {guidance.attentionCards.map((card) => (
              <Link
                key={`${card.eyebrow}-${card.title}`}
                href={card.href}
                className="rounded-2xl border border-line bg-white/65 p-4 hover:border-accent"
              >
                {card.eyebrow ? (
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">{card.eyebrow}</p>
                ) : null}
                <p className="mt-2 font-medium text-ink">{card.title}</p>
                <p className="mt-2 text-sm leading-6 text-ink/68">{card.detail}</p>
              </Link>
            ))}
          </div>
        </article>

        <article className="panel p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Choose your next move</p>
              <h3 className="mt-3 font-display text-2xl text-ink">Go where the work will actually move</h3>
            </div>
            <Badge>{guidance.nextMoveCards.length}</Badge>
          </div>

          <div className="mt-6 space-y-4">
            {guidance.nextMoveCards.map((card) => (
              <Link
                key={`${card.eyebrow}-${card.title}`}
                href={card.href}
                className="block rounded-2xl border border-line bg-white/65 p-4 hover:border-accent"
              >
                {card.eyebrow ? (
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">{card.eyebrow}</p>
                ) : null}
                <p className="mt-2 font-medium text-ink">{card.title}</p>
                <p className="mt-2 text-sm leading-6 text-ink/68">{card.detail}</p>
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-2xl text-ink">League state explained</h3>
              <p className="mt-2 text-sm leading-6 text-ink/70">
                These metrics are here to help students connect rules, money, and team behavior, not just to admire a dashboard.
              </p>
            </div>
            <Badge tone="warn">Current season snapshot</Badge>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-line bg-white/60 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Tax concentration</p>
              <p className="mt-3 font-display text-3xl text-ink">{metrics.taxConcentration.toFixed(2)}</p>
              <p className="mt-2 text-sm leading-6 text-ink/65">
                This shows how much of the league tax burden is being carried by just a few teams.
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-white/60 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Small vs big</p>
              <p className="mt-3 font-display text-3xl text-ink">
                {metrics.smallVsBigCompetitiveness.toFixed(2)}
              </p>
              <p className="mt-2 text-sm leading-6 text-ink/65">
                This compares the competitive footing of smaller markets against large and mega-market clubs.
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-white/60 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Cap number</p>
              <p className="mt-3 font-display text-3xl text-ink">
                {currentSeason ? formatCompactCurrency(currentSeason.capNumber) : "-"}
              </p>
              <p className="mt-2 text-sm leading-6 text-ink/65">
                This is the current cap baseline attached to the live season record.
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
              href="/projects/new"
              className="rounded-full border border-line bg-white/70 px-4 py-2 text-sm font-medium text-ink"
            >
              Start project
            </Link>
            <Link
              href="/research"
              className="rounded-full border border-line bg-white/70 px-4 py-2 text-sm font-medium text-ink"
            >
              Research archive
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
            These clubs are currently carrying the biggest share of the league&apos;s tax burden, so they are often a good place to look for stress in the rules.
          </p>

          <div className="mt-6 space-y-3">
            {topTaxTeams.map((teamSeason, index) => (
              <Link
                key={teamSeason.id}
                href={`/teams/${teamSeason.team.id}`}
                className="flex items-center justify-between rounded-2xl border border-line bg-white/60 p-4 hover:border-accent"
              >
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Rank {index + 1}</p>
                  <p className="mt-1 font-medium text-ink">{teamSeason.team.name}</p>
                  <p className="text-sm text-ink/65">{teamSeason.team.marketSizeTier} market</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl text-ink">{formatCompactCurrency(teamSeason.taxPaid)}</p>
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
              Every issue update, proposal milestone, project change, and commissioner action is preserved in the archive feed.
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
