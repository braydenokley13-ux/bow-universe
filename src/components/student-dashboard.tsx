import Link from "next/link";

import { ResearchStageMap } from "@/components/research-stage-map";
import type { ResearchStageNextStep, ResearchStageStep } from "@/lib/research-stage";
import type { RecommendedMission } from "@/lib/student-flow";
import type { LaneTag } from "@/lib/types";
import { laneTagLabels, submissionStatusLabels } from "@/lib/types";
import type { Viewer } from "@/server/auth";

type ActiveProject = {
  id: string;
  title: string;
  submissionStatus: string;
  lanePrimary: LaneTag | null;
  updatedAt: Date;
  primaryIssue: { id: string; title: string } | null;
};

type ActiveProposal = {
  id: string;
  title: string;
  status: string;
  updatedAt: Date;
  issue: { id: string; title: string };
};

type FeedbackItem = {
  id: string;
  kind: "project" | "proposal";
  title: string;
  sectionKey: string;
  body: string;
  createdAt: Date;
  createdBy: string;
  href: string;
};

type ChallengeEntryCard = {
  id: string;
  sourceType: "PROJECT" | "PROPOSAL";
  sourceId: string;
  totalScore: number;
  challenge: {
    id: string;
    title: string;
    summary: string;
    issue: { title: string } | null;
    team: { name: string } | null;
  };
};

type SpotlightPost = {
  id: string;
  headline: string;
  dek: string;
  slug: string;
  author: { name: string };
  publishedAt: Date;
};

type VotingProposal = {
  id: string;
  title: string;
  voteEnd: Date | null;
  issue: { title: string };
};

type RecommendedAction = {
  title: string;
  body: string;
  href: string;
  ctaLabel: string;
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
  linkedTeam: { id: string; name: string } | null;
  gradeBand: "GRADE_5_6" | "GRADE_7_8" | null;
  recommendedAction: RecommendedAction;
  recommendedMission: RecommendedMission | null;
  openProjects: ActiveProject[];
  openProposals: ActiveProposal[];
  feedbackItems: FeedbackItem[];
  votingProposals: VotingProposal[];
  challengeEntries: ChallengeEntryCard[];
  spotlightPosts: SpotlightPost[];
  submittedFirstProject: boolean;
  researchStageProgress: ResearchStageStep[];
  nextResearchStep: ResearchStageNextStep;
  simulationPreviewAvailable: boolean;
  league: LeagueMetrics;
};

function statusTone(status: string) {
  if (status === "DRAFT") return "border-line bg-white/65 text-ink/68";
  if (status === "SUBMITTED") return "border-accent/30 bg-accent/10 text-accent";
  if (status === "REVISION_REQUESTED") return "border-warn/30 bg-warn/10 text-warn";
  return "border-success/30 bg-success/10 text-success";
}

function statusLabel(status: string): string {
  return submissionStatusLabels[status as keyof typeof submissionStatusLabels] ?? status.replaceAll("_", " ");
}

function eventHref(entityType: string | null, entityId: string | null) {
  if (!entityType || !entityId) return "#";
  if (entityType === "Proposal" || entityType === "CommissionerDecision") return `/proposals/${entityId}`;
  if (entityType === "Project") return `/projects/${entityId}`;
  if (entityType === "Issue") return `/issues/${entityId}`;
  if (entityType === "Challenge") return `/challenges/${entityId}`;
  return "#";
}

