import Link from "next/link";

import { Badge } from "@/components/badge";
import { SectionHeading } from "@/components/section-heading";
import {
  createCohortAction,
  deleteCohortAction
} from "@/server/actions";
import { requireAdmin } from "@/server/auth";
import { getAllCohorts } from "@/server/data";

export default async function CohortsPage() {
  await requireAdmin();
  const cohorts = await getAllCohorts();

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Admin · Cohorts"
        title="Teacher cohort management"
        description="Organize students into cohorts with shared milestones and deadlines. Track progress across all cohort members."
      />

      <section className="panel p-6">
        <h3 className="font-display text-2xl text-ink">Create new cohort</h3>
        <p className="mt-1 text-sm text-ink/60">
          A cohort groups students together — typically one class period or project team.
        </p>

        <form action={createCohortAction} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide text-ink/60">Cohort name *</label>
              <input
                name="name"
                required
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
                placeholder="e.g. Period 3 · Spring 2026"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-wide text-ink/60">Description</label>
              <input
                name="description"
                className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
                placeholder="Optional notes about this cohort"
              />
            </div>
          </div>
          <button
            type="submit"
            className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            Create cohort
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-xl text-ink">All cohorts</h3>
          <Badge>{cohorts.length}</Badge>
        </div>

        {cohorts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink/50">
            No cohorts yet. Create your first one above.
          </div>
        ) : (
          <div className="space-y-3">
            {cohorts.map((cohort) => (
              <div key={cohort.id} className="panel p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-display text-xl text-ink">{cohort.name}</h4>
                      <Badge>{cohort.members.length} students</Badge>
                      {cohort.milestones.length > 0 && (
                        <Badge tone="success">{cohort.milestones.length} milestones</Badge>
                      )}
                    </div>
                    {cohort.description && (
                      <p className="mt-1 text-sm text-ink/60">{cohort.description}</p>
                    )}
                    <p className="mt-2 text-xs text-ink/40">
                      Created {new Date(cohort.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Link
                      href={`/admin/cohorts/${cohort.id}`}
                      className="rounded-full border border-accent px-4 py-2 text-sm font-medium text-accent"
                    >
                      Manage →
                    </Link>
                    <form action={deleteCohortAction}>
                      <input type="hidden" name="cohortId" value={cohort.id} />
                      <button
                        type="submit"
                        className="rounded-full border border-line px-3 py-2 text-xs text-ink/50 hover:text-red-600"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </div>

                {cohort.milestones.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {cohort.milestones.map((milestone) => (
                      <span
                        key={milestone.id}
                        className="rounded-full border border-line bg-mist px-3 py-1 text-xs text-ink/70"
                      >
                        {milestone.label} — {new Date(milestone.targetDate).toLocaleDateString()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
