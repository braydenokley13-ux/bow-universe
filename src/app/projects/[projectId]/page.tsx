import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";

import { Badge } from "@/components/badge";
import { Breadcrumb } from "@/components/breadcrumb";
import { PrintButton } from "@/components/print-button";
import { ReviewSidebar } from "@/components/review-sidebar";
import { SectionHeading } from "@/components/section-heading";
import { SectionJumpNav } from "@/components/section-jump-nav";
import {
  addProjectCommentAction,
  reviewProjectAction,
  saveProjectFeedbackAction
} from "@/server/actions";
import { getLaneLabel, getPublicationDisplayLabel } from "@/lib/publications";
import { getLanePrompt } from "@/lib/discovery-guidance";
import { getProjectReviewReadiness } from "@/lib/review-readiness";
import { submissionStatusLabels } from "@/lib/types";
import { getViewer } from "@/server/auth";
import { getProjectPageData, parseProjectJson } from "@/server/data";

const reviewStatuses = [
  "REVISION_REQUESTED",
  "APPROVED_FOR_INTERNAL_PUBLICATION",
  "PUBLISHED_INTERNAL",
  "MARKED_EXTERNAL_READY",
  "APPROVED_FOR_EXTERNAL_PUBLICATION"
] as const;

export default async function ProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const [viewer, project] = await Promise.all([getViewer(), getProjectPageData(projectId)]);

  if (!project) {
    notFound();
  }

  const parsed = parseProjectJson(project);
  const readiness = getProjectReviewReadiness(project);
  const canEdit = viewer?.id === project.createdByUserId || viewer?.role === "ADMIN";

  return (
    <div className="space-y-8 print-publication">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Projects", href: "/projects" }, { label: project.title.length > 40 ? project.title.slice(0, 40) + "…" : project.title }]} />
      <SectionHeading
        eyebrow="Project Publication"
        title={project.title}
        description={project.abstract ?? project.summary}
      />

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="panel p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>
              {getPublicationDisplayLabel({
                publicationType: project.publicationType,
                lanePrimary: parsed.lanePrimary
              })}
            </Badge>
            <Badge>{submissionStatusLabels[project.submissionStatus]}</Badge>
            <Badge>{getLaneLabel(parsed.lanePrimary)}</Badge>
            {project.publication?.externalReady ? <Badge tone="success">External ready</Badge> : null}
            <PrintButton label="Print publication" />
            {canEdit ? (
              <Link
                href={`/projects/${project.id}/edit`}
                className="print-hide rounded-full border border-line bg-white/75 px-4 py-2 text-sm font-medium text-ink"
              >
                Edit studio draft
              </Link>
            ) : null}
          </div>

          <div className="mt-6 rounded-3xl border border-line bg-white/55 p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Abstract</p>
            <p className="mt-3 text-sm leading-7 text-ink/76">{project.abstract ?? project.summary}</p>
          </div>

          <div className="mt-6">
            <SectionJumpNav
              sections={[
                { id: "mission", label: "Mission" },
                { id: "context", label: "Context" },
                { id: "evidence", label: "Evidence" },
                { id: "analysis", label: "Analysis" },
                { id: "recommendation", label: "Recommendation" },
                { id: "lane-sections", label: "Lane sections" },
                { id: "references", label: "References" }
              ]}
            />
          </div>

          <div className="mt-6 space-y-6">
            <section id="mission">
              <h3 className="font-display text-2xl text-ink">Research question or mission</h3>
              <p className="mt-3 text-sm leading-7 text-ink/72">
                {project.essentialQuestion ?? parsed.content.questionOrMission}
              </p>
            </section>

            <section id="context">
              <h3 className="font-display text-2xl text-ink">Context</h3>
              <p className="mt-3 text-sm leading-7 text-ink/72">{parsed.content.context}</p>
            </section>

            <section id="evidence">
              <h3 className="font-display text-2xl text-ink">Evidence</h3>
              <div className="prose prose-sm mt-3 max-w-none text-ink/75 prose-p:leading-7 prose-li:leading-7">
                <ReactMarkdown>{parsed.content.evidence || project.findingsMd}</ReactMarkdown>
              </div>
            </section>

            <section id="analysis">
              <h3 className="font-display text-2xl text-ink">Analysis</h3>
              <div className="prose prose-sm mt-3 max-w-none text-ink/75 prose-p:leading-7 prose-li:leading-7">
                <ReactMarkdown>{parsed.content.analysis || project.findingsMd}</ReactMarkdown>
              </div>
            </section>

            <section id="recommendation">
              <h3 className="font-display text-2xl text-ink">Recommendation</h3>
              <div className="prose prose-sm mt-3 max-w-none text-ink/75 prose-p:leading-7 prose-li:leading-7">
                <ReactMarkdown>{parsed.content.recommendations || project.findingsMd}</ReactMarkdown>
              </div>
            </section>

            <section id="lane-sections">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-2xl text-ink">Lane-specific sections</h3>
                  <p className="mt-2 text-sm leading-6 text-ink/68">{getLanePrompt(parsed.lanePrimary)}</p>
                </div>
                <Badge>{parsed.content.laneSections.length} sections</Badge>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {parsed.content.laneSections.map((section) => (
                  <div key={section.key} className="rounded-2xl border border-line bg-white/55 p-4">
                    <p className="font-medium text-ink">{section.title}</p>
                    <p className="mt-2 text-sm leading-7 text-ink/72">{section.value}</p>
                  </div>
                ))}
              </div>
            </section>

            {parsed.keyTakeaways.length > 0 ? (
              <section className="rounded-3xl border border-line bg-white/55 p-5">
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Key takeaways</p>
                <ul className="mt-4 space-y-2 text-sm leading-7 text-ink/72">
                  {parsed.keyTakeaways.map((takeaway) => (
                    <li key={takeaway} className="rounded-2xl border border-line bg-white/65 px-4 py-3">
                      {takeaway}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {parsed.references.length > 0 ? (
              <section id="references">
                <h3 className="font-display text-2xl text-ink">References</h3>
                <div className="mt-4 space-y-3">
                  {parsed.references.map((reference) => (
                    <a
                      key={`${reference.label}-${reference.url}`}
                      href={reference.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-2xl border border-line bg-white/60 p-4 hover:border-accent"
                    >
                      <p className="font-medium text-ink">{reference.label}</p>
                      <p className="mt-1 text-sm text-ink/62">{reference.sourceType}</p>
                      {reference.note ? <p className="mt-2 text-sm leading-6 text-ink/68">{reference.note}</p> : null}
                    </a>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </article>

        <div className="space-y-6">
          <ReviewSidebar eyebrow="Project review" title="What is strong and what is missing" readiness={readiness} />

          <section className="panel p-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display text-2xl text-ink">Publication metadata</h3>
              <Badge>{getLaneLabel(parsed.lanePrimary)}</Badge>
            </div>

            <div className="mt-5 space-y-4 text-sm leading-6 text-ink/70">
              <p>
                Author: <span className="font-medium text-ink">{project.createdBy.name}</span>
              </p>
              <p>Methods summary: {project.methodsSummary ?? "No methods summary yet."}</p>
              <p>Publication slug: {project.publicationSlug ?? "Will be generated when published."}</p>
              {project.team ? (
                <p>
                  Linked team:{" "}
                  <Link href={`/teams/${project.team.id}`} className="font-medium text-accent">
                    {project.team.name}
                  </Link>
                </p>
              ) : null}
              {project.supportingProposal ? (
                <p>
                  Supporting proposal:{" "}
                  <Link href={`/proposals/${project.supportingProposal.id}`} className="font-medium text-accent">
                    {project.supportingProposal.title}
                  </Link>
                </p>
              ) : null}
            </div>

            <div className="mt-6">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Linked issues</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {project.issueLinks.map((issueLink) => (
                  <Link key={issueLink.issue.id} href={`/issues/${issueLink.issue.id}`}>
                    <Badge>{issueLink.issue.title}</Badge>
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Collaborators</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {project.collaborators.map((collaborator) => (
                  <Badge key={collaborator.user.id}>{collaborator.user.name}</Badge>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Artifacts</p>
              <div className="mt-3 space-y-3">
                {parsed.artifactLinks.map((artifact) => (
                  <a
                    key={`${artifact.label}-${artifact.url}`}
                    href={artifact.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-2xl border border-line bg-white/60 p-4 text-sm text-ink hover:border-accent"
                  >
                    {artifact.label}
                  </a>
                ))}
              </div>
            </div>

            {viewer?.role === "ADMIN" ? (
              <form
                action={reviewProjectAction}
                className="print-hide mt-6 space-y-4 rounded-2xl border border-line bg-white/60 p-4"
              >
                <input type="hidden" name="projectId" value={project.id} />
                <p className="font-medium text-ink">Reviewer move</p>
                <select
                  name="submissionStatus"
                  defaultValue={project.submissionStatus}
                  className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                >
                  {reviewStatuses.map((status) => (
                    <option key={status} value={status}>
                      {submissionStatusLabels[status]}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-2xl border border-accent bg-accent px-4 py-3 text-sm font-semibold text-white"
                >
                  Update review state
                </button>
              </form>
            ) : null}
          </section>

          <section className="panel p-6">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Feedback by section</p>
            <div className="mt-3 space-y-3">
              {project.feedbackEntries.length > 0 ? (
                project.feedbackEntries.map((feedback) => (
                  <div key={feedback.id} className="rounded-2xl border border-line bg-white/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-medium text-ink">{feedback.sectionKey}</p>
                      <Badge>{feedback.feedbackType}</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-ink/68">{feedback.body}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.2em] text-ink/50">
                      {feedback.createdBy.name}
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-ink/60">
                  No section feedback yet.
                </p>
              )}
            </div>

            {viewer ? (
              <form action={saveProjectFeedbackAction} className="print-hide mt-6 space-y-4">
                <input type="hidden" name="projectId" value={project.id} />
                <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-ink/50">
                  <span className="rounded-full border border-line bg-white/80 px-3 py-1">context</span>
                  <span className="rounded-full border border-line bg-white/80 px-3 py-1">evidence</span>
                  <span className="rounded-full border border-line bg-white/80 px-3 py-1">analysis</span>
                  <span className="rounded-full border border-line bg-white/80 px-3 py-1">recommendations</span>
                </div>
                <input
                  name="sectionKey"
                  placeholder="Section key (for example: analysis)"
                  className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                />
                <select
                  name="feedbackType"
                  defaultValue="CLARITY"
                  className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                >
                  <option value="CLARITY">Clarity</option>
                  <option value="EVIDENCE">Evidence</option>
                  <option value="REASONING">Reasoning</option>
                  <option value="STRUCTURE">Structure</option>
                  <option value="REVISION_REQUEST">Revision request</option>
                </select>
                <textarea
                  name="body"
                  rows={3}
                  placeholder="Leave targeted feedback that says what to improve next."
                  className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                />
                <button
                  type="submit"
                  className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm font-semibold text-ink"
                >
                  Save feedback
                </button>
              </form>
            ) : null}
          </section>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <article className="panel p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-2xl text-ink">Revision history</h3>
            <Badge>{project.revisions.length}</Badge>
          </div>

          <div className="mt-5 space-y-3">
            {project.revisions.length > 0 ? (
              project.revisions.map((revision) => (
                <div key={revision.id} className="rounded-2xl border border-line bg-white/60 p-4">
                  <p className="font-medium text-ink">{revision.createdBy.name}</p>
                  <p className="mt-1 text-sm text-ink/62">{new Date(revision.createdAt).toLocaleString()}</p>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-ink/60">
                No revision snapshots yet.
              </p>
            )}
          </div>
        </article>

        <article className="panel p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-2xl text-ink">Comments</h3>
            <Badge>{project.comments.length} entries</Badge>
          </div>

          <div className="mt-6 space-y-4">
            {project.comments.map((comment) => (
              <div key={comment.id} className="rounded-2xl border border-line bg-white/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-medium text-ink">{comment.user.name}</p>
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink/55">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <p className="mt-2 text-sm leading-6 text-ink/70">{comment.body}</p>
              </div>
            ))}
          </div>

          {viewer ? (
            <form action={addProjectCommentAction} className="print-hide mt-6 space-y-4">
              <input type="hidden" name="projectId" value={project.id} />
              <textarea
                name="body"
                rows={3}
                placeholder="Add a short discussion comment"
                className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
              />
              <button
                type="submit"
                className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm font-semibold text-ink"
              >
                Post comment
              </button>
            </form>
          ) : null}
        </article>
      </section>
    </div>
  );
}
