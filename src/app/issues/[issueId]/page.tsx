import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";

import { Badge } from "@/components/badge";
import { Breadcrumb } from "@/components/breadcrumb";
import { NextActionCard } from "@/components/next-action-card";
import { ResearchStageMap } from "@/components/research-stage-map";
import { SectionHeading } from "@/components/section-heading";
import { buildIssueResearchPreview, classifyIssueWorkGap } from "@/lib/discovery-guidance";
import { buildProjectStudioHref, buildProposalStudioHref } from "@/lib/studio-entry";
import { getViewer } from "@/server/auth";
import { runIssueIntel } from "@/server/ai/service";
import { parseIssueMetrics, getIssuePageData } from "@/server/data";

function metricMeaning(label: string, value: number | null | undefined) {
  if (value == null) {
    return `No ${label.toLowerCase()} signal has been recorded for this issue yet.`;
  }

  return `This issue is tracking ${label.toLowerCase()} at ${value}. Use that number as a clue about where league pressure is building, not as the whole explanation by itself.`;
}

export default async function IssueDetailPage({ params }: { params: Promise<{ issueId: string }> }) {
  const { issueId } = await params;
  const [issue, viewer] = await Promise.all([getIssuePageData(issueId), getViewer()]);

  if (!issue) {
    notFound();
  }

  const issueIntel = viewer
    ? await runIssueIntel({
        userId: viewer.id,
        issueId: issue.id
      }).catch(() => null)
    : null;

  const metrics = parseIssueMetrics(issue.metricsJson);
  const gap = classifyIssueWorkGap({
    id: issue.id,
    title: issue.title,
    proposals: issue.proposals,
    projectLinks: issue.projectLinks
  });
  const researchPreview = buildIssueResearchPreview({
    id: issue.id,
    title: issue.title,
    description: issue.description,
    severity: issue.severity,
    team: issue.team ? { name: issue.team.name } : null,
    metrics,
    proposals: issue.proposals,
    projectLinks: issue.projectLinks
  });
  const nextHref =
    gap.missing[0] === "proposal memo"
      ? buildProposalStudioHref({ issueId: issue.id })
      : gap.missing[0] === "supporting project"
        ? buildProjectStudioHref({
            issueId: issue.id,
            teamId: issue.team?.id ?? null
          })
        : issue.proposals[0]
          ? `/proposals/${issue.proposals[0].id}`
          : issue.projectLinks[0]
            ? `/projects/${issue.projectLinks[0].project.id}`
            : `/issues/${issue.id}`;

  return (
    <div className="space-y-8">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Issues", href: "/issues" }, { label: issue.title.length > 40 ? issue.title.slice(0, 40) + "…" : issue.title }]} />
      <SectionHeading eyebrow="Issue Detail" title={issue.title} description={issue.description} />
      <ResearchStageMap
        eyebrow="Research loop"
        title="Turn this issue into a real investigation"
        description="You do not need to solve everything at once. Move this issue through the same five research steps students use everywhere else."
        steps={researchPreview.researchMap.researchStageProgress}
        nextStep={researchPreview.researchMap.nextResearchStep}
        compact
        simulationPreviewAvailable={researchPreview.researchMap.simulationPreviewAvailable}
        simulationPreviewLabel={researchPreview.modelPrompt}
      />

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          {issue.team ? (
            <div className="flex">
              <Link
                href={`/teams/${issue.team.id}`}
                className="rounded-full border border-line bg-white/70 px-4 py-2 text-sm text-ink/75"
              >
                Linked team: {issue.team.name}
              </Link>
            </div>
          ) : null}

          <section className="panel p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-2xl text-ink">Why this issue matters</h3>
                <p className="mt-2 text-sm leading-6 text-ink/68">
                  This page should tell a student what the pressure is, what evidence exists, and what kind of work is still missing.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge>{issue.status.replace("_", " ")}</Badge>
                <Badge tone={issue.severity >= 4 ? "warn" : "default"}>Severity {issue.severity}</Badge>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-line bg-white/70 p-4 text-sm leading-6 text-ink/70">
              {gap.summary}
            </div>
          </section>

          <section className="panel p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="font-display text-2xl text-ink">Research game plan</h3>
                <p className="mt-2 text-sm leading-6 text-ink/68">
                  Use these four prompts to turn the issue into real sports-economics research instead of a vague classroom topic.
                </p>
              </div>
              <Badge tone="success">Curiosity first</Badge>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-line bg-white/70 p-4">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Ask this</p>
                <p className="mt-3 text-sm leading-6 text-ink/68">{researchPreview.questionPrompt}</p>
              </div>
              <div className="rounded-2xl border border-line bg-white/70 p-4">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Look for</p>
                <p className="mt-3 text-sm leading-6 text-ink/68">{researchPreview.evidencePrompt}</p>
              </div>
              <div className="rounded-2xl border border-line bg-white/70 p-4">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Test later</p>
                <p className="mt-3 text-sm leading-6 text-ink/68">{researchPreview.modelPrompt}</p>
              </div>
              <div className="rounded-2xl border border-line bg-white/70 p-4">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Make the case</p>
                <p className="mt-3 text-sm leading-6 text-ink/68">{researchPreview.argumentPrompt}</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-accent/20 bg-accent/5 p-4 text-sm leading-6 text-ink/72">
              {researchPreview.whyInteresting}
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="panel p-5">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Severity</p>
              <p className="mt-3 font-display text-3xl text-ink">{issue.severity}</p>
              <p className="mt-2 text-sm leading-6 text-ink/65">
                Higher severity means this issue should pull attention faster.
              </p>
            </div>
            <div className="panel p-5">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Status</p>
              <p className="mt-3">
                <Badge>{issue.status.replace("_", " ")}</Badge>
              </p>
              <p className="mt-2 text-sm leading-6 text-ink/65">
                The workflow status shows whether the league is still diagnosing the issue or closing it.
              </p>
            </div>
            <div className="panel p-5">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Revenue inequality</p>
              <p className="mt-3 font-display text-3xl text-ink">{metrics.revenueInequality ?? "-"}</p>
              <p className="mt-2 text-sm leading-6 text-ink/65">
                {metricMeaning("Revenue inequality", metrics.revenueInequality)}
              </p>
            </div>
            <div className="panel p-5">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Tax concentration</p>
              <p className="mt-3 font-display text-3xl text-ink">{metrics.taxConcentration ?? "-"}</p>
              <p className="mt-2 text-sm leading-6 text-ink/65">
                {metricMeaning("Tax concentration", metrics.taxConcentration)}
              </p>
            </div>
          </section>

          <section className="panel p-6">
            <h3 className="font-display text-2xl text-ink">Evidence and notes</h3>
            <div className="prose prose-sm mt-5 max-w-none text-ink/75 prose-p:leading-7 prose-li:leading-7">
              <ReactMarkdown>{issue.evidenceMd ?? "No evidence notes recorded yet."}</ReactMarkdown>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <NextActionCard
            eyebrow="Best next research move"
            title="Recommended next action"
            body={
              gap.missing.length > 0
                ? `This issue still needs ${gap.missing.join(" and ")}. Start there before treating the issue as fully covered.`
                : "This issue already has memo and project coverage. Open the linked work and strengthen the weakest record."
            }
            href={nextHref}
            ctaLabel={
              gap.missing[0] === "proposal memo"
                ? "Draft proposal"
                : gap.missing[0] === "supporting project"
                  ? "Start project"
                  : "Open linked work"
            }
            tone={gap.missing.length > 0 ? "warn" : "success"}
          />

          <section className="panel p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">AI issue intelligence</p>
                <h3 className="mt-3 font-display text-2xl text-ink">What makes this issue hard</h3>
              </div>
              <Badge tone={issueIntel ? "success" : "default"}>
                {issueIntel ? "Live briefing" : "Sign in for AI"}
              </Badge>
            </div>

            {issueIntel ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-line bg-white/60 p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">What is hard</p>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/68">
                    {issueIntel.data.whatIsHard.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-line bg-white/60 p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Real debate</p>
                  <p className="mt-3 text-sm leading-6 text-ink/68">{issueIntel.data.realDebate}</p>
                </div>
                <div className="rounded-2xl border border-line bg-white/60 p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Stakeholders</p>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/68">
                    {issueIntel.data.stakeholders.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-success/20 bg-success/10 p-4">
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-success">Strong project</p>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-success">
                      {issueIntel.data.strongProjectLooksLike.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-line bg-white/60 p-4">
                    <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Weak project</p>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/68">
                      {issueIntel.data.weakProjectLooksLike.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">First moves</p>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/68">
                    {issueIntel.data.firstMoves.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-line px-4 py-5 text-sm leading-6 text-ink/60">
                Signed-in students can load an AI briefing here that explains the real debate, the hard part of the issue, the stakeholders, and what strong work usually looks like.
              </div>
            )}
          </section>

          <section className="panel p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-2xl text-ink">Current linked work</h3>
              <Badge>{issue.proposals.length + issue.projectLinks.length} total</Badge>
            </div>

            <div className="mt-5 space-y-5">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Linked proposals</p>
                <div className="mt-3 grid gap-4">
                  {issue.proposals.length > 0 ? (
                    issue.proposals.map((proposal) => (
                      <Link
                        key={proposal.id}
                        href={`/proposals/${proposal.id}`}
                        className="rounded-2xl border border-line bg-white/60 p-4 hover:border-accent"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-ink">{proposal.title}</p>
                          <Badge>{proposal.status.replace("_", " ")}</Badge>
                        </div>
                        <p className="mt-2 text-sm text-ink/62">Created by {proposal.createdBy.name}</p>
                        {proposal.decision ? (
                          <p className="mt-2 text-sm text-ink/68">Decision: {proposal.decision.decision}</p>
                        ) : null}
                      </Link>
                    ))
                  ) : (
                    <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-ink/60">
                      No proposal memo is linked yet.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Linked projects</p>
                <div className="mt-3 grid gap-4">
                  {issue.projectLinks.length > 0 ? (
                    issue.projectLinks.map(({ project }) => (
                      <Link
                        key={project.id}
                        href={`/projects/${project.id}`}
                        className="block rounded-2xl border border-line bg-white/60 p-4 hover:border-accent"
                      >
                        <p className="font-medium text-ink">{project.title}</p>
                        <p className="mt-2 text-sm leading-6 text-ink/68">{project.summary}</p>
                      </Link>
                    ))
                  ) : (
                    <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-ink/60">
                      No supporting project is linked yet.
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-line bg-white/60 p-4">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Work still missing</p>
                {gap.missing.length > 0 ? (
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-ink/68">
                    {gap.missing.map((item) => (
                      <li key={item} className="rounded-2xl border border-line bg-white/80 px-4 py-3">
                        This issue still needs a {item}.
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-ink/68">
                    The issue has both memo and project coverage. The next step is to strengthen the best linked record.
                  </p>
                )}
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
