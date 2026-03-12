import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/badge";
import { SectionHeading } from "@/components/section-heading";
import { CohortMilestoneEditor } from "@/components/cohort-milestone-editor";
import { CohortProgressTable } from "@/components/cohort-progress-table";
import {
  addCohortMemberAction,
  deleteCohortMilestoneAction,
  removeCohortMemberAction,
  saveCohortMilestoneAction,
  updateCohortAction
} from "@/server/actions";
import { requireAdmin } from "@/server/auth";
import { getCohort, getCohortProgress, getAdminPageData } from "@/server/data";

export default async function CohortDetailPage({
  params
}: {
  params: Promise<{ cohortId: string }>;
}) {
  await requireAdmin();
  const { cohortId } = await params;

  const [cohort, progress, { users }] = await Promise.all([
    getCohort(cohortId),
    getCohortProgress(cohortId),
    getAdminPageData()
  ]);

  if (!cohort || !progress) notFound();

  const memberIds = new Set(cohort.members.map((m) => m.userId));
  const nonMembers = users.filter((u) => u.role === "STUDENT" && !memberIds.has(u.id));
  const stalledRows = progress.rows.filter((row) => row.hasActiveStallSignal);
  const teamRiskRows = progress.rows.filter((row) => row.hasUnresolvedTeamPulse);
  const activeCampaignRows = progress.rows.filter((row) => row.activeMilestoneKey);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-[0.28em] text-accent">
            <Link href="/admin/cohorts" className="hover:underline">Admin · Cohorts</Link> →
          </p>
          <SectionHeading
            title={cohort.name}
            description={cohort.description ?? ""}
          />
        </div>
        <form action={updateCohortAction} className="panel p-4 space-y-3 min-w-64">
          <input type="hidden" name="cohortId" value={cohort.id} />
          <p className="text-xs font-medium uppercase tracking-wide text-ink/60">Edit cohort name</p>
          <input
            name="name"
            defaultValue={cohort.name}
            required
            className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
          <input
            name="description"
            defaultValue={cohort.description ?? ""}
            placeholder="Description (optional)"
            className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-full border border-accent px-4 py-1.5 text-sm font-medium text-accent"
          >
            Save
          </button>
        </form>
      </div>

      <section className="panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Attention</p>
            <h3 className="mt-3 font-display text-2xl text-ink">What needs a teacher look right now</h3>
            <p className="mt-2 text-sm leading-6 text-ink/70">
              These are summary signals only. Team prompts stay inside the student workspace.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={stalledRows.length > 0 ? "warn" : "success"}>
              {stalledRows.length} stalled
            </Badge>
            <Badge tone={teamRiskRows.length > 0 ? "warn" : "success"}>
              {teamRiskRows.length} team risks
            </Badge>
            <Badge>{activeCampaignRows.length} active campaigns</Badge>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-line bg-white/60 p-4">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Stall alerts</p>
            <div className="mt-3 space-y-3">
              {stalledRows.length > 0 ? (
                stalledRows.map((row) => (
                  <Link key={`stall-${row.user.id}`} href={row.activeProjectId ? `/projects/${row.activeProjectId}` : "#"} className="block rounded-2xl border border-line bg-white/80 px-3 py-3 hover:border-accent">
                    <p className="font-medium text-ink">{row.user.name}</p>
                    <p className="mt-1 text-sm text-ink/62">
                      {row.activeMilestoneKey ? row.activeMilestoneKey.toLowerCase().replaceAll("_", " ") : "campaign"}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="text-sm leading-6 text-ink/60">No active stall signals right now.</p>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-white/60 p-4">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Team pulse risk</p>
            <div className="mt-3 space-y-3">
              {teamRiskRows.length > 0 ? (
                teamRiskRows.map((row) => (
                  <Link key={`team-${row.user.id}`} href={row.activeProjectId ? `/projects/${row.activeProjectId}` : "#"} className="block rounded-2xl border border-line bg-white/80 px-3 py-3 hover:border-accent">
                    <p className="font-medium text-ink">{row.user.name}</p>
                    <p className="mt-1 text-sm text-ink/62">{row.activeProjectTitle ?? "Active campaign"}</p>
                  </Link>
                ))
              ) : (
                <p className="text-sm leading-6 text-ink/60">No unresolved team balance risks right now.</p>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-white/60 p-4">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Recent human progress</p>
            <div className="mt-3 space-y-3">
              {activeCampaignRows.length > 0 ? (
                activeCampaignRows.slice(0, 5).map((row) => (
                  <div key={`progress-${row.user.id}`} className="rounded-2xl border border-line bg-white/80 px-3 py-3">
                    <p className="font-medium text-ink">{row.user.name}</p>
                    <p className="mt-1 text-sm text-ink/62">
                      {row.lastHumanProgressAt
                        ? row.lastHumanProgressAt.toLocaleDateString("en-US")
                        : "No logged human progress yet"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm leading-6 text-ink/60">No active campaign projects yet.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Milestones */}
      <section className="panel p-6">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Milestones</p>
            <h3 className="mt-1 font-display text-2xl text-ink">Deadline tracker</h3>
          </div>
          <Badge>{cohort.milestones.length}</Badge>
        </div>
        <CohortMilestoneEditor
          cohortId={cohort.id}
          milestones={cohort.milestones}
          saveAction={saveCohortMilestoneAction}
          deleteAction={deleteCohortMilestoneAction}
        />
      </section>

      {/* Members */}
      <section className="panel p-6">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Members</p>
            <h3 className="mt-1 font-display text-2xl text-ink">Student roster</h3>
          </div>
          <Badge>{cohort.members.length}</Badge>
        </div>

        <div className="space-y-3">
          {cohort.members.map((member) => (
            <div key={member.userId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white/60 px-4 py-3">
              <div>
                <span className="font-medium text-ink">{member.user.name}</span>
                <span className="ml-2 text-sm text-ink/50">{member.user.email}</span>
                {member.user.linkedTeam && (
                  <span className="ml-2 text-xs text-accent">{member.user.linkedTeam.name}</span>
                )}
              </div>
              <form action={removeCohortMemberAction}>
                <input type="hidden" name="cohortId" value={cohort.id} />
                <input type="hidden" name="userId" value={member.userId} />
                <button
                  type="submit"
                  className="text-xs text-red-500 hover:underline"
                >
                  Remove
                </button>
              </form>
            </div>
          ))}

          {nonMembers.length > 0 && (
            <form action={addCohortMemberAction} className="flex flex-wrap items-center gap-3 pt-3">
              <input type="hidden" name="cohortId" value={cohort.id} />
              <select
                name="userId"
                required
                className="rounded-xl border border-line bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
              >
                <option value="">Add a student…</option>
                {nonMembers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
              >
                Add to cohort
              </button>
            </form>
          )}

          {cohort.members.length === 0 && nonMembers.length === 0 && (
            <p className="text-sm text-ink/50">No students found. Create student accounts first in the main admin panel.</p>
          )}
        </div>
      </section>

      {/* Progress */}
      <section className="panel p-6">
        <div className="mb-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Progress</p>
          <h3 className="mt-1 font-display text-2xl text-ink">Student submission tracker</h3>
          <p className="mt-1 text-sm text-ink/60">Projects and proposals per student, with last-activity timestamps.</p>
        </div>
        <CohortProgressTable rows={progress.rows} milestones={progress.milestones} />
      </section>
    </div>
  );
}
