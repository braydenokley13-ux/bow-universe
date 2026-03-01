import {
  ExternalPublicationTarget,
  ProposalStatus,
  PublicationSourceType,
  SubmissionStatus
} from "@prisma/client";

import { getExportGuard } from "@/lib/workflow-guards";

export type ExportTargetState = {
  target: ExternalPublicationTarget;
  status: string;
  warning: string | null;
  nextAction: string;
  enabled: boolean;
};

export type PublicationQueueState = {
  archiveReady: boolean;
  sourceReady: boolean;
  externalReady: boolean;
  warnings: string[];
  qualityChecklist: Array<{
    label: string;
    complete: boolean;
  }>;
  nextAction: string;
  exportTargets: ExportTargetState[];
};

type PublicationQueueInput = {
  slug: string;
  title: string;
  abstract: string;
  citationText: string;
  externalReady: boolean;
  externalApproved: boolean;
  sourceType: PublicationSourceType;
  sourceStatus?: ProposalStatus | SubmissionStatus | null | undefined;
  exports: Array<{
    target: ExternalPublicationTarget;
    status: string;
  }>;
  issue?: { title: string } | null;
  team?: { name: string } | null;
  season?: { year: number } | null;
};

function isSourceInternallyReady(sourceStatus: ProposalStatus | SubmissionStatus | null | undefined) {
  if (!sourceStatus) {
    return false;
  }

  return new Set<ProposalStatus | SubmissionStatus>([
    ProposalStatus.PUBLISHED_INTERNAL,
    ProposalStatus.MARKED_EXTERNAL_READY,
    ProposalStatus.APPROVED_FOR_EXTERNAL_PUBLICATION,
    SubmissionStatus.PUBLISHED_INTERNAL,
    SubmissionStatus.MARKED_EXTERNAL_READY,
    SubmissionStatus.APPROVED_FOR_EXTERNAL_PUBLICATION
  ]).has(sourceStatus);
}

function isSourceExternallyReady(sourceStatus: ProposalStatus | SubmissionStatus | null | undefined) {
  if (!sourceStatus) {
    return false;
  }

  return new Set<ProposalStatus | SubmissionStatus>([
    ProposalStatus.MARKED_EXTERNAL_READY,
    ProposalStatus.APPROVED_FOR_EXTERNAL_PUBLICATION,
    SubmissionStatus.MARKED_EXTERNAL_READY,
    SubmissionStatus.APPROVED_FOR_EXTERNAL_PUBLICATION
  ]).has(sourceStatus);
}

export function getPublicationQueueState(publication: PublicationQueueInput): PublicationQueueState {
  const qualityChecklist = [
    {
      label: "Stable slug",
      complete: publication.slug.trim().length >= 4
    },
    {
      label: "Readable abstract",
      complete: publication.abstract.trim().length >= 12
    },
    {
      label: "Citation text",
      complete: publication.citationText.trim().length >= 12
    },
    {
      label: "Context metadata",
      complete: Boolean(publication.issue || publication.team || publication.season)
    }
  ];

  const archiveReady = qualityChecklist.every((item) => item.complete);
  const sourceReady = isSourceInternallyReady(publication.sourceStatus);
  const sourceExternallyReady = isSourceExternallyReady(publication.sourceStatus);
  const warnings: string[] = [];

  if (!sourceReady) {
    warnings.push("The source record has not reached an internal publication state yet.");
  }

  if (publication.externalReady && !sourceExternallyReady) {
    warnings.push("The archive record is marked external ready before the source workflow has reached that stage.");
  }

  if (!archiveReady) {
    warnings.push("Archive quality is still missing one or more core publication fields.");
  }

  const exportTargets: ExportTargetState[] = [ExternalPublicationTarget.WEB, ExternalPublicationTarget.PDF].map(
    (target) => {
      const exportRow = publication.exports.find((entry) => entry.target === target);
      const status = exportRow?.status ?? "PLANNED";
      const guard = getExportGuard({
        sourceType: publication.sourceType,
        sourceStatus: publication.sourceStatus,
        externalReady: publication.externalReady,
        externalApproved: publication.externalApproved,
        target,
        status: status as "PLANNED" | "IN_PROGRESS" | "READY" | "GENERATED" | "PUBLISHED"
      });

      return {
        target,
        status,
        warning: guard.tone === "safe" ? null : guard.explanation,
        nextAction: guard.nextAction,
        enabled: guard.enabled
      };
    }
  );

  return {
    archiveReady,
    sourceReady,
    externalReady: publication.externalReady && sourceExternallyReady,
    warnings,
    qualityChecklist,
    nextAction:
      warnings[0] ??
      (publication.externalApproved
        ? "The record is externally approved. Keep the export targets in sync with the latest artifact links."
        : publication.externalReady
          ? "Archive quality looks strong. The next step is to finish the export targets."
          : "Finish the archive record and align the source workflow before moving toward external release."),
    exportTargets
  };
}
