import {
  Prisma,
  PublicationSourceType,
  StudentOutcomeKind,
  StudentOutcomeStatus
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  buildProjectOutcomeProof,
  buildProposalOutcomeProof,
  parseStudentOutcomeProof,
  projectQualifiesForArtifactOutcome,
  projectQualifiesForEvidenceOutcome,
  proposalQualifiesForArtifactOutcome,
  proposalQualifiesForEvidenceOutcome
} from "@/lib/student-outcomes";
import { createActivityEvent } from "@/server/workflows";

type DatabaseClient = Prisma.TransactionClient | typeof prisma;

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function mergeProof(
  derived: ReturnType<typeof parseStudentOutcomeProof>,
  existingValue: unknown,
  overrides?: Partial<ReturnType<typeof parseStudentOutcomeProof>>
) {
  const existing = parseStudentOutcomeProof(existingValue);

  return {
    artifactSummary: overrides?.artifactSummary ?? (existing.artifactSummary || derived.artifactSummary),
    artifactLink: overrides?.artifactLink ?? existing.artifactLink ?? derived.artifactLink,
    evidenceCount: overrides?.evidenceCount ?? derived.evidenceCount,
    evidenceSummary: overrides?.evidenceSummary ?? (existing.evidenceSummary || derived.evidenceSummary),
    studentReflection:
      overrides?.studentReflection ?? (existing.studentReflection || derived.studentReflection),
    verificationMode: overrides?.verificationMode ?? derived.verificationMode,
    supportingPublicationId:
      overrides?.supportingPublicationId ?? derived.supportingPublicationId ?? existing.supportingPublicationId
  };
}

async function findSourcePublicationId(
  db: DatabaseClient,
  sourceType: PublicationSourceType,
  sourceId: string
) {
  const publication = await db.publication.findUnique({
    where: {
      sourceType_sourceId: {
        sourceType,
        sourceId
      }
    },
    select: {
      id: true
    }
  });

  return publication?.id ?? null;
}

