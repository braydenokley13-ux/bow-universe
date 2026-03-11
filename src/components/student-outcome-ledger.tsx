import Link from "next/link";
import type {
  PublicationSourceType,
  StudentOutcomeKind,
  StudentOutcomeStatus
} from "@prisma/client";

import { Badge } from "@/components/badge";
import type { submitOutcomeProofAction } from "@/server/actions";

type OutcomeProof = {
  artifactSummary: string;
  artifactLink: string | null;
  evidenceCount: number;
  evidenceSummary: string;
  studentReflection: string;
  verificationMode: string;
  supportingPublicationId: string | null;
};

type OutcomeState = {
  id: string;
  kind: StudentOutcomeKind;
  label: string;
  status: StudentOutcomeStatus | null;
  statusLabel: string;
  proof: OutcomeProof;
  reviewNote: string | null;
  submittedAt: Date | null;
  verifiedAt: Date | null;
};

type OutcomeRow = {
  sourceType: PublicationSourceType;
  sourceId: string;
  title: string;
  href: string;
  issueTitle: string | null;
  updatedAt: Date;
  publication: {
    slug: string;
    title: string;
  } | null;
  evidenceEligible: boolean;
  canSubmitEvidenceProof: boolean;
  outcomeStates: OutcomeState[];
};

type Props = {
  outcomes: OutcomeRow[];
  pendingVerificationCount: number;
  submitAction: typeof submitOutcomeProofAction;
};

function toneForStatus(status: StudentOutcomeStatus | null) {
  if (status === "VERIFIED") return "success";
  if (status === "PENDING_VERIFICATION") return "warn";
  if (status === "REJECTED") return "warn";
  return undefined;
}

export function StudentOutcomeLedger({ outcomes, pendingVerificationCount, submitAction }: Props) {
  return (
    <section className="panel p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Outcome ledger</p>
          <h3 className="mt-3 font-display text-2xl text-ink">Count the work that is actually real</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/70">
            These records only count when there is a real artifact, real evidence, and a real verification step.
          </p>
        </div>
        <Badge tone={pendingVerificationCount > 0 ? "warn" : "success"}>
          {pendingVerificationCount > 0 ? `${pendingVerificationCount} waiting on review` : "No proof waiting"}
        </Badge>
      </div>

      <div className="mt-6 space-y-5">
        {outcomes.length > 0 ? (
          outcomes.map((entry) => {
            const evidenceState = entry.outcomeStates.find((state) => state.kind === "EVIDENCE_DEFENDED");

            return (
              <article key={`${entry.sourceType}-${entry.sourceId}`} className="rounded-[24px] border border-line bg-white/60 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-ink">{entry.title}</p>
                      <Badge>{entry.sourceType === "PROJECT" ? "Project" : "Proposal"}</Badge>
                      {entry.issueTitle ? <Badge>{entry.issueTitle}</Badge> : null}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-ink/68">
                      Last updated {entry.updatedAt.toLocaleDateString("en-US")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={entry.href}
                      className="rounded-full border border-line bg-white/80 px-4 py-2 text-sm font-medium text-ink"
                    >
                      Open source
                    </Link>
                    {entry.publication ? (
                      <Link
                        href={`/research/${entry.publication.slug}`}
                        className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
                      >
                        Open publication
                      </Link>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5 grid gap-4 xl:grid-cols-3">
                  {entry.outcomeStates.map((state) => (
                    <div key={state.id} className="rounded-2xl border border-line bg-white/70 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-medium text-ink">{state.label}</p>
                        <Badge tone={toneForStatus(state.status)}>{state.statusLabel}</Badge>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-ink/68">
                        {state.proof.artifactSummary || "No proof has been recorded for this outcome yet."}
                      </p>
                      {state.proof.evidenceSummary ? (
                        <p className="mt-2 text-sm leading-6 text-ink/60">{state.proof.evidenceSummary}</p>
                      ) : null}
                      {state.reviewNote ? (
                        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-warn">{state.reviewNote}</p>
                      ) : null}
                      {state.verifiedAt ? (
                        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-ink/55">
                          Verified {state.verifiedAt.toLocaleDateString("en-US")}
                        </p>
                      ) : state.submittedAt ? (
                        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-ink/55">
                          Submitted {state.submittedAt.toLocaleDateString("en-US")}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>

                {entry.canSubmitEvidenceProof && evidenceState ? (
                  <form action={submitAction} className="mt-5 rounded-2xl border border-dashed border-line bg-white/75 p-4">
                    <input type="hidden" name="sourceType" value={entry.sourceType} />
                    <input type="hidden" name="sourceId" value={entry.sourceId} />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-ink">Submit evidence proof</p>
                        <p className="mt-2 text-sm leading-6 text-ink/68">
                          This source already passes the basic evidence gate. Add your plain-language proof so an adult can verify it.
                        </p>
                      </div>
                      <Badge tone="success">{evidenceState.proof.evidenceCount} evidence item(s)</Badge>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <label className="text-sm text-ink/68">
                        Artifact summary
                        <input
                          name="artifactSummary"
                          defaultValue={evidenceState.proof.artifactSummary}
                          className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                        />
                      </label>
                      <label className="text-sm text-ink/68">
                        Evidence summary
                        <input
                          name="evidenceSummary"
                          defaultValue={evidenceState.proof.evidenceSummary}
                          className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                        />
                      </label>
                    </div>

                    <label className="mt-4 block text-sm text-ink/68">
                      Reflection
                      <textarea
                        name="studentReflection"
                        rows={3}
                        defaultValue={evidenceState.proof.studentReflection}
                        className="mt-2 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                      />
                    </label>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm text-ink/60">
                        Write it like a real person could understand why this work counts.
                      </p>
                      <button
                        type="submit"
                        className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
                      >
                        Submit for verification
                      </button>
                    </div>
                  </form>
                ) : evidenceState?.status === "PENDING_VERIFICATION" ? (
                  <div className="mt-5 rounded-2xl border border-line bg-amber-50/70 px-4 py-4 text-sm leading-6 text-ink/70">
                    Your evidence proof is waiting for teacher or commissioner review.
                  </div>
                ) : null}
              </article>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-ink/60">
            No verified outcomes yet. Start with one real piece of work, then come back here when it is ready for proof.
          </div>
        )}
      </div>
    </section>
  );
}
