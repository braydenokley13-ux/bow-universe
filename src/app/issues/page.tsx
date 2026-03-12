import Link from "next/link";

import { Badge } from "@/components/badge";
import { ResearchStageMap } from "@/components/research-stage-map";
import { SectionHeading } from "@/components/section-heading";
import { buildIssueResearchPreview, classifyIssueWorkGap, summarizeIssuesFilter } from "@/lib/discovery-guidance";
import { buildResearchStageDisplay } from "@/lib/research-stage";
import { buildProjectStudioHref, buildProposalStudioHref } from "@/lib/studio-entry";
import { runIssueIntel } from "@/server/ai/service";
import { getViewer } from "@/server/auth";
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
  searchParams?: Promise<{ status?: string; severity?: string; focus?: string }>;
}) {
  const [issues, viewer] = await Promise.all([getIssuesPageData(), getViewer()]);
  const resolvedSearchParams = (await searchParams) ?? {};
  const issuesResearchMap = buildResearchStageDisplay("ASK_QUESTION", {
    previewStages: ["TEST_SYSTEM"],
    nextStepDetail: "Pick one issue card, then turn the pressure into one question you can actually investigate."
  });
  const statuses = ["ALL", "OPEN", "IN_REVIEW", "RESOLVED"] as const;
  const severityBands = ["ALL", "4", "3", "2", "1"] as const;
  const selectedStatus = resolvedSearchParams.status ?? "ALL";
  const selectedSeverity = resolvedSearchParams.severity ?? "ALL";
  const selectedFocus = resolvedSearchParams.focus ?? "";
  const filteredIssues = issues.filter((issue) => {
    const statusMatches = selectedStatus === "ALL" || issue.status === selectedStatus;
    const severityMatches =
      selectedSeverity === "ALL" || issue.severity >= Number(selectedSeverity);

    return statusMatches && severityMatches;
  });
  const focusedIssue = filteredIssues.find((issue) => issue.id === selectedFocus) ?? null;
  const focusedIssueIntel =
    viewer && focusedIssue
      ? await runIssueIntel({
          userId: viewer.id,
          issueId: focusedIssue.id
        }).catch(() => null)
      : null;

  function buildIssueBoardHref(params: { status?: string; severity?: string; focus?: string }) {
    const nextParams = new URLSearchParams();

    if (params.status && params.status !== "ALL") {
      nextParams.set("status", params.status);
    }

    if (params.severity && params.severity !== "ALL") {
      nextParams.set("severity", params.severity);
    }

    if (params.focus) {
      nextParams.set("focus", params.focus);
    }

    const query = nextParams.toString();
    return query ? `/issues?${query}` : "/issues";
  }

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Issues Board"
        title="Systemic league problems"
        description={`${summarizeIssuesFilter(selectedStatus, selectedSeverity, filteredIssues.length)}. Each card now shows what work is still missing so students know where to start.`}
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

      <ResearchStageMap
        eyebrow="Research loop"
        title="How to use the issues board"
        description="A strong issue gives you four things fast: a question to ask, evidence to hunt for, a system test to preview, and a case you could eventually make."
        steps={issuesResearchMap.researchStageProgress}
        nextStep={issuesResearchMap.nextResearchStep}
        compact
        simulationPreviewAvailable={issuesResearchMap.simulationPreviewAvailable}
        simulationPreviewLabel="You do not need full sandbox tools yet. First notice what part of the system this issue would be interesting to test later."
      />

      {focusedIssue ? (
        <section className="panel p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Selected issue briefing</p>
              <h3 className="mt-3 font-display text-2xl text-ink">{focusedIssue.title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink/70">
                The deterministic card stays visible below. This panel adds the deeper AI read once a student chooses which issue to size up.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone={focusedIssueIntel ? "success" : "default"}>
                {focusedIssueIntel ? "AI ready" : "Sign in for AI"}
              </Badge>
              <Link
                href={`/issues/${focusedIssue.id}`}
                className="rounded-full border border-line bg-white/80 px-4 py-2 text-sm font-medium text-ink"
              >
                Open issue page
              </Link>
            </div>
          </div>

          {focusedIssueIntel ? (
            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              <div className="rounded-2xl border border-line bg-white/60 p-4">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">What is hard</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/68">
                  {focusedIssueIntel.data.whatIsHard.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-line bg-white/60 p-4">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Real debate</p>
                <p className="mt-3 text-sm leading-6 text-ink/68">{focusedIssueIntel.data.realDebate}</p>
              </div>
              <div className="rounded-2xl border border-line bg-white/60 p-4">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Stakeholders</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/68">
                  {focusedIssueIntel.data.stakeholders.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">First moves</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/68">
                  {focusedIssueIntel.data.firstMoves.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-line px-4 py-5 text-sm leading-6 text-ink/60">
              Sign in and choose an issue card to load the deeper AI briefing here.
            </div>
          )}
        </section>
      ) : null}

      <section className="space-y-4">
        {filteredIssues.length === 0 ? (
          <div className="panel p-8 text-center">
            <p className="font-display text-2xl text-ink">No league issues right now.</p>
            <p className="mt-3 text-sm leading-6 text-ink/68">
              {selectedStatus !== "ALL" || selectedSeverity !== "ALL"
                ? "No issues match those filters. Try clearing them to see the full board."
                : "Your teacher will post live league problems here for you to investigate. Come back soon."}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {selectedStatus !== "ALL" || selectedSeverity !== "ALL" ? (
                <Link
                  href="/issues"
                  className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
                >
                  Clear filters
                </Link>
              ) : null}
              <Link
                href="/"
                className="rounded-full border border-line bg-white/70 px-4 py-2 text-sm font-medium text-ink"
              >
                Go to dashboard
              </Link>
            </div>
          </div>
        ) : null}
        {filteredIssues.map((issue) => {
          const metrics = parseIssueMetrics(issue.metricsJson);
          const gap = classifyIssueWorkGap({
            id: issue.id,
            title: issue.title,
            proposals: issue.proposals,
            projectLinks: issue.projectLinks
          });
          const preview = buildIssueResearchPreview({
            id: issue.id,
            title: issue.title,
            description: issue.description,
            severity: issue.severity,
            team: issue.team ? { name: issue.team.name } : null,
            metrics,
            proposals: issue.proposals,
            projectLinks: issue.projectLinks
          });

          return (
            <article key={issue.id} className="panel p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={toneForSeverity(issue.severity)}>Severity {issue.severity}</Badge>
                    <Badge>{issue.status.replace("_", " ")}</Badge>
                    {issue.team ? <Badge tone="success">{issue.team.name}</Badge> : null}
                  </div>
                  <h3 className="font-display text-2xl text-ink">{issue.title}</h3>
                  <p className="max-w-3xl text-sm leading-6 text-ink/70">{issue.description}</p>
                  <p className="text-sm leading-6 text-ink/62">{gap.summary}</p>
                </div>
                <div className="text-sm text-ink/62">
                  {issue.projectLinks.length} linked project{issue.projectLinks.length === 1 ? "" : "s"} ·{" "}
                  {issue.proposals.length} linked memo{issue.proposals.length === 1 ? "" : "s"}
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

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-line bg-white/60 p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Ask this</p>
                  <p className="mt-3 text-sm leading-6 text-ink/68">{preview.questionPrompt}</p>
                </div>
                <div className="rounded-2xl border border-line bg-white/60 p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Look for</p>
                  <p className="mt-3 text-sm leading-6 text-ink/68">{preview.evidencePrompt}</p>
                </div>
                <div className="rounded-2xl border border-line bg-white/60 p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Test later</p>
                  <p className="mt-3 text-sm leading-6 text-ink/68">{preview.modelPrompt}</p>
                </div>
                <div className="rounded-2xl border border-line bg-white/60 p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Why this is fun</p>
                  <p className="mt-3 text-sm leading-6 text-ink/68">{preview.whyInteresting}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={buildProposalStudioHref({ issueId: issue.id })}
                  className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
                >
                  Draft proposal
                </Link>
                <Link
                  href={buildProjectStudioHref({
                    issueId: issue.id,
                    teamId: issue.team?.id ?? null
                  })}
                  className="rounded-full border border-line bg-white/80 px-4 py-2 text-sm font-medium text-ink"
                >
                  Start project
                </Link>
                <Link
                  href={`/issues/${issue.id}`}
                  className="rounded-full border border-line bg-white/80 px-4 py-2 text-sm font-medium text-ink"
                >
                  Open issue
                </Link>
                <Link
                  href={buildIssueBoardHref({
                    status: selectedStatus,
                    severity: selectedSeverity,
                    focus: issue.id
                  })}
                  className="rounded-full border border-line bg-white/80 px-4 py-2 text-sm font-medium text-ink"
                >
                  AI briefing
                </Link>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
