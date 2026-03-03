import Link from "next/link";

import { Badge } from "@/components/badge";
import { SectionHeading } from "@/components/section-heading";
import { getLaneLabel, getLaneTemplate } from "@/lib/publications";
import { getLanePrompt } from "@/lib/discovery-guidance";
import { parseProjectJson } from "@/server/data";
import { getViewer } from "@/server/auth";
import { getProjectsPageData } from "@/server/data";
import { publicationTypeLabels, submissionStatusLabels, type LaneTag } from "@/lib/types";

const laneCards: LaneTag[] = [
  "TOOL_BUILDERS",
  "POLICY_REFORM_ARCHITECTS",
  "STRATEGIC_OPERATORS",
  "ECONOMIC_INVESTIGATORS"
];

export default async function ProjectsPage() {
  const viewer = await getViewer();
  const { projects, recentPublications } = await getProjectsPageData();
  const drafts = viewer
    ? projects.filter(
        (project) =>
          project.createdByUserId === viewer.id &&
          (project.submissionStatus === "DRAFT" || project.submissionStatus === "REVISION_REQUESTED")
      )
    : [];
  const openStudioWork = projects.filter((project) =>
    ["DRAFT", "SUBMITTED", "REVISION_REQUESTED", "APPROVED_FOR_INTERNAL_PUBLICATION"].includes(project.submissionStatus)
  );
  const publishedWork = projects.filter((project) =>
    ["PUBLISHED_INTERNAL", "MARKED_EXTERNAL_READY", "APPROVED_FOR_EXTERNAL_PUBLICATION"].includes(project.submissionStatus)
  );

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Projects"
        title="Research studio and publication registry"
        description="This page now helps students choose the right lane, resume open studio work, and trace how a draft eventually becomes published research."
      />

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        {laneCards.map((lane) => {
          const template = getLaneTemplate(lane);
          return (
            <Link
              key={lane}
              href={`/projects/new?lane=${lane}`}
              className="panel block p-5 hover:border-accent"
            >
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">
                {getLaneLabel(lane)}
              </p>
              <h3 className="mt-3 font-display text-2xl text-ink">{template.outputLabel}</h3>
              <p className="mt-3 text-sm leading-6 text-ink/68">{getLanePrompt(lane)}</p>
            </Link>
          );
        })}
      </section>

      {viewer ? (
        <section className="panel p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-2xl text-ink">Continue your work</h3>
              <p className="mt-2 text-sm leading-6 text-ink/70">
                Drafts and revision requests stay visible here so you can return to the next weak section quickly.
              </p>
            </div>
            <Badge>{drafts.length} open</Badge>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {drafts.length > 0 ? (
              drafts.map((project) => {
                const parsed = parseProjectJson(project);
                return (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}/edit`}
                    className="rounded-2xl border border-line bg-white/60 p-4 hover:border-accent"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-ink">{project.title}</p>
                      <Badge tone="warn">{submissionStatusLabels[project.submissionStatus]}</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-ink/68">{project.summary}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.2em] text-ink/55">
                      {getLaneLabel(parsed.lanePrimary)}
                    </p>
                  </Link>
                );
              })
            ) : (
              <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-ink/60">
                No open drafts right now.
              </p>
            )}
          </div>
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="panel p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-2xl text-ink">Open studio work</h3>
            <Badge>{openStudioWork.length}</Badge>
          </div>

          <div className="mt-6 space-y-4">
            {openStudioWork.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line p-8 text-center">
                <p className="font-display text-2xl text-ink">No research in progress yet.</p>
                <p className="mt-3 text-sm leading-6 text-ink/68">
                  Pick a lane above to start your first project. Your draft will appear here as soon as you save it.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <Link
                    href="/projects/new"
                    className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
                  >
                    Start your first project
                  </Link>
                  <Link
                    href="/issues"
                    className="rounded-full border border-line bg-white/70 px-4 py-2 text-sm font-medium text-ink"
                  >
                    Browse open issues
                  </Link>
                </div>
              </div>
            ) : null}
            {openStudioWork.map((project) => {
              const parsed = parseProjectJson(project);

              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="block rounded-2xl border border-line bg-white/60 p-4 hover:border-accent"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-ink">{project.title}</p>
                      <p className="mt-2 text-sm leading-6 text-ink/68">{project.abstract ?? project.summary}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge>{publicationTypeLabels[project.publicationType]}</Badge>
                      <Badge tone="warn">{submissionStatusLabels[project.submissionStatus]}</Badge>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-line bg-mist/70 px-3 py-1 text-xs text-ink/68">
                      {getLaneLabel(parsed.lanePrimary)}
                    </span>
                    {project.team ? (
                      <span className="rounded-full border border-line bg-mist/70 px-3 py-1 text-xs text-ink/68">
                        {project.team.name}
                      </span>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        </article>

        <article className="panel p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-2xl text-ink">Published work</h3>
            <Badge>{publishedWork.length}</Badge>
          </div>

          <div className="mt-6 space-y-4">
            {recentPublications.length > 0 ? (
              recentPublications.map((publication) => (
                <Link
                  key={publication.id}
                  href={`/research/${publication.slug}`}
                  className="block rounded-2xl border border-line bg-white/60 p-4 hover:border-accent"
                >
                  <p className="font-medium text-ink">{publication.title}</p>
                  <p className="mt-2 text-sm leading-6 text-ink/68">{publication.abstract}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge>{publicationTypeLabels[publication.publicationType]}</Badge>
                    {publication.externalReady ? <Badge tone="success">External ready</Badge> : null}
                  </div>
                </Link>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-ink/60">
                No publications have been archived yet.
              </p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