async function syncProjectOutcomeRecords(db: DatabaseClient, projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      createdByUserId: true,
      title: true,
      summary: true,
      abstract: true,
      essentialQuestion: true,
      methodsSummary: true,
      findingsMd: true,
      lanePrimary: true,
      issueId: true,
      teamId: true,
      supportingProposalId: true,
      contentJson: true,
      referencesJson: true,
      artifactLinksJson: true
    }
  });

  if (!project) {
    return;
  }

  const publicationId = await findSourcePublicationId(db, PublicationSourceType.PROJECT, project.id);
  const artifactQualified = projectQualifiesForArtifactOutcome(project);
  const evidenceQualified = projectQualifiesForEvidenceOutcome(project);
  const artifactProof = buildProjectOutcomeProof(project, "AUTO_GATE");
  const evidenceProof = buildProjectOutcomeProof(project, "AUTO_GATE");
  const impactProof = buildProjectOutcomeProof(project, publicationId ? "PUBLICATION" : "ADMIN_SIGNOFF", publicationId);
  const existing = await db.studentOutcome.findMany({
    where: {
      sourceType: PublicationSourceType.PROJECT,
      sourceId: project.id
    }
  });
  const byKind = new Map(existing.map((outcome) => [outcome.kind, outcome]));

  if (artifactQualified) {
    const current = byKind.get(StudentOutcomeKind.ARTIFACT_COMPLETED);
    await db.studentOutcome.upsert({
      where: {
        sourceType_sourceId_kind: {
          sourceType: PublicationSourceType.PROJECT,
          sourceId: project.id,
          kind: StudentOutcomeKind.ARTIFACT_COMPLETED
        }
      },
      update: {
        status: StudentOutcomeStatus.VERIFIED,
        studentSummary: artifactProof.artifactSummary,
        proofJson: asJson(mergeProof(artifactProof, current?.proofJson, { verificationMode: "AUTO_GATE" })),
        submittedAt: current?.submittedAt ?? new Date(),
        verifiedAt: current?.verifiedAt ?? new Date()
      },
      create: {
        userId: project.createdByUserId,
        sourceType: PublicationSourceType.PROJECT,
        sourceId: project.id,
        kind: StudentOutcomeKind.ARTIFACT_COMPLETED,
        status: StudentOutcomeStatus.VERIFIED,
        studentSummary: artifactProof.artifactSummary,
        proofJson: asJson(artifactProof),
        submittedAt: new Date(),
        verifiedAt: new Date()
      }
    });
  }

  if (evidenceQualified || byKind.has(StudentOutcomeKind.EVIDENCE_DEFENDED)) {
    const current = byKind.get(StudentOutcomeKind.EVIDENCE_DEFENDED);
    const nextStatus =
      current?.status === StudentOutcomeStatus.PENDING_VERIFICATION ||
      current?.status === StudentOutcomeStatus.VERIFIED ||
      current?.status === StudentOutcomeStatus.REJECTED
        ? current.status
        : StudentOutcomeStatus.DRAFT;

    if (current) {
      await db.studentOutcome.update({
        where: { id: current.id },
        data: {
          status: nextStatus,
          proofJson: asJson(mergeProof(evidenceProof, current.proofJson)),
          studentSummary: current.studentSummary ?? evidenceProof.artifactSummary
        }
      });
    } else if (evidenceQualified) {
      await db.studentOutcome.create({
        data: {
          userId: project.createdByUserId,
          sourceType: PublicationSourceType.PROJECT,
          sourceId: project.id,
          kind: StudentOutcomeKind.EVIDENCE_DEFENDED,
          status: StudentOutcomeStatus.DRAFT,
          studentSummary: evidenceProof.artifactSummary,
          proofJson: asJson(evidenceProof)
        }
      });
    }
  }

  if (publicationId || byKind.get(StudentOutcomeKind.VERIFIED_IMPACT)?.status === StudentOutcomeStatus.VERIFIED) {
    const current = byKind.get(StudentOutcomeKind.VERIFIED_IMPACT);

    if (current) {
      await db.studentOutcome.update({
        where: { id: current.id },
        data: {
          status: StudentOutcomeStatus.VERIFIED,
          studentSummary: current.studentSummary ?? impactProof.artifactSummary,
          proofJson: asJson(
            mergeProof(impactProof, current.proofJson, {
              verificationMode: publicationId ? "PUBLICATION" : "ADMIN_SIGNOFF",
              supportingPublicationId: publicationId ?? parseStudentOutcomeProof(current.proofJson).supportingPublicationId
            })
          ),
          verifiedAt: current.verifiedAt ?? new Date()
        }
      });
    } else if (publicationId) {
      await db.studentOutcome.create({
        data: {
          userId: project.createdByUserId,
          sourceType: PublicationSourceType.PROJECT,
          sourceId: project.id,
          kind: StudentOutcomeKind.VERIFIED_IMPACT,
          status: StudentOutcomeStatus.VERIFIED,
          studentSummary: impactProof.artifactSummary,
          proofJson: asJson(impactProof),
          submittedAt: new Date(),
          verifiedAt: new Date()
        }
      });
    }
  }
}

