import Link from "next/link";

import type { LaneTag } from "@/lib/types";
import { laneTagLabels, submissionStatusLabels } from "@/lib/types";
import type { Viewer } from "@/server/auth";

type ActiveProject = {
  id: string;
  title: string;
  submissionStatus: string;
  lanePrimary: LaneTag | null;
  updatedAt: Date;
};

type ActiveProposal = {
  id: string;
  title: string;
  status: string;
  updatedAt: Date;
};

type LeagueMetrics = {
  currentSeason: { year: number; activeRuleSet: { version: number } } | null;
  metrics: {
    parityIndex: number;
    revenueInequality: number;
  };
  activity: Array<{
    id: string;
    title: string;
    summary: string;
    createdAt: Date;
    entityType: string | null;
    entityId: string | null;
  }>;
  latestTeamSeasons: Array<{ id: string; team: { id: string; name: string }; taxPaid: number }>;
};

type StudentDashboardProps = {
  viewer: Viewer;
  openProjects: ActiveProject[];
  openProposals: ActiveProposal[];
  league: LeagueMetrics;
};

function statusTone(status: string) {
  if (status === "DRAFT") return "border-line bg-white/65 text-ink/68";
  if (status === "SUBMITTED") return "border-accent/30 bg-accent/10 text-accent";
  if (status === "REVISION_REQUESTED") return "border-warn/30 bg-warn/10 text-warn";
  return "border-success/30 bg-success/10 text-success";
}

function statusLabel(status: string): string {
  return submissionStatusLabels[status as keyof typeof submissionStatusLabels] ?? status;
}

function eventHref(entityType: string | null, entityId: string | null) {
  if (!entityType || !entityId) return "#";
  if (entityType === "Proposal" || entityType === "CommissionerDecision") return `/proposals/${entityId}`;
  if (entityType === "Project") return `/projects/${entityId}`;
  if (entityType === "Issue") return `/issues/${entityId}`;
  return "#";
}

export function StudentDashboard({ viewer, openProjects, openProposals, league }: StudentDashboardProps) {
  const totalOpen = openProjects.length + openProposals.length;
  const { currentSeason, metrics, activity } = league;

  return (
    <div className="space-y-10">
      {/* Hero: personal welcome */}
      <section className="panel p-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-accent">Welcome back</p>
        <h2 className="mt-3 font-display text-3xl text-ink">{viewer.name}</h2>
        {totalOpen > 0 ? (
          <p className="mt-2 text-base leading-7 text-ink/70">
            You have{" "}
            <span className="font-medium text-ink">
              {totalOpen} open {totalOpen === 1 ? "piece" : "pieces"} of work
            </span>{" "}
            in progress. Pick up where you left off below.
          </p>
        ) : (
          <p className="mt-2 text-base leading-7 text-ink/70">
            You don&apos;t have any work in progress yet. Start a project or draft a proposal below.
          </p>
        )}
      </section>

      {/* Active work */}
      {totalOpen > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-2xl text-ink">Your active work</h3>
            <div className="flex gap-3">
              <Link
                href="/projects/new"
                className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
              >
                New project
              </Link>
              <Link
                href="/proposals/new"
                className="rounded-full border border-line bg-white/70 px-4 py-2 text-sm font-medium text-ink"
              >
                New proposal
              </Link>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {openProjects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}/edit`}
                className="panel group flex flex-col gap-3 p-5 hover:border-accent"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink/50">Project</span>
                  {project.lanePrimary && (
                    <span className="rounded-full border border-accent/25 bg-accent/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
                      {laneTagLabels[project.lanePrimary].split("·")[1]?.trim() ?? project.lanePrimary}
                    </span>
                  )}
                  <span
                    className={`ml-auto rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${statusTone(project.submissionStatus)}`}
                  >
                    {statusLabel(project.submissionStatus)}
                  </span>
                </div>
                <p className="font-medium text-ink group-hover:text-accent">{project.title}</p>
                <p className="font-mono text-xs text-ink/45">
                  Updated{" "}
                  {new Date(project.updatedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric"
                  })}
                </p>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent opacity-0 transition group-hover:opacity-100">
                  Continue →
                </p>
              </Link>
            ))}

            {openProposals.map((proposal) => (
              <Link
                key={proposal.id}
                href={`/proposals/${proposal.id}/edit`}
                className="panel group flex flex-col gap-3 p-5 hover:border-accent"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink/50">Proposal</span>
                  <span
                    className={`ml-auto rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${statusTone(proposal.status)}`}
                  >
                    {statusLabel(proposal.status)}
                  </span>
                </div>
                <p className="font-medium text-ink group-hover:text-accent">{proposal.title}</p>
                <p className="font-mono text-xs text-ink/45">
                  Updated{" "}
                  {new Date(proposal.updatedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric"
                  })}
                </p>
                <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent opacity-0 transition group-hover:opacity-100">
                  Continue →
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Empty state CTA */}
      {totalOpen === 0 && (
        <section className="flex flex-wrap gap-4">
          <Link
            href="/projects/new"
            className="rounded-full border border-accent bg-accent px-5 py-3 font-medium text-white"
          >
            Start a project
          </Link>
          <Link
            href="/proposals/new"
            className="rounded-full border border-line bg-white/70 px-5 py-3 font-medium text-ink"
          >
            Draft a proposal
          </Link>
        </section>
      )}

      {/* League pulse — demoted, collapsible */}
      <section className="panel p-6">
        <details>
          <summary className="cursor-pointer list-none">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">League pulse</p>
                <h3 className="mt-2 font-display text-xl text-ink">Current league state</h3>
              </div>
              <span className="font-mono text-xs uppercase tracking-[0.18em] text-ink/45">Tap to expand ↓</span>
            </div>
          </summary>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-line bg-white/65 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Active Ruleset</p>
              <p className="mt-3 font-display text-3xl text-ink">v{currentSeason?.activeRuleSet.version ?? "–"}</p>
            </div>
            <div className="rounded-2xl border border-line bg-white/65 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Season</p>
              <p className="mt-3 font-display text-3xl text-ink">{currentSeason?.year ?? "–"}</p>
            </div>
            <div className="rounded-2xl border border-line bg-white/65 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Parity Index</p>
              <p className="mt-3 font-display text-3xl text-ink">{metrics.parityIndex.toFixed(1)}</p>
            </div>
            <div className="rounded-2xl border border-line bg-white/65 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Revenue Inequality</p>
              <p className="mt-3 font-display text-3xl text-ink">{metrics.revenueInequality.toFixed(2)}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/issues" className="rounded-full border border-line bg-white/70 px-4 py-2 text-sm font-medium text-ink">
              Browse issues
            </Link>
            <Link href="/teams" className="rounded-full border border-line bg-white/70 px-4 py-2 text-sm font-medium text-ink">
              Team snapshots
            </Link>
            <Link href="/research" className="rounded-full border border-line bg-white/70 px-4 py-2 text-sm font-medium text-ink">
              Research archive
            </Link>
          </div>
        </details>
      </section>

      {/* Recent activity */}
      <section className="panel p-6">
        <h3 className="font-display text-2xl text-ink">Recent activity</h3>
        <p className="mt-2 text-sm leading-6 text-ink/70">
          All league events — issues, proposals, projects, and commissioner actions.
        </p>

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
