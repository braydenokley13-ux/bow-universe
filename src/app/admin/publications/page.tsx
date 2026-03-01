import Link from "next/link";

import {
  ExternalPublicationTarget,
  PublicationSourceType,
  ProposalStatus,
  SubmissionStatus
} from "@prisma/client";

import { Badge } from "@/components/badge";
import { SectionHeading } from "@/components/section-heading";
import { updatePublicationExportAction, reviewProjectAction, reviewProposalAction } from "@/server/actions";
import { requireAdmin } from "@/server/auth";
import { getAdminPublicationsData } from "@/server/data";
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

const exportTargets: ExternalPublicationTarget[] = [
  ExternalPublicationTarget.WEB,
  ExternalPublicationTarget.PDF
];

const exportStatuses = ["PLANNED", "IN_PROGRESS", "READY", "GENERATED", "PUBLISHED"] as const;

export default async function AdminPublicationsPage() {
  await requireAdmin();
  const publications = await getAdminPublicationsData();

  const externalReadyCount = publications.filter((publication) => publication.externalReady).length;
  const externalApprovedCount = publications.filter((publication) => publication.externalApproved).length;
  const queuedExports = publications.flatMap((publication) => publication.exports).length;

  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="Admin"
        title="Publication queue"
        description="This queue keeps internal publications ready for later web and PDF release. Review the source record status first, then track each export target separately."
      />

      <section className="grid gap-4 md:grid-cols-3">
        <div className="panel p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Archive records</p>
          <p className="mt-3 font-display text-3xl text-ink">{publications.length}</p>
        </div>
        <div className="panel p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">External ready</p>
          <p className="mt-3 font-display text-3xl text-ink">{externalReadyCount}</p>
        </div>
        <div className="panel p-5">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Export queue rows</p>
          <p className="mt-3 font-display text-3xl text-ink">{queuedExports}</p>
          <p className="mt-2 text-sm text-ink/62">{externalApprovedCount} externally approved</p>
        </div>
      </section>

      <section className="panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-2xl text-ink">Archive control surface</h3>
            <p className="mt-2 text-sm leading-6 text-ink/70">
              Each record below shows the archive metadata, the source workflow state, and the future export queue for web and PDF publishing.
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
          {publications.map((publication) => (
            <article key={publication.id} className="rounded-[28px] border border-line bg-white/60 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{publicationTypeLabels[publication.publicationType]}</Badge>
                    <Badge>
                      {publication.sourceType === PublicationSourceType.PROJECT ? "Project source" : "Proposal source"}
                    </Badge>
                    {publication.externalReady ? <Badge tone="success">External ready</Badge> : <Badge>Internal only</Badge>}
                    {publication.externalApproved ? <Badge tone="success">External approved</Badge> : null}
                  </div>
                  <h3 className="mt-4 font-display text-2xl text-ink">{publication.title}</h3>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/70">{publication.abstract}</p>
                </div>

                <div className="flex flex-wrap gap-3 print-hide">
                  <Link
                    href={`/research/${publication.slug}`}
                    className="rounded-full border border-line bg-white/80 px-4 py-2 text-sm font-medium text-ink"
                  >
                    Open archive page
                  </Link>
                  <Link
                    href={
                      publication.sourceType === PublicationSourceType.PROJECT
                        ? `/projects/${publication.sourceId}`
                        : `/proposals/${publication.sourceId}`
                    }
                    className="rounded-full border border-line bg-white/80 px-4 py-2 text-sm font-medium text-ink"
                  >
                    Open source record
                  </Link>
                </div>
              </div>

              <div className="mt-5 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-4 rounded-3xl border border-line bg-white/55 p-5">
                  <div className="grid gap-3 text-sm leading-6 text-ink/70 md:grid-cols-2">
                    <p>Slug: {publication.slug}</p>
                    <p>Version: {publication.canonicalVersion}</p>
                    <p>Published: {new Date(publication.publishedAt).toLocaleDateString()}</p>
                    <p>Author line: {publication.authorLine}</p>
                    {publication.issue ? <p>Issue: {publication.issue.title}</p> : null}
                    {publication.team ? <p>Team: {publication.team.name}</p> : null}
                    {publication.season ? <p>Season: {publication.season.year}</p> : null}
                    <p>
                      Source workflow:{" "}
                      <span className="font-medium text-ink">
                        {publication.sourceStatus?.replaceAll("_", " ") ?? "Unknown"}
                      </span>
                    </p>
                  </div>

                  {publication.sourceType === PublicationSourceType.PROJECT ? (
                    <form action={reviewProjectAction} className="space-y-3 print-hide">
                      <input type="hidden" name="projectId" value={publication.sourceId} />
                      <label className="block text-sm font-medium text-ink">Project publication state</label>
                      <div className="flex flex-wrap items-center gap-3">
                        <select
                          name="submissionStatus"
                          defaultValue={(publication.sourceStatus as SubmissionStatus | undefined) ?? SubmissionStatus.PUBLISHED_INTERNAL}
                          className="rounded-2xl border border-line bg-white px-4 py-2 text-sm text-ink outline-none focus:border-accent"
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
                      </div>
                    </form>
                  ) : (
                    <form action={reviewProposalAction} className="space-y-3 print-hide">
                      <input type="hidden" name="proposalId" value={publication.sourceId} />
                      <label className="block text-sm font-medium text-ink">Proposal publication state</label>
                      <div className="flex flex-wrap items-center gap-3">
                        <select
                          name="status"
                          defaultValue={(publication.sourceStatus as ProposalStatus | undefined) ?? ProposalStatus.PUBLISHED_INTERNAL}
                          className="rounded-2xl border border-line bg-white px-4 py-2 text-sm text-ink outline-none focus:border-accent"
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
                      </div>
                    </form>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {exportTargets.map((target) => {
                    const exportRow = publication.exports.find((entry) => entry.target === target);

                    return (
                      <form
                        key={`${publication.id}-${target}`}
                        action={updatePublicationExportAction}
                        className="rounded-3xl border border-line bg-white/55 p-5 print-hide"
                      >
                        <input type="hidden" name="publicationId" value={publication.id} />
                        <input type="hidden" name="target" value={target} />

                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-display text-xl text-ink">{target} export</p>
                            <p className="mt-1 text-sm text-ink/62">
                              Track the future {target.toLowerCase()} release pipeline here.
                            </p>
                          </div>
                          <Badge tone={exportRow ? "success" : "default"}>
                            {exportRow?.status ?? "Not queued"}
                          </Badge>
                        </div>

                        <div className="mt-4 space-y-3">
                          <select
                            name="status"
                            defaultValue={exportRow?.status ?? (publication.externalReady ? "PLANNED" : "IN_PROGRESS")}
                            className="w-full rounded-2xl border border-line bg-white px-4 py-2 text-sm text-ink outline-none focus:border-accent"
                          >
                            {exportStatuses.map((status) => (
                              <option key={status} value={status}>
                                {status.replaceAll("_", " ")}
                              </option>
                            ))}
                          </select>
                          <input
                            name="artifactUrl"
                            defaultValue={exportRow?.artifactUrl ?? ""}
                            placeholder="Optional artifact URL"
                            className="w-full rounded-2xl border border-line bg-white px-4 py-2 text-sm text-ink outline-none focus:border-accent"
                          />
                          <textarea
                            name="notes"
                            rows={3}
                            defaultValue={exportRow?.notes ?? ""}
                            placeholder="Queue notes"
                            className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none focus:border-accent"
                          />
                          <button
                            type="submit"
                            className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-ink"
                          >
                            Save {target.toLowerCase()} queue
                          </button>
                        </div>
                      </form>
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