async function syncProposalOutcomeRecords(db: DatabaseClient, proposalId: string) {
  const proposal = await db.proposal.findUnique({
    where: { id: proposalId },
    select: {
      id: true,
      createdByUserId: true,
      title: true,
      abstract: true,
      methodsSummary: true,
      issueId: true,
      contentJson: true,
      referencesJson: true
    }
  });

  if (!proposal) {
    return;
  }

  const publicationId = await findSourcePublicationId(db, PublicationSourceType.PROPOSAL, proposal.id);
  const artifactQualified = proposalQualifiesForArtifactOutcome(proposal);
  const evidenceQualified = proposalQualifiesForEvidenceOutcome(proposal);
  const artifactProof = buildProposalOutcomeProof(proposal, "AUTO_GATE");
  const evidenceProof = buildProposalOutcomeProof(proposal, "AUTO_GATE");
  const impactProof = buildProposalOutcomeProof(proposal, publicationId ? "PUBLICATION" : "ADMIN_SIGNOFF", publicationId);
  const existing = await db.studentOutcome.findMany({
    where: {
      sourceType: PublicationSourceType.PROPOSAL,
      sourceId: proposal.id
    }
  });
  const byKind = new Map(existing.map((outcome) => [outcome.kind, outcome]));

  if (artifactQualified) {
    const current = byKind.get(StudentOutcomeKind.ARTIFACT_COMPLETED);
    await db.studentOutcome.upsert({
      where: {
        sourceType_sourceId_kind: {
          sourceType: PublicationSourceType.PROPOSAL,
          sourceId: proposal.id,
          kind: StudentOutcomeKind.ARTIFACT_COMPLETED
        }
      },
      update: {
        status: StudentOutcomeStatus.VERIFIED,
        studentSummary: artifactProof.artifactSummary,
        proofJson: asJson(mergeProof(artifactProof, current?.proofJson, { verificationMode: "AUTO_GATE" })),
        submittedAt: current?.submittedAt ?? new Date(),
        verifiedAt: current?.verifiedAt ?? new Date()
      },
      create: {
        userId: proposal.createdByUserId,
        sourceType: PublicationSourceType.PROPOSAL,
        sourceId: proposal.id,
        kind: StudentOutcomeKind.ARTIFACT_COMPLETED,
        status: StudentOutcomeStatus.VERIFIED,
        studentSummary: artifactProof.artifactSummary,
        proofJson: asJson(artifactProof),
        submittedAt: new Date(),
        verifiedAt: new Date()
      }
    });
  }

  if (evidenceQualified || byKind.has(StudentOutcomeKind.EVIDENCE_DEFENDED)) {
    const current = byKind.get(StudentOutcomeKind.EVIDENCE_DEFENDED);
    const nextStatus =
      current?.status === StudentOutcomeStatus.PENDING_VERIFICATION ||
      current?.status === StudentOutcomeStatus.VERIFIED ||
      current?.status === StudentOutcomeStatus.REJECTED
        ? current.status
        : StudentOutcomeStatus.DRAFT;

    if (current) {
      await db.studentOutcome.update({
        where: { id: current.id },
        data: {
          status: nextStatus,
          proofJson: asJson(mergeProof(evidenceProof, current.proofJson)),
          studentSummary: current.studentSummary ?? evidenceProof.artifactSummary
        }
      });
    } else if (evidenceQualified) {
      await db.studentOutcome.create({
        data: {
          userId: proposal.createdByUserId,
          sourceType: PublicationSourceType.PROPOSAL,
          sourceId: proposal.id,
          kind: StudentOutcomeKind.EVIDENCE_DEFENDED,
          status: StudentOutcomeStatus.DRAFT,
          studentSummary: evidenceProof.artifactSummary,
          proofJson: asJson(evidenceProof)
        }
      });
    }
  }

  if (publicationId || byKind.get(StudentOutcomeKind.VERIFIED_IMPACT)?.status === StudentOutcomeStatus.VERIFIED) {
    const current = byKind.get(StudentOutcomeKind.VERIFIED_IMPACT);

    if (current) {
      await db.studentOutcome.update({
        where: { id: current.id },
        data: {
          status: StudentOutcomeStatus.VERIFIED,
          studentSummary: current.studentSummary ?? impactProof.artifactSummary,
          proofJson: asJson(
            mergeProof(impactProof, current.proofJson, {
              verificationMode: publicationId ? "PUBLICATION" : "ADMIN_SIGNOFF",
              supportingPublicationId: publicationId ?? parseStudentOutcomeProof(current.proofJson).supportingPublicationId
            })
          ),
          verifiedAt: current.verifiedAt ?? new Date()
        }
      });
    } else if (publicationId) {
      await db.studentOutcome.create({
        data: {
          userId: proposal.createdByUserId,
          sourceType: PublicationSourceType.PROPOSAL,
          sourceId: proposal.id,
          kind: StudentOutcomeKind.VERIFIED_IMPACT,
          status: StudentOutcomeStatus.VERIFIED,
          studentSummary: impactProof.artifactSummary,
          proofJson: asJson(impactProof),
          submittedAt: new Date(),
          verifiedAt: new Date()
        }
      });
    }
  }
}

