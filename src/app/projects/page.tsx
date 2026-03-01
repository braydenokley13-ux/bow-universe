import Link from "next/link";

import { Badge } from "@/components/badge";
import { SectionHeading } from "@/components/section-heading";
import { projectTypeLabels } from "@/lib/types";
import { createProjectAction } from "@/server/actions";
import { getViewer } from "@/server/auth";
import { getProjectsPageData, parseProjectJson } from "@/server/data";

const laneOptions = [
  { value: "TOOL_BUILDERS", label: "Lane 1 · Tool Builders" },
  { value: "POLICY_REFORM_ARCHITECTS", label: "Lane 2 · Policy Reform Architects" },
  { value: "STRATEGIC_OPERATORS", label: "Lane 3 · Strategic Operators" },
  { value: "ECONOMIC_INVESTIGATORS", label: "Lane 4 · Economic Investigators" }
];

export default async function ProjectsPage() {
  const viewer = await getViewer();
  const { projects, issues, teams, users } = await getProjectsPageData();
  const toolProjects = projects.filter((project) => project.projectType === "TOOL");

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Projects"
        title="Student work across four lanes"
        description="Projects are now live records. Students can publish tools, investigations, strategy plans, and proposal-support work in one shared league world."
      />

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="panel p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-2xl text-ink">Project registry</h3>
            <Badge>{projects.length} total</Badge>
          </div>

          <div className="mt-6 space-y-4">
            {projects.map((project) => {
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
                      <p className="mt-2 text-sm leading-6 text-ink/68">{project.summary}</p>
                    </div>
                    <Badge>{projectTypeLabels[project.projectType]}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {parsed.laneTags.map((laneTag) => (
                      <span
                        key={`${project.id}-${laneTag}`}
                        className="rounded-full border border-line bg-mist/70 px-3 py-1 text-xs text-ink/68"
                      >
                        {laneTag.replaceAll("_", " ")}
                      </span>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        </article>

        <article className="panel p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-2xl text-ink">Create project</h3>
            {viewer ? <Badge tone="success">{viewer.role}</Badge> : <Badge tone="warn">Sign in required</Badge>}
          </div>

          {viewer ? (
            <form action={createProjectAction} className="mt-6 space-y-4">
              <input
                name="title"
                placeholder="Project title"
                className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
              />
              <textarea
                name="summary"
                placeholder="Short summary"
                rows={3}
                className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
              />
              <select
                name="projectType"
                className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                defaultValue="INVESTIGATION"
              >
                {Object.entries(projectTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                name="teamId"
                defaultValue=""
                className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
              >
                <option value="">No linked team</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-line bg-white/55 p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Lane tags</p>
                  <div className="mt-3 space-y-2">
                    {laneOptions.map((lane) => (
                      <label key={lane.value} className="flex items-center gap-2 text-sm text-ink/72">
                        <input type="checkbox" name="laneTags" value={lane.value} className="rounded" />
                        {lane.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-line bg-white/55 p-4">
                  <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Linked issues</p>
                  <div className="mt-3 max-h-40 space-y-2 overflow-auto">
                    {issues.map((issue) => (
                      <label key={issue.id} className="flex items-center gap-2 text-sm text-ink/72">
                        <input type="checkbox" name="issueIds" value={issue.id} className="rounded" />
                        {issue.title}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-line bg-white/55 p-4">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Collaborators</p>
                <div className="mt-3 max-h-40 space-y-2 overflow-auto">
                  {users
                    .filter((user) => user.id !== viewer.id)
                    .map((user) => (
                      <label key={user.id} className="flex items-center gap-2 text-sm text-ink/72">
                        <input type="checkbox" name="collaboratorIds" value={user.id} className="rounded" />
                        {user.name}
                      </label>
                    ))}
                </div>
              </div>

              <textarea
                name="artifactLinks"
                rows={3}
                placeholder="Artifact links, one per line: Label | https://..."
                className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
              />
              <textarea
                name="findingsMd"
                rows={5}
                placeholder="- Finding one&#10;- Finding two"
                className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
              />
              <button
                type="submit"
                className="w-full rounded-2xl border border-accent bg-accent px-4 py-3 text-sm font-semibold text-white"
              >
                Save project
              </button>
            </form>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-ink/62">
              Sign in to create a project, choose lane tags, and add collaborators.
            </div>
          )}
        </article>
      </section>

      <section className="panel p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-2xl text-ink">Tool registry</h3>
          <Badge>{toolProjects.length} published tools</Badge>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {toolProjects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="rounded-2xl border border-line bg-white/60 p-4 hover:border-accent"
            >
              <p className="font-medium text-ink">{project.title}</p>
              <p className="mt-2 text-sm leading-6 text-ink/68">{project.summary}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