export function StudentDashboard({
  viewer,
  linkedTeam,
  gradeBand,
  recommendedAction,
  recommendedMission,
  openProjects,
  openProposals,
  feedbackItems,
  votingProposals,
  challengeEntries,
  spotlightPosts,
  submittedFirstProject,
  researchStageProgress,
  nextResearchStep,
  simulationPreviewAvailable,
  league
}: StudentDashboardProps) {
  const totalOpen = openProjects.length + openProposals.length;
  const { currentSeason, metrics, activity } = league;
  const workbenchItems = submittedFirstProject ? [...openProjects, ...openProposals] : openProjects;
  const isYoungerTrack = gradeBand === "GRADE_5_6" && !submittedFirstProject;

  return (
    <div className="space-y-10">
      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <article className="panel p-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-accent">
            {isYoungerTrack ? "Today's work" : "Student mission control"}
          </p>
          <h2 className="mt-3 font-display text-4xl text-ink">{viewer.name}</h2>
          <p className="mt-3 max-w-3xl text-base leading-7 text-ink/70">
            {isYoungerTrack
              ? "You only need one good start today: pick an issue, answer the small questions, and finish one clear project."
              : "This is your working desk: what needs attention, what is ready to move, and where your best next contribution will help the league most."}
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-line bg-white/65 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Open work</p>
              <p className="mt-3 font-display text-3xl text-ink">{totalOpen}</p>
            </div>
            <div className="rounded-2xl border border-line bg-white/65 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Feedback queue</p>
              <p className="mt-3 font-display text-3xl text-ink">{feedbackItems.length}</p>
            </div>
            <div className="rounded-2xl border border-line bg-white/65 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
                {submittedFirstProject ? "Active challenges" : "Next mission"}
              </p>
              <p className="mt-3 font-display text-3xl text-ink">
                {submittedFirstProject ? challengeEntries.length : recommendedMission ? "Ready" : "Soon"}
              </p>
            </div>
          </div>
        </article>

        <article className="rounded-[28px] border border-accent/20 bg-accent/5 p-6 shadow-panel">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">
            {isYoungerTrack ? "Do this next" : "Best next move"}
          </p>
          <h3 className="mt-3 font-display text-3xl text-ink">{recommendedAction.title}</h3>
          <p className="mt-4 text-sm leading-6 text-ink/72">{recommendedAction.body}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={recommendedAction.href}
              className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
            >
              {recommendedAction.ctaLabel}
            </Link>
            <Link
              href="/students/me"
              className="rounded-full border border-line bg-white/80 px-4 py-2 text-sm font-medium text-ink"
            >
              Open portfolio
            </Link>
          </div>
        </article>
      </section>

      <ResearchStageMap
        eyebrow="Research loop"
        title={submittedFirstProject ? "Keep your research moving" : "How your first research cycle works"}
        description={
          submittedFirstProject
            ? "Good work keeps moving through the same five steps: question, evidence, system test, case, and share. This map shows where your work needs the next push."
            : "BOW Universe is most fun when you can see the research game clearly: ask one real question, find evidence, preview the system, make a case, and then share the work."
        }
        steps={researchStageProgress}
        nextStep={nextResearchStep}
        compact
        simulationPreviewAvailable={simulationPreviewAvailable}
        simulationPreviewLabel={
          submittedFirstProject
            ? "You do not need to open every advanced tool now. Keep collecting evidence, then test the system when the question is strong enough."
            : "You do not need the full sandbox first. Start by understanding one issue, then preview how the system could shift later."
        }
      />

      {isYoungerTrack ? (
        <section className="panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">First-day checklist</p>
              <h3 className="mt-3 font-display text-2xl text-ink">Keep the start small</h3>
            </div>
            <span className="rounded-full border border-line bg-white/70 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-ink/60">
              One project first
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              "1. Pick one live issue instead of opening every page.",
              "2. Finish the guided research steps before worrying about proposals or challenges.",
              "3. Use the portfolio to notice growth after your first draft is moving."
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-line bg-white/60 p-4 text-sm leading-6 text-ink/68">
                {item}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {recommendedMission ? (
        <section className="panel p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">
                Recommended mission
              </p>
              <h3 className="mt-3 font-display text-2xl text-ink">
                {recommendedMission.issue.title}
              </h3>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/70">
                {recommendedMission.reason}
              </p>
            </div>
            <Link
              href={recommendedMission.starterHref}
              className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
            >
              Start this project
            </Link>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-line bg-white/60 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
                Suggested lane
              </p>
              <p className="mt-3 text-sm font-medium text-ink">
                {laneTagLabels[recommendedMission.suggestedLane]}
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-white/60 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Severity</p>
              <p className="mt-3 text-sm font-medium text-ink">
                {recommendedMission.issue.severity}
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-white/60 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Team anchor</p>
              <p className="mt-3 text-sm font-medium text-ink">
                {recommendedMission.issue.team?.name ?? "League-wide"}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <article className="panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Workbench</p>
              <h3 className="mt-3 font-display text-2xl text-ink">
                {submittedFirstProject ? "Resume exactly where you left off" : "Keep moving one step at a time"}
              </h3>
            </div>
            <div className="flex gap-3">
              <Link
                href={recommendedMission?.starterHref ?? "/projects/new?beginner=1"}
                className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
              >
                {submittedFirstProject ? "New project" : "Start guided project"}
              </Link>
              {submittedFirstProject ? (
                <Link
                  href="/proposals/new"
                  className="rounded-full border border-line bg-white/70 px-4 py-2 text-sm font-medium text-ink"
                >
                  New proposal
                </Link>
              ) : null}
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            {workbenchItems
              .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
              .slice(0, 6)
              .map((item) =>
                "submissionStatus" in item ? (
                  <Link
                    key={`project-${item.id}`}
                    href={`/projects/${item.id}/edit`}
                    className="rounded-2xl border border-line bg-white/60 p-4 hover:border-accent"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink/50">Project</span>
                      {item.lanePrimary ? (
                        <span className="rounded-full border border-accent/25 bg-accent/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
                          {laneTagLabels[item.lanePrimary]}
                        </span>
                      ) : null}
                      <span className={`ml-auto rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${statusTone(item.submissionStatus)}`}>
                        {statusLabel(item.submissionStatus)}
                      </span>
                    </div>
                    <p className="mt-3 font-medium text-ink">{item.title}</p>
                    <p className="mt-2 text-sm text-ink/62">
                      {item.primaryIssue ? `Issue: ${item.primaryIssue.title}` : "League-wide project"}
                    </p>
                  </Link>
                ) : (
                  <Link
                    key={`proposal-${item.id}`}
                    href={`/proposals/${item.id}/edit`}
                    className="rounded-2xl border border-line bg-white/60 p-4 hover:border-accent"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink/50">Proposal</span>
                      <span className={`ml-auto rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ${statusTone(item.status)}`}>
                        {statusLabel(item.status)}
                      </span>
                    </div>
                    <p className="mt-3 font-medium text-ink">{item.title}</p>
                    <p className="mt-2 text-sm text-ink/62">Issue: {item.issue.title}</p>
                  </Link>
                )
              )}
            {workbenchItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-ink/60">
                {submittedFirstProject
                  ? "You do not have an open draft right now. Start the next piece of work when you are ready."
                  : "No draft has started yet. Use the guided project button to open your first draft."}
              </div>
            ) : null}
          </div>
        </article>

        <article className="panel p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Response queue</p>
              <h3 className="mt-3 font-display text-2xl text-ink">Feedback waiting on you</h3>
            </div>
            <span className="rounded-full border border-line bg-white/70 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-ink/60">
              {feedbackItems.length}
            </span>
          </div>

          <div className="mt-6 space-y-4">
            {feedbackItems.length > 0 ? (
              feedbackItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="block rounded-2xl border border-line bg-white/60 p-4 hover:border-accent"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-medium text-ink">{item.title}</p>
                    <span className="rounded-full border border-warn/30 bg-warn/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-warn">
                      {item.kind}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-ink/62">
                    {item.createdBy} on {item.sectionKey}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-ink/68">{item.body}</p>
                </Link>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-ink/60">
                No feedback is waiting on you right now.
              </div>
            )}
          </div>
        </article>
      </section>

      {!submittedFirstProject ? (
        <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <article className="panel p-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">
              Later in the loop
            </p>
            <h3 className="mt-3 font-display text-2xl text-ink">
              Proposals come after your first project
            </h3>
            <p className="mt-3 text-sm leading-6 text-ink/70">
              Finish one guided project first. After that, proposal writing and voting feel much
              easier because you already know the league and the workflow.
            </p>
            <Link
              href="/proposals"
              className="mt-5 inline-flex rounded-full border border-line bg-white/80 px-4 py-2 text-sm font-medium text-ink"
            >
              See proposal examples
            </Link>
          </article>

          <article className="panel p-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">
              Optional later
            </p>
            <h3 className="mt-3 font-display text-2xl text-ink">
              Challenges stay secondary for now
            </h3>
            <p className="mt-3 text-sm leading-6 text-ink/70">
              The first win matters more than competition. Challenges are still there, but they
              should not pull you away from starting and finishing your first real project.
            </p>
            <Link
              href="/challenges"
              className="mt-5 inline-flex rounded-full border border-line bg-white/80 px-4 py-2 text-sm font-medium text-ink"
            >
              Browse challenges
            </Link>
          </article>
        </section>
      ) : null}

      {submittedFirstProject ? (
        <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <article className="panel p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Challenge board</p>
                <h3 className="mt-3 font-display text-2xl text-ink">Competitive research you joined</h3>
              </div>
              <Link href="/challenges" className="rounded-full border border-line bg-white/70 px-4 py-2 text-sm font-medium text-ink">
                Browse challenges
              </Link>
            </div>

            <div className="mt-6 space-y-4">
              {challengeEntries.length > 0 ? (
                challengeEntries.map((entry) => (
                  <Link
                    key={entry.id}
                    href={`/challenges/${entry.challenge.id}`}
                    className="block rounded-2xl border border-line bg-white/60 p-4 hover:border-accent"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-medium text-ink">{entry.challenge.title}</p>
                      <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-accent">
                        {entry.totalScore} pts
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-ink/68">{entry.challenge.summary}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.18em] text-ink/55">
                      Entered via {entry.sourceType.toLowerCase()}
                      {entry.challenge.issue ? ` · ${entry.challenge.issue.title}` : ""}
                      {entry.challenge.team ? ` · ${entry.challenge.team.name}` : ""}
                    </p>
                  </Link>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-ink/60">
                  Join a challenge to turn your research into a live competition.
                </div>
              )}
            </div>
          </article>

          <article className="panel p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Participation window</p>
                <h3 className="mt-3 font-display text-2xl text-ink">Votes and decisions coming up</h3>
              </div>
              <Link href="/proposals" className="rounded-full border border-line bg-white/70 px-4 py-2 text-sm font-medium text-ink">
                Open proposals
              </Link>
            </div>

            <div className="mt-6 space-y-4">
              {votingProposals.length > 0 ? (
                votingProposals.map((proposal) => (
                  <Link
                    key={proposal.id}
                    href={`/proposals/${proposal.id}`}
                    className="block rounded-2xl border border-line bg-white/60 p-4 hover:border-accent"
                  >
                    <p className="font-medium text-ink">{proposal.title}</p>
                    <p className="mt-2 text-sm leading-6 text-ink/68">Issue: {proposal.issue.title}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.18em] text-ink/55">
                      Vote ends {proposal.voteEnd ? new Date(proposal.voteEnd).toLocaleString("en-US") : "soon"}
                    </p>
                  </Link>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-ink/60">
                  There are no unvoted proposal windows waiting on you right now.
                </div>
              )}
            </div>
          </article>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <article className="panel p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Spotlight</p>
              <h3 className="mt-3 font-display text-2xl text-ink">Commissioner mentions tied to your work</h3>
            </div>
            {linkedTeam ? (
              <Link
                href={`/teams/${linkedTeam.id}`}
                className="rounded-full border border-line bg-white/70 px-4 py-2 text-sm font-medium text-ink"
              >
                Linked team: {linkedTeam.name}
              </Link>
            ) : null}
          </div>

          <div className="mt-6 space-y-4">
            {spotlightPosts.length > 0 ? (
              spotlightPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/news#${post.slug}`}
                  className="block rounded-2xl border border-line bg-white/60 p-4 hover:border-accent"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-medium text-ink">{post.headline}</p>
                    <span className="rounded-full border border-success/30 bg-success/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-success">
                      Spotlight
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-ink/68">{post.dek}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-ink/55">
                    {post.author.name} · {new Date(post.publishedAt).toLocaleDateString("en-US")}
                  </p>
                </Link>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-ink/60">
                No newsroom spotlight is linked to your work yet.
              </div>
            )}
          </div>
        </article>

        <article className="panel p-6">
          <h3 className="font-display text-2xl text-ink">League pulse</h3>
          <p className="mt-2 text-sm leading-6 text-ink/70">
            Keep one eye on the league so your work stays connected to the live world, not just your own draft.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-line bg-white/65 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Active ruleset</p>
              <p className="mt-3 font-display text-3xl text-ink">v{currentSeason?.activeRuleSet.version ?? "–"}</p>
            </div>
            <div className="rounded-2xl border border-line bg-white/65 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Season</p>
              <p className="mt-3 font-display text-3xl text-ink">{currentSeason?.year ?? "–"}</p>
            </div>
            <div className="rounded-2xl border border-line bg-white/65 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Parity index</p>
              <p className="mt-3 font-display text-3xl text-ink">{metrics.parityIndex.toFixed(1)}</p>
            </div>
            <div className="rounded-2xl border border-line bg-white/65 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Revenue inequality</p>
              <p className="mt-3 font-display text-3xl text-ink">{metrics.revenueInequality.toFixed(2)}</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {activity.slice(0, 4).map((event) => (
              <Link
                key={event.id}
                href={eventHref(event.entityType, event.entityId)}
                className="block rounded-2xl border border-line bg-white/60 p-4 hover:border-accent"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-medium text-ink">{event.title}</p>
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink/55">
                    {new Date(event.createdAt).toLocaleDateString("en-US")}
                  </p>
                </div>
                <p className="mt-2 text-sm leading-6 text-ink/68">{event.summary}</p>
              </Link>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