async function getSourceOwner(db: DatabaseClient, sourceType: PublicationSourceType, sourceId: string) {
  if (sourceType === PublicationSourceType.PROJECT) {
    const project = await db.project.findUnique({
      where: { id: sourceId },
      select: {
        id: true,
        title: true,
        createdByUserId: true,
        summary: true,
        abstract: true,
        essentialQuestion: true,
        methodsSummary: true,
        findingsMd: true,
        lanePrimary: true,
        issueId: true,
        teamId: true,
        supportingProposalId: true,
        contentJson: true,
        referencesJson: true,
        artifactLinksJson: true
      }
    });

    return project ? { sourceType, sourceId, userId: project.createdByUserId, source: project } : null;
  }

  const proposal = await db.proposal.findUnique({
    where: { id: sourceId },
    select: {
      id: true,
      title: true,
      createdByUserId: true,
      abstract: true,
      methodsSummary: true,
      issueId: true,
      contentJson: true,
      referencesJson: true
    }
  });

  return proposal ? { sourceType, sourceId, userId: proposal.createdByUserId, source: proposal } : null;
}

export async function syncProjectStudentOutcomes(params: {
  projectId: string;
  db?: DatabaseClient;
}) {
  const db = params.db ?? prisma;
  await syncProjectOutcomeRecords(db, params.projectId);
}

export async function syncProposalStudentOutcomes(params: {
  proposalId: string;
  db?: DatabaseClient;
}) {
  const db = params.db ?? prisma;
  await syncProposalOutcomeRecords(db, params.proposalId);
}

export async function syncStudentOutcomesForSource(params: {
  sourceType: PublicationSourceType;
  sourceId: string;
  db?: DatabaseClient;
}) {
  const db = params.db ?? prisma;

  if (params.sourceType === PublicationSourceType.PROJECT) {
    await syncProjectOutcomeRecords(db, params.sourceId);
    return;
  }

  await syncProposalOutcomeRecords(db, params.sourceId);
}

export async function syncStudentOutcomesForUser(params: {
  userId: string;
  db?: DatabaseClient;
}) {
  const db = params.db ?? prisma;
  const [projects, proposals] = await Promise.all([
    db.project.findMany({
      where: { createdByUserId: params.userId },
      select: { id: true }
    }),
    db.proposal.findMany({
      where: { createdByUserId: params.userId },
      select: { id: true }
    })
  ]);

  for (const project of projects) {
    await syncProjectOutcomeRecords(db, project.id);
  }

  for (const proposal of proposals) {
    await syncProposalOutcomeRecords(db, proposal.id);
  }
}

export async function syncStudentOutcomesForUsers(params: {
  userIds: string[];
  db?: DatabaseClient;
}) {
  const db = params.db ?? prisma;

  for (const userId of params.userIds) {
    await syncStudentOutcomesForUser({
      userId,
      db
    });
  }
}

