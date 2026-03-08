import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Badge } from "@/components/badge";
import { SparkChart } from "@/components/spark-chart-client";
import { MetricCard } from "@/components/metric-card";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { SectionHeading } from "@/components/section-heading";
import { StudentDashboard } from "@/components/student-dashboard";
import { buildDashboardGuidance } from "@/lib/discovery-guidance";
import { prisma } from "@/lib/prisma";
import { formatCompactCurrency } from "@/lib/utils";
import { advanceSeasonAction } from "@/server/actions";
import { getViewer } from "@/server/auth";
import {
  getDashboardData,
  getIssuesPageData,
  getProjectsPageData,
  getProposalsPageData,
  getResearchPageData
} from "@/server/data";
import { getStudentMissionControlData } from "@/server/showcase-data";

function eventHref(entityType: string | null, entityId: string | null) {
  if (!entityType || !entityId) return "#";
  if (entityType === "Proposal" || entityType === "CommissionerDecision") return `/proposals/${entityId}`;
  if (entityType === "Project") return `/projects/${entityId}`;
  if (entityType === "Issue") return `/issues/${entityId}`;
  if (entityType === "Season") return "/";
  return "#";
}

export default async function HomePage() {
  const viewer = await getViewer();

  if (!viewer) {
    const { currentSeason, metrics, seasonTrend } = await getDashboardData();

    return (
      <div className="space-y-8">
        <SectionHeading
          eyebrow="League Dashboard"
          title="BOW League Research Terminal"
          description="A persistent fictional sports-economy league for grades 5 to 8. Sign in to start research, write proposals, and publish your work."
        />

        <section className="metric-grid">
          <MetricCard accent="default" label="Active Ruleset" value={`v${currentSeason?.activeRuleSet.version ?? "-"}`} detail="The baseline rule environment that current proposals are testing against." />
          <MetricCard accent="info" label="Season" value={String(currentSeason?.year ?? "-")} detail="The live season controls which team snapshots and rule context the app is reading." />
          <MetricCard accent="success" label="Parity Index" value={metrics.parityIndex.toFixed(1)} detail="A lower value means team strength is clustering more tightly across the league." />
          <MetricCard accent="warn" label="Revenue Inequality" value={metrics.revenueInequality.toFixed(2)} detail="A higher value means the league still has a wider gap between top and bottom clubs." />
        </section>

        {seasonTrend.length > 1 && (
          <article className="panel p-6">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent">League trend · All seasons</p>
            <h3 className="mt-2 font-display text-xl font-semibold text-ink">Parity Index over time</h3>
            <div className="mt-5 h-44">
              <SparkChart
                data={seasonTrend.map((s) => ({ label: s.label, value: s.parityIndex }))}
                type="area"
                showAxis
                color="#6366f1"
                height={176}
              />
            </div>
          </article>
        )}

        <div className="panel p-8 text-center">
          <p className="font-display text-2xl font-bold text-ink">Sign in to start researching</p>
          <p className="mt-3 text-[15px] leading-6 text-ink/70">Pick a research lane, work through the league&apos;s problems, and publish your findings.</p>
          <Link href="/login" className="mt-6 inline-block rounded-full bg-gradient-to-r from-accent to-accent-vivid px-6 py-3 font-medium text-white transition hover:opacity-90">Sign in</Link>
        </div>
      </div>
    );
  }

  if (viewer.role === "STUDENT") {
    const [userRecord, missionControl, league] = await Promise.all([
      prisma.user.findUnique({
        where: { id: viewer.id },
        select: {
          onboardingCompletedAt: true,
          linkedTeam: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }),
      getStudentMissionControlData(viewer.id),
      getDashboardData()
    ]);

    const isFirstTime =
      !userRecord?.onboardingCompletedAt &&
      missionControl.openProjects.length === 0 &&
      missionControl.openProposals.length === 0;

    if (isFirstTime) {
      return (
        <OnboardingWizard
          missions={missionControl.missionCandidates}
          markOnboardingComplete
          linkedTeamName={userRecord?.linkedTeam?.name ?? null}
        />
      );
    }

    return (
      <StudentDashboard
        viewer={viewer}
        linkedTeam={userRecord?.linkedTeam ?? null}
        recommendedAction={missionControl.recommendedAction}
        recommendedMission={missionControl.recommendedMission}
        openProjects={missionControl.openProjects}
        openProposals={missionControl.openProposals}
        feedbackItems={missionControl.feedbackItems}
        votingProposals={missionControl.votingProposals}
        challengeEntries={missionControl.challengeEntries}
        spotlightPosts={missionControl.spotlightPosts}
        submittedFirstProject={missionControl.submittedFirstProject}
        league={league}
      />
    );
  }

  const [
    { currentSeason, metrics, activity, latestTeamSeasons, seasonTrend },
    { projects },
    proposals,
    issues,
    publications
  ] = await Promise.all([
    getDashboardData(),
    getProjectsPageData(),
    getProposalsPageData(),
    getIssuesPageData(),
    getResearchPageData()
  ]);
  const topTaxTeams = [...latestTeamSeasons].sort((a, b) => b.taxPaid - a.taxPaid).slice(0, 3);
  const guidance = buildDashboardGuidance({
    viewerRole: viewer.role,
    viewerId: viewer.id,
    proposals,
    projects,
    issues,
    publications
  });

  const payrollChartData = latestTeamSeasons.map((ts) => ({
    label: ts.team.name.split(" ").slice(-1)[0] ?? ts.team.name,
    value: ts.payroll
  }));

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="League Dashboard"
        title="Commissioner workspace"
        description="Track where the pressure is, what work needs attention, and where to send students next."
      />

      {/* Hero metrics */}
      <section className="metric-grid">
        <MetricCard accent="default" label="Active Ruleset" value={`v${currentSeason?.activeRuleSet.version ?? "-"}`} detail="This is the baseline rule environment that current proposals and sandbox runs are testing against." />
        <MetricCard accent="info" label="Season" value={String(currentSeason?.year ?? "-")} detail="The live season controls which team snapshots and rule context the whole app is reading." />
        <MetricCard accent="success" label="Parity Index" value={metrics.parityIndex.toFixed(1)} detail="A lower value means team strength is clustering more tightly across the league." />
        <MetricCard accent="warn" label="Revenue Inequality" value={metrics.revenueInequality.toFixed(2)} detail="A higher value means the league still has a wider gap between top and bottom revenue clubs." />
      </section>

      {/* League health chart */}
      {seasonTrend.length > 1 && (
        <article className="panel p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent">Live · Updated each season</p>
              <h3 className="mt-2 font-display text-xl font-semibold text-ink">League Health Over Time</h3>
              <p className="mt-1 text-sm text-ink/65">Parity index across seasons — lower is healthier.</p>
            </div>
            <div className="flex gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent-soft px-3 py-1 font-mono text-[11px] text-accent">
                <span className="h-2 w-2 rounded-full bg-accent" />
                Parity Index
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-warn/20 bg-warn-soft px-3 py-1 font-mono text-[11px] text-warn">
                <span className="h-2 w-2 rounded-full bg-warn" />
                Inequality
              </span>
            </div>
          </div>
          <div className="mt-6 h-52">
            <SparkChart
              data={seasonTrend.map((s) => ({ label: s.label, value: s.parityIndex }))}
              type="area"
              showAxis
              color="#6366f1"
              height={208}
            />
          </div>
        </article>
      )}

      {/* Attention + Next move */}
      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="panel p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">What needs attention now</p>
              <h3 className="mt-3 font-display text-xl font-semibold text-ink">Pressure points and open work</h3>
            </div>
            <Badge>{guidance.attentionCards.length}</Badge>
          </div>

          <div className="mt-6 grid gap-4">
            {guidance.attentionCards.map((card) => (
              <Link
                key={`${card.eyebrow}-${card.title}`}
                href={card.href}
                className="group flex items-start justify-between rounded-2xl border border-line bg-mist p-4 transition hover:border-accent hover:shadow-glow"
              >
                <div className="min-w-0 flex-1">
                  {card.eyebrow ? <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">{card.eyebrow}</p> : null}
                  <p className="mt-2 font-semibold text-ink">{card.title}</p>
                  <p className="mt-2 text-sm leading-6 text-ink/68">{card.detail}</p>
                </div>
                <ChevronRight className="mt-2 h-4 w-4 flex-shrink-0 text-ink/30 transition group-hover:text-accent" />
              </Link>
            ))}
          </div>
        </article>

        <article className="panel p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Choose your next move</p>
              <h3 className="mt-3 font-display text-xl font-semibold text-ink">Go where the work will actually move</h3>
            </div>
            <Badge>{guidance.nextMoveCards.length}</Badge>
          </div>

          <div className="mt-6 space-y-4">
            {guidance.nextMoveCards.map((card) => (
              <Link
                key={`${card.eyebrow}-${card.title}`}
                href={card.href}
                className="group flex items-start justify-between rounded-2xl border border-line bg-mist p-4 transition hover:border-accent hover:shadow-glow"
              >
                <div className="min-w-0 flex-1">
                  {card.eyebrow ? <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">{card.eyebrow}</p> : null}
                  <p className="mt-2 font-semibold text-ink">{card.title}</p>
                  <p className="mt-2 text-sm leading-6 text-ink/68">{card.detail}</p>
                </div>
                <ChevronRight className="mt-2 h-4 w-4 flex-shrink-0 text-ink/30 transition group-hover:text-accent" />
              </Link>
            ))}
          </div>
        </article>
      </section>

      {/* League state + payroll chart + top tax teams */}
      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <article className="panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-xl font-semibold text-ink">League state</h3>
              <p className="mt-2 text-sm leading-6 text-ink/70">
                These metrics help students connect rules, money, and team behavior.
              </p>
            </div>
            <Badge tone="warn">Current season</Badge>
          </div>

          {/* Payroll bar chart */}
          {payrollChartData.length > 0 && (
            <div className="mt-5 h-44">
              <SparkChart data={payrollChartData} type="bar" showAxis color="#6366f1" height={176} />
            </div>
          )}

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-line bg-mist p-4">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Tax concentration</p>
              <p className="mt-3 font-display text-3xl font-bold text-ink">{metrics.taxConcentration.toFixed(2)}</p>
              <p className="mt-2 text-sm leading-5 text-ink/65">How much of league tax burden sits with a few teams.</p>
            </div>
            <div className="rounded-2xl border border-line bg-mist p-4">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Small vs big</p>
              <p className="mt-3 font-display text-3xl font-bold text-ink">{metrics.smallVsBigCompetitiveness.toFixed(2)}</p>
              <p className="mt-2 text-sm leading-5 text-ink/65">Small-market footing vs large and mega clubs.</p>
            </div>
            <div className="rounded-2xl border border-line bg-mist p-4">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Cap number</p>
              <p className="mt-3 font-display text-3xl font-bold text-ink">{currentSeason ? formatCompactCurrency(currentSeason.capNumber) : "-"}</p>
              <p className="mt-2 text-sm leading-5 text-ink/65">Current cap baseline for the live season.</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/proposals/new" className="rounded-full bg-gradient-to-r from-accent to-accent-vivid px-4 py-2 text-sm font-medium text-white transition hover:opacity-90">Draft proposal</Link>
            <Link href="/projects/new" className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:bg-mist">Start project</Link>
            <Link href="/research" className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:bg-mist">Research archive</Link>
            {viewer.role === "ADMIN" ? (
              <form action={advanceSeasonAction}>
                <button type="submit" className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:bg-mist">
                  Advance season
                </button>
              </form>
            ) : null}
          </div>
        </article>

        <article className="panel p-6">
          <h3 className="font-display text-xl font-semibold text-ink">Top tax-paying teams</h3>
          <p className="mt-2 text-sm leading-6 text-ink/70">
            These clubs carry the biggest share of the league&apos;s tax burden — a good place to look for rule stress.
          </p>

          <div className="mt-6 space-y-3">
            {topTaxTeams.map((teamSeason, index) => (
              <Link
                key={teamSeason.id}
                href={`/teams/${teamSeason.team.id}`}
                className="group flex items-center justify-between rounded-2xl border border-line bg-mist p-4 transition hover:border-accent hover:shadow-glow"
              >
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Rank {index + 1}</p>
                  <p className="mt-1 font-semibold text-ink">{teamSeason.team.name}</p>
                  <p className="text-sm text-ink/65">{teamSeason.team.marketSizeTier} market</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl font-bold text-ink">{formatCompactCurrency(teamSeason.taxPaid)}</p>
                  <p className="text-sm text-ink/60">tax paid</p>
                </div>
              </Link>
            ))}
          </div>
        </article>
      </section>

      {/* Activity feed */}
      <section className="panel p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-xl font-semibold text-ink">Recent activity</h3>
            <p className="mt-2 text-sm leading-6 text-ink/70">
              Every issue update, proposal milestone, project change, and commissioner action logged to the archive feed.
            </p>
          </div>
          <Badge>Archive feed</Badge>
        </div>

        <div className="mt-6 space-y-4">
          {activity.length > 0 ? (
            activity.map((event) => (
              <Link
                key={event.id}
                href={eventHref(event.entityType, event.entityId)}
                className="group block rounded-2xl border border-line bg-mist p-4 transition hover:border-accent hover:shadow-glow"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-ink">{event.title}</p>
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
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-line p-6 text-center">
              <p className="font-display text-xl font-semibold text-ink">The league is quiet. Let&apos;s change that.</p>
              <p className="mt-3 text-sm leading-6 text-ink/68">
                No events have been logged yet. Start a project or browse open issues to get things moving.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Link href="/issues" className="rounded-full bg-gradient-to-r from-accent to-accent-vivid px-4 py-2 text-sm font-medium text-white transition hover:opacity-90">
                  Browse open issues
                </Link>
                <Link href="/start" className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:bg-mist">
                  Start a project
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
