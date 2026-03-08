import Link from "next/link";

import { Badge } from "@/components/badge";

type MomentumEntry = {
  studentId: string;
  studentName: string;
  linkedTeamName: string | null;
  reason: string;
  daysWaiting: number;
  interventionLabel: string;
  interventionHref: string;
  interventionBody: string;
};

type AdminStudentMomentumDeskProps = {
  momentum: {
    neverStarted: MomentumEntry[];
    stalledDrafts: MomentumEntry[];
    revisionWaiting: MomentumEntry[];
    totalFlagged: number;
  };
};

function renderBucket(
  title: string,
  body: string,
  entries: MomentumEntry[],
  emptyState: string
) {
  return (
    <article className="rounded-[24px] border border-line bg-white/70 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-accent">{title}</p>
          <p className="mt-2 text-sm leading-6 text-ink/68">{body}</p>
        </div>
        <Badge>{entries.length}</Badge>
      </div>

      <div className="mt-5 space-y-4">
        {entries.length > 0 ? (
          entries.map((entry) => (
            <div key={`${title}-${entry.studentId}`} className="rounded-2xl border border-line bg-mist/35 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-ink">{entry.studentName}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-ink/55">
                    {entry.linkedTeamName ?? "League-wide"}
                    {entry.daysWaiting > 0 ? ` · ${entry.daysWaiting} days` : ""}
                  </p>
                </div>
                <Link
                  href={entry.interventionHref}
                  className="rounded-full border border-accent bg-accent px-3 py-1.5 text-sm font-medium text-white"
                >
                  {entry.interventionLabel}
                </Link>
              </div>
              <p className="mt-3 text-sm leading-6 text-ink/70">{entry.reason}</p>
              <p className="mt-3 text-sm text-ink/62">{entry.interventionBody}</p>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-ink/60">
            {emptyState}
          </div>
        )}
      </div>
    </article>
  );
}

export function AdminStudentMomentumDesk({ momentum }: AdminStudentMomentumDeskProps) {
  return (
    <section id="student-momentum" className="panel p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">
            Student momentum desk
          </p>
          <h3 className="mt-3 font-display text-2xl text-ink">Catch students before they fall off</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/70">
            Default stuck rules: no first project after onboarding, no draft update for 7 days, or revision
            requested with no follow-up for 5 days.
          </p>
        </div>
        <Badge tone={momentum.totalFlagged > 0 ? "warn" : "success"}>
          {momentum.totalFlagged} flagged
        </Badge>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        {renderBucket(
          "Never started",
          "Students who finished onboarding but have not opened the first project yet.",
          momentum.neverStarted,
          "No students are stuck before the first draft right now."
        )}
        {renderBucket(
          "Draft stalled",
          "Students with a draft that has sat untouched for at least 7 days.",
          momentum.stalledDrafts,
          "No stale drafts are waiting right now."
        )}
        {renderBucket(
          "Revision waiting",
          "Students who received revision feedback and still have not followed up after 5 days.",
          momentum.revisionWaiting,
          "No revision requests are aging without follow-up right now."
        )}
      </div>
    </section>
  );
}