export async function submitEvidenceOutcomeProof(params: {
  userId: string;
  sourceType: PublicationSourceType;
  sourceId: string;
  artifactSummary: string;
  evidenceSummary: string;
  studentReflection: string;
  db?: DatabaseClient;
}) {
  const db = params.db ?? prisma;

  await syncStudentOutcomesForSource({
    sourceType: params.sourceType,
    sourceId: params.sourceId,
    db
  });

  const source = await getSourceOwner(db, params.sourceType, params.sourceId);

  if (!source || source.userId !== params.userId) {
    throw new Error("You can only submit proof for your own work.");
  }

  const artifactSummary = params.artifactSummary.trim();
  const evidenceSummary = params.evidenceSummary.trim();
  const studentReflection = params.studentReflection.trim();

  if (artifactSummary.length < 12 || evidenceSummary.length < 16 || studentReflection.length < 16) {
    throw new Error("Outcome proof needs a real artifact summary, evidence summary, and reflection.");
  }

  const baseProof =
    source.sourceType === PublicationSourceType.PROJECT
      ? buildProjectOutcomeProof(source.source, "STUDENT_SUBMITTED")
      : buildProposalOutcomeProof(source.source, "STUDENT_SUBMITTED");
  const evidenceQualified =
    source.sourceType === PublicationSourceType.PROJECT
      ? projectQualifiesForEvidenceOutcome(source.source)
      : proposalQualifiesForEvidenceOutcome(source.source);

  if (!evidenceQualified) {
    throw new Error("This work needs stronger evidence before it can be submitted for verification.");
  }

  await db.studentOutcome.upsert({
    where: {
      sourceType_sourceId_kind: {
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        kind: StudentOutcomeKind.EVIDENCE_DEFENDED
      }
    },
    update: {
      status: StudentOutcomeStatus.PENDING_VERIFICATION,
      studentSummary: artifactSummary,
      proofJson: asJson(
        mergeProof(baseProof, undefined, {
          artifactSummary,
          evidenceSummary,
          studentReflection,
          verificationMode: "STUDENT_SUBMITTED"
        })
      ),
      submittedAt: new Date(),
      reviewNote: null,
      verifiedAt: null,
      verifiedByUserId: null
    },
    create: {
      userId: params.userId,
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      kind: StudentOutcomeKind.EVIDENCE_DEFENDED,
      status: StudentOutcomeStatus.PENDING_VERIFICATION,
      studentSummary: artifactSummary,
      proofJson: asJson({
        ...baseProof,
        artifactSummary,
        evidenceSummary,
        studentReflection,
        verificationMode: "STUDENT_SUBMITTED"
      }),
      submittedAt: new Date()
    }
  });
}

export async function reviewEvidenceOutcome(params: {
  outcomeId: string;
  reviewerId: string;
  approve: boolean;
  reviewNote?: string | null;
  db?: DatabaseClient;
}) {
  const db = params.db ?? prisma;
  const outcome = await db.studentOutcome.findUnique({
    where: { id: params.outcomeId }
  });

  if (!outcome || outcome.kind !== StudentOutcomeKind.EVIDENCE_DEFENDED) {
    throw new Error("Outcome not found.");
  }

  await syncStudentOutcomesForSource({
    sourceType: outcome.sourceType,
    sourceId: outcome.sourceId,
    db
  });

  const source = await getSourceOwner(db, outcome.sourceType, outcome.sourceId);

  if (!source) {
    throw new Error("Outcome source not found.");
  }

  const evidenceQualified =
    source.sourceType === PublicationSourceType.PROJECT
      ? projectQualifiesForEvidenceOutcome(source.source)
      : proposalQualifiesForEvidenceOutcome(source.source);

  if (!evidenceQualified) {
    throw new Error("The source no longer meets the evidence gate.");
  }

  const proof = parseStudentOutcomeProof(outcome.proofJson);
  const reviewNote = params.reviewNote?.trim() || null;
  const sourceTitle = source.source.title;

  await db.studentOutcome.update({
    where: { id: outcome.id },
    data: params.approve
      ? {
          status: StudentOutcomeStatus.VERIFIED,
          proofJson: asJson(
            mergeProof(proof, outcome.proofJson, {
              verificationMode: "ADMIN_SIGNOFF"
            })
          ),
          verifiedAt: new Date(),
          verifiedByUserId: params.reviewerId,
          reviewNote
        }
      : {
          status: StudentOutcomeStatus.REJECTED,
          reviewNote: reviewNote ?? "Add clearer proof before this can count as verified evidence.",
          verifiedAt: null,
          verifiedByUserId: null
        }
  });

  await createActivityEvent(db, {
    type: "student-outcome",
    title: params.approve ? "Evidence outcome verified" : "Evidence outcome returned for revision",
    summary: params.approve
      ? `An evidence-backed outcome was verified for ${sourceTitle}.`
      : `An evidence-backed outcome for ${sourceTitle} was returned for more proof.`,
    entityType: outcome.sourceType === PublicationSourceType.PROJECT ? "Project" : "Proposal",
    entityId: outcome.sourceId,
    createdByUserId: params.reviewerId,
    metadata: {
      outcomeId: outcome.id,
      decision: params.approve ? "VERIFY" : "REJECT"
    }
  });
}

