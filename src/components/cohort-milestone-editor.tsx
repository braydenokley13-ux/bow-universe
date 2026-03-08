"use client";

import type { saveCohortMilestoneAction, deleteCohortMilestoneAction } from "@/server/actions";

type Milestone = {
  id: string;
  cohortId: string;
  label: string;
  targetDate: Date;
  description: string | null;
};

type Props = {
  cohortId: string;
  milestones: Milestone[];
  saveAction: typeof saveCohortMilestoneAction;
  deleteAction: typeof deleteCohortMilestoneAction;
};

export function CohortMilestoneEditor({ cohortId, milestones, saveAction, deleteAction }: Props) {
  const isPast = (date: Date) => new Date(date) < new Date();

  return (
    <div className="space-y-3">
      {milestones.length === 0 && (
        <p className="text-sm text-ink/50">No milestones yet. Add one below.</p>
      )}

      {milestones.map((milestone) => (
        <div
          key={milestone.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white/60 px-4 py-3"
        >
          <div>
            <span className="font-medium text-ink">{milestone.label}</span>
            <span className={`ml-3 text-sm ${isPast(milestone.targetDate) ? "text-red-500" : "text-ink/60"}`}>
              {new Date(milestone.targetDate).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric"
              })}
              {isPast(milestone.targetDate) && " · Past due"}
            </span>
            {milestone.description && (
              <p className="mt-0.5 text-xs text-ink/50">{milestone.description}</p>
            )}
          </div>
          <form action={deleteAction}>
            <input type="hidden" name="milestoneId" value={milestone.id} />
            <input type="hidden" name="cohortId" value={milestone.cohortId} />
            <button type="submit" className="text-xs text-red-500 hover:underline">
              Remove
            </button>
          </form>
        </div>
      ))}

      <form action={saveAction} className="mt-4 grid gap-3 rounded-xl border border-dashed border-line p-4 sm:grid-cols-3">
        <input type="hidden" name="cohortId" value={cohortId} />
        <div className="space-y-1">
          <label className="text-xs font-medium uppercase tracking-wide text-ink/60">Label *</label>
          <input
            name="label"
            required
            className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
            placeholder="e.g. First draft due"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium uppercase tracking-wide text-ink/60">Target date *</label>
          <input
            name="targetDate"
            type="date"
            required
            className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium uppercase tracking-wide text-ink/60">Notes</label>
          <input
            name="description"
            className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
            placeholder="Optional note"
          />
        </div>
        <div className="sm:col-span-3">
          <button
            type="submit"
            className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            + Add milestone
          </button>
        </div>
      </form>
    </div>
  );
}
