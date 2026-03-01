import Link from "next/link";

import {
  ExternalPublicationTarget,
  PublicationSourceType,
  ProposalStatus,
  SubmissionStatus
} from "@prisma/client";

import { Badge } from "@/components/badge";
import { PublicationExportCard } from "@/components/publication-export-card";
import { PublicationReadinessCard } from "@/components/publication-readiness-card";
import { SectionHeading } from "@/components/section-heading";
import {
  reviewProjectAction,
  reviewProposalAction,
  updatePublicationExportAction
} from "@/server/actions";
import { requireAdmin } from "@/server/auth";
import { getAdminPublicationsData } from "@/server/data";
import { getPublicationQueueState } from "@/lib/publication-queue";
import { publicationTypeLabels, submissionStatusLabels } from "@/lib/types";

const projectReviewStatuses: SubmissionStatus[] = [
  SubmissionStatus.REVISION_REQUESTED,
  SubmissionStatus.APPROVED_FOR_INTERNAL_PUBLICATION,
  SubmissionStatus.PUBLISHED_INTERNAL,
  SubmissionStatus.MARKED_EXTERNAL_READY,
  SubmissionStatus.APPROVED_FOR_EXTERNAL_PUBLICATION
];

const proposalReviewStatuses: ProposalStatus[] = [
  ProposalStatus.REVISION_REQUESTED,
  ProposalStatus.APPROVED_FOR_INTERNAL_PUBLICATION,
  ProposalStatus.READY_FOR_VOTING,
  ProposalStatus.PUBLISHED_INTERNAL,
  ProposalStatus.MARKED_EXTERNAL_READY,
  ProposalStatus.APPROVED_FOR_EXTERNAL_PUBLICATION
];

export default async function AdminPublicationsPage() {
  await requireAdmin();
  const publications = await getAdminPublicationsData();

  const states = publications.map((publication) => ({
    publication,
    queueState: getPublicationQueueState(publication)
  }));
  const externallyReadyCount = publications.filter((publication) => publication.externalReady).length;
  const externallyApprovedCount = publications.filter((publication) => publication.externalApproved).length;
  const queueRows = publications.flatMap((publication) => publication.exports).length;

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Admin"
        title="Publication queue"
        description="This queue now shows the source workflow, the archive record quality, and the safety of each export move before a commissioner updates anything."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <div className="panel p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Archive records</p>
          <p className="mt-3 font-display text-3xl text-ink">{publications.length}</p>
        </div>
        <div className="panel p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">External ready</p>
          <p className="mt-3 font-display text-3xl text-ink">{externallyReadyCount}</p>
          <p className="mt-2 text-sm text-ink/62">{externallyApprovedCount} externally approved</p>
        </div>
        <div className="panel p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Export rows</p>
          <p className="mt-3 font-display text-3xl text-ink">{queueRows}</p>
        </div>
      </section>

      <section className="panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-2xl text-ink">Archive control surface</h3>
            <p className="mt-2 text-sm leading-6 text-ink/70">
              Work from left to right on each card: check the source, clean the archive record, then update WEB and PDF export rows.
            </p>
          </div>
          <Link
            href="/admin"
            className="rounded-full border border-line bg-white/80 px-4 py-2 text-sm font-medium text-ink"
          >
            Back to admin
          </Link>
        </div>

        <div className="mt-6 space-y-6">
          {states.map(({ publication, queueState }) => (
            <article key={publication.id} className="space-y-4">
              <PublicationReadinessCard
                publication={{
                  id: publication.id,
                  title: publication.title,
                  slug: publication.slug,
                  abstract: publication.abstract,
                  sourceType: publication.sourceType,
                  sourceId: publication.sourceId,
                  sourceStatus: publication.sourceStatus,
                  issue: publication.issue,
                  team: publication.team,
                  season: publication.season,
                  externalReady: publication.externalReady,
                  externalApproved: publication.externalApproved
                }}
                state={queueState}
              />

              <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
                <section className="rounded-[28px] border border-line bg-white/60 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent">Source workflow</p>
                      <h3 className="mt-3 font-display text-2xl text-ink">Keep the source record aligned</h3>
                    </div>
                    <Badge>{publicationTypeLabels[publication.publicationType]}</Badge>
                  </div>

                  <div className="mt-4 text-sm leading-6 text-ink/68">
                    <p>
                      Source type:{" "}
                      <span className="font-medium text-ink">
                        {publication.sourceType === PublicationSourceType.PROJECT ? "Project" : "Proposal"}
                      </span>
                    </p>
                    <p>
                      Source state:{" "}
                      <span className="font-medium text-ink">
                        {publication.sourceStatus
                          ? publication.sourceType === PublicationSourceType.PROJECT
                            ? submissionStatusLabels[publication.sourceStatus as SubmissionStatus]
                            : publication.sourceStatus.replaceAll("_", " ")
                          : "Source record missing or not loaded"}
                      </span>
                    </p>
                  </div>

                  {!publication.sourceStatus ? (
                    <div className="mt-4 rounded-2xl border border-warn/20 bg-warn/10 px-4 py-3 text-sm leading-6 text-ink/72">
                      This archive record is missing a live source workflow state, so review controls are disabled until the source record is restored or resynced.
                    </div>
                  ) : publication.sourceType === PublicationSourceType.PROJECT ? (
                    <form action={reviewProjectAction} className="mt-4 space-y-3">
                      <input type="hidden" name="projectId" value={publication.sourceId} />
                      <select
                        name="submissionStatus"
                        defaultValue={publication.sourceStatus as SubmissionStatus}
                        className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                      >
                        {projectReviewStatuses.map((status) => (
                          <option key={status} value={status}>
                            {submissionStatusLabels[status]}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
                      >
                        Save project review state
                      </button>
                    </form>
                  ) : (
                    <form action={reviewProposalAction} className="mt-4 space-y-3">
                      <input type="hidden" name="proposalId" value={publication.sourceId} />
                      <select
                        name="status"
                        defaultValue={publication.sourceStatus as ProposalStatus}
                        className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                      >
                        {proposalReviewStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status.replaceAll("_", " ")}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded-full border border-accent bg-accent px-4 py-2 text-sm font-medium text-white"
                      >
                        Save proposal review state
                      </button>
                    </form>
                  )}
                </section>

                <div className="grid gap-4 md:grid-cols-2">
                  {[ExternalPublicationTarget.WEB, ExternalPublicationTarget.PDF].map((target) => {
                    const exportRow = publication.exports.find((entry) => entry.target === target);
                    const state = queueState.exportTargets.find((entry) => entry.target === target)!;

                    return (
                      <PublicationExportCard
                        key={`${publication.id}-${target}`}
                        publicationId={publication.id}
                        target={target}
                        state={state}
                        exportRow={exportRow}
                        action={updatePublicationExportAction}
                      />
                    );
                  })}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