export async function createManualVerifiedImpact(params: {
  sourceType: PublicationSourceType;
  sourceId: string;
  reviewerId: string;
  reviewNote: string;
  db?: DatabaseClient;
}) {
  const db = params.db ?? prisma;
  const source = await getSourceOwner(db, params.sourceType, params.sourceId);

  if (!source) {
    throw new Error("Outcome source not found.");
  }

  const reviewNote = params.reviewNote.trim();

  if (reviewNote.length < 12) {
    throw new Error("Add a short note explaining the verified impact.");
  }

  const publicationId = await findSourcePublicationId(db, params.sourceType, params.sourceId);
  const baseProof =
    source.sourceType === PublicationSourceType.PROJECT
      ? buildProjectOutcomeProof(source.source, publicationId ? "PUBLICATION" : "ADMIN_SIGNOFF", publicationId)
      : buildProposalOutcomeProof(source.source, publicationId ? "PUBLICATION" : "ADMIN_SIGNOFF", publicationId);
  const existing = await db.studentOutcome.findUnique({
    where: {
      sourceType_sourceId_kind: {
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        kind: StudentOutcomeKind.VERIFIED_IMPACT
      }
    }
  });

  await db.studentOutcome.upsert({
    where: {
      sourceType_sourceId_kind: {
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        kind: StudentOutcomeKind.VERIFIED_IMPACT
      }
    },
    update: {
      status: StudentOutcomeStatus.VERIFIED,
      studentSummary: reviewNote,
      proofJson: asJson(
        mergeProof(baseProof, existing?.proofJson, {
          evidenceSummary: reviewNote,
          verificationMode: publicationId ? "PUBLICATION" : "ADMIN_SIGNOFF",
          supportingPublicationId: publicationId
        })
      ),
      submittedAt: existing?.submittedAt ?? new Date(),
      verifiedAt: new Date(),
      verifiedByUserId: params.reviewerId,
      reviewNote
    },
    create: {
      userId: source.userId,
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      kind: StudentOutcomeKind.VERIFIED_IMPACT,
      status: StudentOutcomeStatus.VERIFIED,
      studentSummary: reviewNote,
      proofJson: asJson({
        ...baseProof,
        evidenceSummary: reviewNote
      }),
      submittedAt: new Date(),
      verifiedAt: new Date(),
      verifiedByUserId: params.reviewerId,
      reviewNote
    }
  });

  await createActivityEvent(db, {
    type: "student-outcome",
    title: "Verified impact recorded",
    summary: `A verified impact note was recorded for ${source.source.title}.`,
    entityType: params.sourceType === PublicationSourceType.PROJECT ? "Project" : "Proposal",
    entityId: params.sourceId,
    createdByUserId: params.reviewerId,
    metadata: {
      sourceType: params.sourceType,
      sourceId: params.sourceId
    }
  });
}
