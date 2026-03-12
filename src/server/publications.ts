import {
  Prisma,
  ProposalStatus,
  PublicationSourceType,
  SubmissionStatus
} from "@prisma/client";

import {
  buildProjectPublicationMetadata,
  buildProposalPublicationMetadata,
  createPublicationSlug,
  isInternallyPublishedProject,
  isInternallyPublishedProposal,
  parseKeywords,
  parseProjectContent,
  parseProposalContent,
  parseReferences
} from "@/lib/publications";
import { prisma } from "@/lib/prisma";
import type { LaneTag } from "@/lib/types";

type DatabaseClient = Prisma.TransactionClient | typeof prisma;

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

async function getSeasonLabel(db: DatabaseClient) {
  const currentSeason = await db.season.findFirst({
    orderBy: { year: "desc" }
  });

  return currentSeason ? `Season ${currentSeason.year}` : null;
}

function currentPublicationFlags(status: string) {
  return {
    externalReady:
      status === SubmissionStatus.MARKED_EXTERNAL_READY ||
      status === SubmissionStatus.APPROVED_FOR_EXTERNAL_PUBLICATION ||
      status === ProposalStatus.MARKED_EXTERNAL_READY ||
      status === ProposalStatus.APPROVED_FOR_EXTERNAL_PUBLICATION,
    externalApproved:
      status === SubmissionStatus.APPROVED_FOR_EXTERNAL_PUBLICATION ||
      status === ProposalStatus.APPROVED_FOR_EXTERNAL_PUBLICATION
  };
}

async function upsertExportPlaceholders(db: DatabaseClient, publicationId: string, externalReady: boolean) {
  if (!externalReady) {
    await db.publicationExport.deleteMany({
      where: { publicationId }
    });
    return;
  }

  await db.publicationExport.upsert({
    where: {
      publicationId_target: {
        publicationId,
        target: "WEB"
      }
    },
    update: {
      status: "PLANNED"
    },
    create: {
      publicationId,
      target: "WEB",
      status: "PLANNED"
    }
  });

  await db.publicationExport.upsert({
    where: {
      publicationId_target: {
        publicationId,
        target: "PDF"
      }
    },
    update: {
      status: "PLANNED"
    },
    create: {
      publicationId,
      target: "PDF",
      status: "PLANNED"
    }
  });
}

export async function snapshotProjectRevision(params: {
  projectId: string;
  actorUserId: string;
  db?: DatabaseClient;
}) {
  const db = params.db ?? prisma;
  const project = await db.project.findUnique({
    where: { id: params.projectId },
    include: {
      issueLinks: true,
      collaborators: true,
      milestones: {
        orderBy: { targetDate: "asc" }
      },
      deliverables: {
        orderBy: { key: "asc" }
      }
    }
  });

  if (!project) {
    return;
  }

  await db.projectRevision.create({
    data: {
      projectId: project.id,
      createdByUserId: params.actorUserId,
      snapshotJson: asJson({
        title: project.title,
        summary: project.summary,
        submissionStatus: project.submissionStatus,
        contentJson: project.contentJson,
        abstract: project.abstract,
        essentialQuestion: project.essentialQuestion,
        methodsSummary: project.methodsSummary,
        keyTakeawaysJson: project.keyTakeawaysJson,
        referencesJson: project.referencesJson,
        keywordsJson: project.keywordsJson,
        lanePrimary: project.lanePrimary,
        laneTagsJson: project.laneTagsJson,
        artifactLinksJson: project.artifactLinksJson,
        findingsMd: project.findingsMd,
        issueIds: project.issueLinks.map((link) => link.issueId),
        collaboratorIds: project.collaborators.map((collaborator) => collaborator.userId),
        milestones: project.milestones.map((milestone) => ({
          key: milestone.key,
          title: milestone.title,
          status: milestone.status,
          targetDate: milestone.targetDate,
          completedAt: milestone.completedAt,
          completionNote: milestone.completionNote
        })),
        deliverables: project.deliverables.map((deliverable) => ({
          key: deliverable.key,
          title: deliverable.title,
          required: deliverable.required,
          complete: deliverable.complete,
          contentMd: deliverable.contentMd,
          artifactUrl: deliverable.artifactUrl,
          completedAt: deliverable.completedAt,
          metadataJson: deliverable.metadataJson
        }))
      })
    }
  });
}

