import Link from "next/link";

import { Badge } from "@/components/badge";
import { SectionHeading } from "@/components/section-heading";
import {
  advanceSeasonAction,
  recordDecisionAction,
  saveIssueAction,
  updateProposalStatusAction,
  updateUserRoleAction
} from "@/server/actions";
import { requireAdmin } from "@/server/auth";
import { getAdminPageData } from "@/server/data";

export default async function AdminPage() {
  await requireAdmin();
  const { users, issues, proposals, currentSeason, rulesets, teams, activity, publications } = await getAdminPageData();

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Admin"
        title="Commissioner workspace"
        description="This page is now protected by real credentials auth. It gives the commissioner direct control over issues, proposal states, and user roles."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <div className="panel p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Current season</p>
          <p className="mt-3 font-display text-3xl text-ink">{currentSeason?.year ?? "-"}</p>
        </div>
        <div className="panel p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Rule versions</p>
          <p className="mt-3 font-display text-3xl text-ink">{rulesets.length}</p>
        </div>
        <div className="panel p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Users</p>
          <p className="mt-3 font-display text-3xl text-ink">{users.length}</p>
        </div>
      </section>

      <section className="panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-2xl text-ink">Season controls</h3>
            <p className="mt-2 text-sm leading-6 text-ink/70">
              Advance the league one season at a time. This recalculates all team snapshots, applies any pending ruleset, and logs new threshold issues.
            </p>
          </div>
          <form action={advanceSeasonAction}>
            <button
              type="submit"
              className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
            >
              Advance to {currentSeason ? currentSeason.year + 1 : "next season"}
            </button>
          </form>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="panel p-6">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-2xl text-ink">Create issue</h3>
            <Badge>{issues.length} tracked</Badge>
          </div>

          <form action={saveIssueAction} className="mt-5 space-y-4">
            <input
              name="title"
              placeholder="Issue title"
              className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
            />
            <input
              name="slug"
              placeholder="issue-slug"
              className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
            />
            <textarea
              name="description"
              rows={4}
              placeholder="Issue description"
              className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
            />
            <div className="grid gap-4 md:grid-cols-3">
              <select
                name="severity"
                defaultValue="3"
                className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
              >
                {[1, 2, 3, 4, 5].map((severity) => (
                  <option key={severity} value={severity}>
                    Severity {severity}
                  </option>
                ))}
              </select>
              <select
                name="status"
                defaultValue="OPEN"
                className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
              >
                <option value="OPEN">OPEN</option>
                <option value="IN_REVIEW">IN_REVIEW</option>
                <option value="RESOLVED">RESOLVED</option>
              </select>
              <select
                name="teamId"
                defaultValue=""
                className="rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
              >
                <option value="">League-wide issue</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              name="metricsJson"
              rows={4}
              defaultValue="{}"
              className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 font-mono text-sm text-ink outline-none focus:border-accent"
            />
            <textarea
              name="evidenceMd"
              rows={4}
              placeholder="- Evidence line one"
              className="w-full rounded-2xl border border-line bg-white/80 px-4 py-3 text-sm text-ink outline-none focus:border-accent"
            />
            <button
              type="submit"
              className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
            >
              Create issue
            </button>
          </form>
        </article>

        <article className="panel p-6">
          <h3 className="font-display text-2xl text-ink">Proposal workflow</h3>
          <div className="mt-5 space-y-4">
            {proposals.map((proposal) => (
              <div key={proposal.id} className="rounded-2xl border border-line bg-white/60 p-4">
                <form action={updateProposalStatusAction} className="space-y-4">
                  <input type="hidden" name="proposalId" value={proposal.id} />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-ink">{proposal.title}</p>
                      <p className="mt-1 text-sm text-ink/62">
                        {proposal.issue.title} · RuleSet v{proposal.targetRuleSet.version}
                      </p>
                    </div>
                    <Badge>{proposal.status.replace("_", " ")}</Badge>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <select
                      name="status"
                      defaultValue={proposal.status}
                      className="rounded-2xl border border-line bg-white px-4 py-2 text-sm text-ink outline-none focus:border-accent"
                    >
                      <option value="DRAFT">DRAFT</option>
                      <option value="SUBMITTED">SUBMITTED</option>
                      <option value="REVISION_REQUESTED">REVISION_REQUESTED</option>
                      <option value="APPROVED_FOR_INTERNAL_PUBLICATION">APPROVED_FOR_INTERNAL_PUBLICATION</option>
                      <option value="READY_FOR_VOTING">READY_FOR_VOTING</option>
                      <option value="VOTING">VOTING</option>
                      <option value="DECISION">DECISION</option>
                      <option value="PUBLISHED_INTERNAL">PUBLISHED_INTERNAL</option>
                      <option value="MARKED_EXTERNAL_READY">MARKED_EXTERNAL_READY</option>
                      <option value="APPROVED_FOR_EXTERNAL_PUBLICATION">APPROVED_FOR_EXTERNAL_PUBLICATION</option>
                    </select>
                    <input
                      name="voteStart"
                      type="datetime-local"
                      defaultValue={
                        proposal.voteStart
                          ? new Date(proposal.voteStart).toISOString().slice(0, 16)
                          : ""
                      }
                      className="rounded-2xl border border-line bg-white px-4 py-2 text-sm text-ink outline-none focus:border-accent"
                    />
                    <input
                      name="voteEnd"
                      type="datetime-local"
                      defaultValue={
                        proposal.voteEnd ? new Date(proposal.voteEnd).toISOString().slice(0, 16) : ""
                      }
                      className="rounded-2xl border border-line bg-white px-4 py-2 text-sm text-ink outline-none focus:border-accent"
                    />
                  </div>
                  <button
                    type="submit"
                    className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
                  >
                    Save workflow
                  </button>
                </form>

                <form action={recordDecisionAction} className="mt-4 space-y-3 rounded-2xl border border-line/70 bg-white/60 p-4">
                  <input type="hidden" name="proposalId" value={proposal.id} />
                  <div className="grid gap-3 md:grid-cols-[0.8fr_1.2fr]">
                    <select
                      name="decision"
                      defaultValue="APPROVE"
                      className="rounded-2xl border border-line bg-white px-4 py-2 text-sm text-ink outline-none focus:border-accent"
                    >
                      <option value="APPROVE">APPROVE</option>
                      <option value="DENY">DENY</option>
                      <option value="AMEND">AMEND</option>
                    </select>
                    <input
                      name="notes"
                      placeholder="Decision notes"
                      className="rounded-2xl border border-line bg-white px-4 py-2 text-sm text-ink outline-none focus:border-accent"
                    />
                  </div>
                  <textarea
                    name="amendedDiffJson"
                    rows={4}
                    placeholder='Optional amended diff JSON for AMEND'
                    className="w-full rounded-2xl border border-line bg-white px-4 py-3 font-mono text-sm text-ink outline-none focus:border-accent"
                  />
                  <button
                    type="submit"
                    className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink"
                  >
                    Record decision
                  </button>
                </form>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-2xl text-ink">Publication archive controls</h3>
            <p className="mt-2 text-sm leading-6 text-ink/70">
              Internal publications can also be flagged as externally ready so the archive stays
              prepared for future web and PDF release.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge>{publications.length} archived</Badge>
            <Link
              href="/admin/publications"
              className="rounded-full border border-line bg-white/80 px-4 py-2 text-sm font-medium text-ink"
            >
              Open publication queue
            </Link>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {publications.map((publication) => (
            <div key={publication.id} className="rounded-2xl border border-line bg-white/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-ink">{publication.title}</p>
                  <p className="mt-1 text-sm text-ink/62">
                    {publication.publicationType.replaceAll("_", " ")}
                    {publication.issue ? ` · ${publication.issue.title}` : ""}
                    {publication.team ? ` · ${publication.team.name}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {publication.externalReady ? <Badge tone="success">External ready</Badge> : <Badge>Internal only</Badge>}
                  {publication.externalApproved ? <Badge tone="success">External approved</Badge> : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel p-6">
        <h3 className="font-display text-2xl text-ink">Edit issues</h3>
        <div className="mt-5 space-y-4">
          {issues.map((issue) => (
            <form key={issue.id} action={saveIssueAction} className="rounded-2xl border border-line bg-white/60 p-4">
              <input type="hidden" name="issueId" value={issue.id} />
              <div className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                  <input
                    name="title"
                    defaultValue={issue.title}
                    className="rounded-2xl border border-line bg-white px-4 py-2 text-sm text-ink outline-none focus:border-accent"
                  />
                  <input
                    name="slug"
                    defaultValue={issue.slug}
                    className="rounded-2xl border border-line bg-white px-4 py-2 text-sm text-ink outline-none focus:border-accent"
                  />
                </div>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={issue.description}
                  className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                />
                <div className="grid gap-4 md:grid-cols-3">
                  <select
                    name="severity"
                    defaultValue={String(issue.severity)}
                    className="rounded-2xl border border-line bg-white px-4 py-2 text-sm text-ink outline-none focus:border-accent"
                  >
                    {[1, 2, 3, 4, 5].map((severity) => (
                      <option key={severity} value={severity}>
                        Severity {severity}
                      </option>
                    ))}
                  </select>
                  <select
                    name="status"
                    defaultValue={issue.status}
                    className="rounded-2xl border border-line bg-white px-4 py-2 text-sm text-ink outline-none focus:border-accent"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="IN_REVIEW">IN_REVIEW</option>
                    <option value="RESOLVED">RESOLVED</option>
                  </select>
                  <select
                    name="teamId"
                    defaultValue={issue.teamId ?? ""}
                    className="rounded-2xl border border-line bg-white px-4 py-2 text-sm text-ink outline-none focus:border-accent"
                  >
                    <option value="">League-wide issue</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  name="metricsJson"
                  rows={4}
                  defaultValue={JSON.stringify(issue.metricsJson ?? {}, null, 2)}
                  className="w-full rounded-2xl border border-line bg-white px-4 py-3 font-mono text-sm text-ink outline-none focus:border-accent"
                />
                <textarea
                  name="evidenceMd"
                  rows={4}
                  defaultValue={issue.evidenceMd ?? ""}
                  className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                />
                <button type="submit" className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white">
                  Save issue
                </button>
              </div>
            </form>
          ))}
        </div>
      </section>

      <section className="panel p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-2xl text-ink">User roles</h3>
          <Badge>{users.filter((user) => user.role === "ADMIN").length} admin</Badge>
        </div>

        <div className="mt-5 space-y-4">
          {users.map((user) => (
            <form key={user.id} action={updateUserRoleAction} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white/60 p-4">
              <input type="hidden" name="userId" value={user.id} />
              <div>
                <p className="font-medium text-ink">{user.name}</p>
                <p className="mt-1 text-sm text-ink/62">{user.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  name="role"
                  defaultValue={user.role}
                  className="rounded-2xl border border-line bg-white px-4 py-2 text-sm text-ink outline-none focus:border-accent"
                >
                  <option value="STUDENT">STUDENT</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
                <button type="submit" className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white">
                  Apply
                </button>
              </div>
            </form>
          ))}
        </div>
      </section>

      <section className="panel p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-2xl text-ink">Recent archive events</h3>
          <Badge>{activity.length}</Badge>
        </div>

        <div className="mt-5 space-y-3">
          {activity.map((event) => (
            <div key={event.id} className="rounded-2xl border border-line bg-white/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-medium text-ink">{event.title}</p>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink/55">
                  {new Date(event.createdAt).toLocaleDateString()}
                </p>
              </div>
              <p className="mt-2 text-sm leading-6 text-ink/68">{event.summary}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
