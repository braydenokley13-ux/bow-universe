import Link from "next/link";
import type { PublicationSourceType } from "@prisma/client";

import { Badge } from "@/components/badge";
import type {
  recordManualVerifiedImpactAction,
  reviewOutcomeAction
} from "@/server/actions";

type PendingEvidenceOutcome = {
  id: string;
  sourceType: PublicationSourceType;
  sourceId: string;
  sourceTitle: string;
  sourceHref: string;
  studentName: string;
  submittedAt: Date | null;
  reviewNote: string | null;
  artifactSummary: string;
  evidenceSummary: string;
  studentReflection: string;
  evidenceCount: number;
};

type ImpactCandidate = {
  id: string;
  sourceType: PublicationSourceType;
  sourceId: string;
  sourceTitle: string;
  sourceHref: string;
  studentName: string;
  artifactSummary: string;
  evidenceSummary: string;
  verifiedAt: Date | null;
};

type Props = {
  queue: {
    pendingEvidenceOutcomes: PendingEvidenceOutcome[];
    impactCandidates: ImpactCandidate[];
    totalPending: number;
    totalImpactCandidates: number;
  };
  reviewAction: typeof reviewOutcomeAction;
  impactAction: typeof recordManualVerifiedImpactAction;
};

export function AdminOutcomeReviewDesk({ queue, reviewAction, impactAction }: Props) {
  return (
    <section id="outcome-review" className="panel p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Outcome review</p>
          <h3 className="mt-3 font-display text-2xl text-ink">Verify work that is actually real</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/70">
            Review student proof here. These cards are about evidence and impact, not just status changes.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={queue.totalPending > 0 ? "warn" : "success"}>{queue.totalPending} pending</Badge>
          <Badge>{queue.totalImpactCandidates} impact candidates</Badge>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-display text-xl text-ink">Pending evidence proof</h4>
            <Badge>{queue.pendingEvidenceOutcomes.length}</Badge>
          </div>

          {queue.pendingEvidenceOutcomes.length > 0 ? (
            queue.pendingEvidenceOutcomes.map((outcome) => (
              <article key={outcome.id} className="rounded-[24px] border border-line bg-white/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-ink">{outcome.sourceTitle}</p>
                    <p className="mt-2 text-sm leading-6 text-ink/68">
                      {outcome.studentName} submitted proof
                      {outcome.submittedAt ? ` on ${outcome.submittedAt.toLocaleDateString("en-US")}` : ""}.
                    </p>
                  </div>
                  <Link
                    href={outcome.sourceHref}
                    className="rounded-full border border-line bg-white/80 px-4 py-2 text-sm font-medium text-ink"
                  >
                    Open source
                  </Link>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-line bg-white/70 p-3">
                    <p className="font-medium text-ink">Artifact</p>
                    <p className="mt-2 text-sm leading-6 text-ink/68">{outcome.artifactSummary}</p>
                  </div>
                  <div className="rounded-2xl border border-line bg-white/70 p-3">
                    <p className="font-medium text-ink">Evidence</p>
                    <p className="mt-2 text-sm leading-6 text-ink/68">{outcome.evidenceSummary}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-ink/55">
                      {outcome.evidenceCount} evidence item(s)
                    </p>
                  </div>
                  <div className="rounded-2xl border border-line bg-white/70 p-3">
                    <p className="font-medium text-ink">Reflection</p>
                    <p className="mt-2 text-sm leading-6 text-ink/68">{outcome.studentReflection}</p>
                  </div>
                </div>

                <form action={reviewAction} className="mt-4 space-y-3">
                  <input type="hidden" name="outcomeId" value={outcome.id} />
                  <textarea
                    name="reviewNote"
                    rows={3}
                    placeholder="Explain why this proof is verified or what still needs to change."
                    defaultValue={outcome.reviewNote ?? ""}
                    className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                  />
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      name="decision"
                      value="VERIFY"
                      className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
                    >
                      Verify evidence
                    </button>
                    <button
                      type="submit"
                      name="decision"
                      value="REJECT"
                      className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink"
                    >
                      Return for revision
                    </button>
                  </div>
                </form>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-ink/60">
              No evidence outcomes are waiting for review right now.
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-display text-xl text-ink">Manual impact signoff</h4>
            <Badge>{queue.impactCandidates.length}</Badge>
          </div>

          {queue.impactCandidates.length > 0 ? (
            queue.impactCandidates.map((candidate) => (
              <article key={candidate.id} className="rounded-[24px] border border-line bg-white/60 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-ink">{candidate.sourceTitle}</p>
                    <p className="mt-2 text-sm leading-6 text-ink/68">
                      {candidate.studentName} already has verified evidence for this work.
                    </p>
                  </div>
                  <Link
                    href={candidate.sourceHref}
                    className="rounded-full border border-line bg-white/80 px-4 py-2 text-sm font-medium text-ink"
                  >
                    Open source
                  </Link>
                </div>

                <p className="mt-4 text-sm leading-6 text-ink/68">{candidate.evidenceSummary || candidate.artifactSummary}</p>
                {candidate.verifiedAt ? (
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-ink/55">
                    Evidence verified {candidate.verifiedAt.toLocaleDateString("en-US")}
                  </p>
                ) : null}

                <form action={impactAction} className="mt-4 space-y-3">
                  <input type="hidden" name="sourceType" value={candidate.sourceType} />
                  <input type="hidden" name="sourceId" value={candidate.sourceId} />
                  <textarea
                    name="reviewNote"
                    rows={3}
                    placeholder="Record the classroom or publication impact that makes this outcome count."
                    className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                  />
                  <button
                    type="submit"
                    className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
                  >
                    Record verified impact
                  </button>
                </form>
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-ink/60">
              No manual impact candidates are waiting right now.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
