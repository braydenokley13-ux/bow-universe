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