export async function snapshotProposalRevision(params: {
  proposalId: string;
  actorUserId: string;
  db?: DatabaseClient;
}) {
  const db = params.db ?? prisma;
  const proposal = await db.proposal.findUnique({
    where: { id: params.proposalId }
  });

  if (!proposal) {
    return;
  }

  await db.proposalRevision.create({
    data: {
      proposalId: proposal.id,
      createdByUserId: params.actorUserId,
      snapshotJson: asJson({
        title: proposal.title,
        status: proposal.status,
        contentJson: proposal.contentJson,
        narrativeJson: proposal.narrativeJson,
        diffJson: proposal.diffJson,
        sandboxResultJson: proposal.sandboxResultJson,
        abstract: proposal.abstract,
        methodsSummary: proposal.methodsSummary,
        keyTakeawaysJson: proposal.keyTakeawaysJson,
        referencesJson: proposal.referencesJson,
        keywordsJson: proposal.keywordsJson,
        publicationSummary: proposal.publicationSummary,
        publicationSlug: proposal.publicationSlug,
        publicationVersion: proposal.publicationVersion
      })
    }
  });
}

export async function syncProjectPublication(params: {
  projectId: string;
  actorUserId: string;
  db?: DatabaseClient;
}) {
  const db = params.db ?? prisma;
  const project = await db.project.findUnique({
    where: { id: params.projectId },
    include: {
      createdBy: true,
      team: true,
      primaryIssue: true,
      issueLinks: {
        include: {
          issue: true
        }
      },
      collaborators: {
        include: {
          user: true
        }
      }
    }
  });

  if (!project) {
    return null;
  }

  if (!isInternallyPublishedProject(project.submissionStatus)) {
    await db.publication.deleteMany({
      where: {
        sourceType: PublicationSourceType.PROJECT,
        sourceId: project.id
      }
    });
    return null;
  }

  const lanePrimary = (project.lanePrimary ?? "ECONOMIC_INVESTIGATORS") as LaneTag;
  const content = parseProjectContent(project.contentJson, lanePrimary);
  const references = parseReferences(project.referencesJson);
  const keywords = parseKeywords(project.keywordsJson);
  const authorNames = [
    project.createdBy.name,
    ...project.collaborators.map((collaborator) => collaborator.user.name)
  ];
  const publishedAt = project.publishedInternalAt ?? project.approvedForInternalPublicationAt ?? new Date();
  const flags = currentPublicationFlags(project.submissionStatus);
  const seasonLabel = await getSeasonLabel(db);
  const metadata = buildProjectPublicationMetadata({
    title: project.title,
    abstract: project.abstract ?? project.summary,
    keywords,
    issueTitle: project.primaryIssue?.title ?? project.issueLinks[0]?.issue.title ?? null,
    teamName: project.team?.name ?? null,
    seasonLabel,
    authorNames,
    publicationType: project.publicationType,
    version: project.publicationVersion,
    publishedAt,
    externalReady: flags.externalReady,
    externalApproved: flags.externalApproved
  });
  const publication = await db.publication.upsert({
    where: {
      sourceType_sourceId: {
        sourceType: PublicationSourceType.PROJECT,
        sourceId: project.id
      }
    },
    update: {
      slug: project.publicationSlug ?? createPublicationSlug(project.title, project.id),
      title: project.title,
      publicationType: project.publicationType,
      lanePrimary,
      abstract: project.abstract ?? project.summary,
      summary: project.publicationSummary ?? (content.overview || project.summary),
      keywordsJson: asJson(keywords),
      citationText: metadata.citationText,
      authorLine: metadata.authorLine,
      publishedAt,
      publishedByUserId: params.actorUserId,
      issueId: project.primaryIssue?.id ?? project.issueLinks[0]?.issue.id ?? null,
      teamId: project.team?.id ?? null,
      externalReady: flags.externalReady,
      externalApproved: flags.externalApproved,
      externalTargetsJson: flags.externalReady ? asJson(["WEB", "PDF"]) : Prisma.JsonNull,
      canonicalVersion: project.publicationVersion,
      metadataJson: asJson(metadata)
    },
    create: {
      slug: project.publicationSlug ?? createPublicationSlug(project.title, project.id),
      title: project.title,
      publicationType: project.publicationType,
      sourceType: PublicationSourceType.PROJECT,
      sourceId: project.id,
      lanePrimary,
      abstract: project.abstract ?? project.summary,
      summary: project.publicationSummary ?? (content.overview || project.summary),
      keywordsJson: asJson(keywords),
      citationText: metadata.citationText,
      authorLine: metadata.authorLine,
      publishedAt,
      publishedByUserId: params.actorUserId,
      issueId: project.primaryIssue?.id ?? project.issueLinks[0]?.issue.id ?? null,
      teamId: project.team?.id ?? null,
      externalReady: flags.externalReady,
      externalApproved: flags.externalApproved,
      externalTargetsJson: flags.externalReady ? asJson(["WEB", "PDF"]) : Prisma.JsonNull,
      canonicalVersion: project.publicationVersion,
      metadataJson: asJson(metadata)
    }
  });

  await upsertExportPlaceholders(db, publication.id, flags.externalReady);
  return publication;
}

