import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";

import { Badge } from "@/components/badge";
import { SectionHeading } from "@/components/section-heading";
import { addProjectCommentAction } from "@/server/actions";
import { getViewer } from "@/server/auth";
import { getProjectPageData, parseProjectJson } from "@/server/data";

export default async function ProjectDetailPage({ params }: { params: { projectId: string } }) {
  const [viewer, project] = await Promise.all([getViewer(), getProjectPageData(params.projectId)]);

  if (!project) {
    notFound();
  }

  const parsed = parseProjectJson(project);

  return (
    <div className="space-y-8">
      <SectionHeading eyebrow="Project Detail" title={project.title} description={project.summary} />

      <section className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
        <article className="panel p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{project.projectType.replace("_", " ")}</Badge>
            {parsed.laneTags.map((laneTag) => (
              <Badge key={`${project.id}-${laneTag}`}>{laneTag.replaceAll("_", " ")}</Badge>
            ))}
          </div>

          <div className="prose prose-sm mt-6 max-w-none text-ink/75 prose-p:leading-7 prose-li:leading-7">
            <ReactMarkdown>{project.findingsMd}</ReactMarkdown>
          </div>
        </article>

        <article className="panel p-6">
          <h3 className="font-display text-2xl text-ink">Project metadata</h3>
          <div className="mt-5 space-y-4 text-sm leading-6 text-ink/70">
            <p>
              Created by <span className="font-medium text-ink">{project.createdBy.name}</span>
            </p>
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
        </article>
      </section>

      <section className="panel p-6">
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
          <form action={addProjectCommentAction} className="mt-6 space-y-4">
            <input type="hidden" name="projectId" value={project.id} />
            <textarea
              name="body"
              rows={3}
              placeholder="Add a short comment"
              className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
            />
            <button
              type="submit"
              className="rounded-2xl border border-accent bg-accent px-4 py-3 text-sm font-semibold text-white"
            >
              Post comment
            </button>
          </form>
        ) : null}
      </section>
    </div>
  );
}