export async function syncProposalPublication(params: {
  proposalId: string;
  actorUserId: string;
  db?: DatabaseClient;
}) {
  const db = params.db ?? prisma;
  const proposal = await db.proposal.findUnique({
    where: { id: params.proposalId },
    include: {
      createdBy: true,
      issue: {
        include: {
          team: true
        }
      }
    }
  });

  if (!proposal) {
    return null;
  }

  const shouldExistAsPublication =
    isInternallyPublishedProposal(proposal.status) ||
    Boolean(proposal.approvedForInternalPublicationAt) ||
    Boolean(proposal.publishedInternalAt);

  if (!shouldExistAsPublication) {
    await db.publication.deleteMany({
      where: {
        sourceType: PublicationSourceType.PROPOSAL,
        sourceId: proposal.id
      }
    });
    return null;
  }

  const content = parseProposalContent(proposal.contentJson);
  const references = parseReferences(proposal.referencesJson);
  const keywords = parseKeywords(proposal.keywordsJson);
  const publishedAt = proposal.publishedInternalAt ?? proposal.approvedForInternalPublicationAt ?? new Date();
  const flags = currentPublicationFlags(proposal.status);
  const seasonLabel = await getSeasonLabel(db);
  const metadata = buildProposalPublicationMetadata({
    title: proposal.title,
    abstract: proposal.abstract ?? content.problem,
    keywords,
    issueTitle: proposal.issue.title,
    teamName: proposal.issue.team?.name ?? null,
    seasonLabel,
    authorNames: [proposal.createdBy.name],
    version: proposal.publicationVersion,
    publishedAt,
    externalReady: flags.externalReady,
    externalApproved: flags.externalApproved
  });
  const publication = await db.publication.upsert({
    where: {
      sourceType_sourceId: {
        sourceType: PublicationSourceType.PROPOSAL,
        sourceId: proposal.id
      }
    },
    update: {
      slug: proposal.publicationSlug ?? createPublicationSlug(proposal.title, proposal.id),
      title: proposal.title,
      publicationType: proposal.publicationType,
      abstract: proposal.abstract ?? content.problem,
      summary: proposal.publicationSummary ?? (content.recommendation || content.problem),
      keywordsJson: asJson(keywords),
      citationText: metadata.citationText,
      authorLine: metadata.authorLine,
      publishedAt,
      publishedByUserId: params.actorUserId,
      issueId: proposal.issue.id,
      teamId: proposal.issue.team?.id ?? null,
      externalReady: flags.externalReady,
      externalApproved: flags.externalApproved,
      externalTargetsJson: flags.externalReady ? asJson(["WEB", "PDF"]) : Prisma.JsonNull,
      canonicalVersion: proposal.publicationVersion,
      metadataJson: asJson(metadata)
    },
    create: {
      slug: proposal.publicationSlug ?? createPublicationSlug(proposal.title, proposal.id),
      title: proposal.title,
      publicationType: proposal.publicationType,
      sourceType: PublicationSourceType.PROPOSAL,
      sourceId: proposal.id,
      abstract: proposal.abstract ?? content.problem,
      summary: proposal.publicationSummary ?? (content.recommendation || content.problem),
      keywordsJson: asJson(keywords),
      citationText: metadata.citationText,
      authorLine: metadata.authorLine,
      publishedAt,
      publishedByUserId: params.actorUserId,
      issueId: proposal.issue.id,
      teamId: proposal.issue.team?.id ?? null,
      externalReady: flags.externalReady,
      externalApproved: flags.externalApproved,
      externalTargetsJson: flags.externalReady ? asJson(["WEB", "PDF"]) : Prisma.JsonNull,
      canonicalVersion: proposal.publicationVersion,
      metadataJson: asJson(metadata)
    }
  });

  await upsertExportPlaceholders(db, publication.id, flags.externalReady);
  return publication;
}
