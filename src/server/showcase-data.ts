import {
  AiArtifactKind,
  IssueStatus,
  ProposalStatus,
  PublicationSourceType,
  SubmissionStatus,
  StudentOutcomeKind,
  StudentOutcomeStatus,
  UserRole
} from "@prisma/client";

import { buildNewsroomFeed } from "@/lib/news";
import { prisma } from "@/lib/prisma";
import {
  buildStudentResearchProgress,
  deriveProjectResearchSignals,
  deriveProposalResearchSignals,
  deriveResearchMilestones,
  getResearchStageMeta
} from "@/lib/research-stage";
import {
  parseStudentOutcomeProof,
  projectQualifiesForEvidenceOutcome,
  proposalQualifiesForEvidenceOutcome,
  sourceHref,
  studentOutcomeKindLabels,
  studentOutcomeOrder,
  studentOutcomeStatusLabels
} from "@/lib/student-outcomes";
import {
  CURRENT_STUDENT_ONBOARDING_VERSION,
  parseStudentOnboardingProgress,
  shouldForceStudentOnboarding,
  type StudentOnboardingData
} from "@/lib/student-onboarding";
import {
  buildRecommendedMissionCandidates,
  buildRepairHref,
  hasStudentSubmittedProject
} from "@/lib/student-flow";
import type { LaneTag } from "@/lib/types";
import { buildChallengeLeaderboard, challengeIsOpen } from "@/server/challenges";
import { syncStudentOutcomesForUser, syncStudentOutcomesForUsers } from "@/server/student-outcomes";

const openProjectStatuses: SubmissionStatus[] = [
  SubmissionStatus.DRAFT,
  SubmissionStatus.SUBMITTED,
  SubmissionStatus.REVISION_REQUESTED,
  SubmissionStatus.APPROVED_FOR_INTERNAL_PUBLICATION
];

const openProposalStatuses: ProposalStatus[] = [
  ProposalStatus.DRAFT,
  ProposalStatus.SUBMITTED,
  ProposalStatus.REVISION_REQUESTED
];

const publishedProjectStatuses: SubmissionStatus[] = [
  SubmissionStatus.PUBLISHED_INTERNAL,
  SubmissionStatus.MARKED_EXTERNAL_READY,
  SubmissionStatus.APPROVED_FOR_EXTERNAL_PUBLICATION
];

const publishedProposalStatuses: ProposalStatus[] = [
  ProposalStatus.PUBLISHED_INTERNAL,
  ProposalStatus.MARKED_EXTERNAL_READY,
  ProposalStatus.APPROVED_FOR_EXTERNAL_PUBLICATION
];

function projectHref(projectId: string) {
  return `/projects/${projectId}/edit`;
}

function proposalHref(proposalId: string) {
  return `/proposals/${proposalId}/edit`;
}

function outcomeSourceKey(sourceType: PublicationSourceType, sourceId: string) {
  return `${sourceType}:${sourceId}`;
}

function daysSince(date: Date, now: Date) {
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

function buildStudentResearchSummary(input: {
  projects: Array<{
    title: string;
    summary: string;
    essentialQuestion?: string | null;
    methodsSummary?: string | null;
    findingsMd?: string | null;
    lanePrimary?: LaneTag | null;
    contentJson: unknown;
    referencesJson: unknown;
    publicationSlug?: string | null;
    submissionStatus?: SubmissionStatus | null;
  }>;
  proposals: Array<{
    title: string;
    methodsSummary?: string | null;
    issueId?: string | null;
    contentJson: unknown;
    referencesJson: unknown;
    sandboxResultJson?: unknown;
    status?: ProposalStatus | null;
  }>;
  publishedCount?: number;
  nextStep?: Partial<Record<import("@/lib/research-stage").ResearchStage, string>>;
  forceSimulationPreview?: boolean;
}) {
  return buildStudentResearchProgress({
    projectSignals: input.projects.map((project) => deriveProjectResearchSignals(project)),
    proposalSignals: input.proposals.map((proposal) => deriveProposalResearchSignals(proposal)),
    publishedCount: input.publishedCount,
    nextStep: input.nextStep,
    forceSimulationPreview: input.forceSimulationPreview
  });
}

export async function getStudentExperienceState(userId: string) {
  const [user, projects, proposals] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        gradeBand: true,
        onboardingCompletedAt: true
      }
    }),
    prisma.project.findMany({
      where: { createdByUserId: userId },
      select: {
        id: true,
        title: true,
        summary: true,
        essentialQuestion: true,
        methodsSummary: true,
        findingsMd: true,
        lanePrimary: true,
        contentJson: true,
        referencesJson: true,
        publicationSlug: true,
        submissionStatus: true,
        updatedAt: true
      },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.proposal.findMany({
      where: { createdByUserId: userId },
      select: {
        id: true,
        title: true,
        methodsSummary: true,
        issueId: true,
        contentJson: true,
        referencesJson: true,
        sandboxResultJson: true,
        status: true,
        updatedAt: true
      },
      orderBy: { updatedAt: "desc" }
    })
  ]);

  const currentProject =
    projects.find((project) =>
      openProjectStatuses.includes(project.submissionStatus)
    ) ?? null;
  const researchProgress = buildStudentResearchSummary({
    projects,
    proposals,
    forceSimulationPreview: true
  });

  return {
    gradeBand: user?.gradeBand ?? null,
    onboardingCompletedAt: user?.onboardingCompletedAt ?? null,
    hasSubmittedFirstProject: hasStudentSubmittedProject(projects),
    currentProjectId: currentProject?.id ?? null,
    currentResearchStage: researchProgress.currentResearchStage,
    nextResearchStep: researchProgress.nextResearchStep,
    researchStageProgress: researchProgress.researchStageProgress,
    simulationPreviewAvailable: researchProgress.simulationPreviewAvailable
  };
}

export async function getStudentOnboardingData(
  userId: string
): Promise<StudentOnboardingData | null> {
  const [
    user,
    allStudentProjects,
    allStudentProposals,
    activeIssues,
    newsCount,
    teamCount,
    glossaryCount,
    openChallengesCount,
    publicationCount
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        gradeBand: true,
        onboardingCompletedAt: true,
        onboardingExperienceVersion: true,
        onboardingProgressJson: true,
        linkedTeam: {
          select: {
            id: true,
            name: true
          }
        }
      }
    }),
    prisma.project.findMany({
      where: {
        createdByUserId: userId
      },
      select: {
        submissionStatus: true,
        issueId: true,
        issueLinks: {
          select: {
            issueId: true
          }
        }
      }
    }),
    prisma.proposal.findMany({
      where: {
        createdByUserId: userId
      },
      select: {
        status: true,
        issueId: true
      }
    }),
    prisma.issue.findMany({
      where: {
        status: {
          in: [IssueStatus.OPEN, IssueStatus.IN_REVIEW]
        }
      },
      include: {
        team: {
          select: {
            id: true,
            name: true
          }
        },
        proposals: {
          select: {
            id: true
          },
          orderBy: {
            createdAt: "desc"
          }
        },
        projectLinks: {
          select: {
            project: {
              select: {
                id: true
              }
            }
          }
        }
      },
      orderBy: [{ severity: "desc" }, { updatedAt: "desc" }]
    }),
    prisma.newsPost.count(),
    prisma.team.count(),
    prisma.glossaryTerm.count(),
    prisma.challenge.count({
      where: {
        startsAt: {
          lte: new Date()
        },
        endsAt: {
          gte: new Date()
        }
      }
    }),
    prisma.publication.count()
  ]);

  if (!user) {
    return null;
  }

  const claimedIssueIds = Array.from(
    new Set([
      ...allStudentProjects.flatMap((project) => [
        project.issueId ?? "",
        ...project.issueLinks.map((link) => link.issueId)
      ]),
      ...allStudentProposals.map((proposal) => proposal.issueId)
    ].filter(Boolean))
  );
  const missionCandidates = buildRecommendedMissionCandidates({
    issues: activeIssues,
    linkedTeamId: user.linkedTeam?.id ?? null,
    claimedIssueIds
  });
  const hasSubmittedFirstProject = hasStudentSubmittedProject(allStudentProjects);
  const hasOpenProjectOrProposal =
    allStudentProjects.some((project) => openProjectStatuses.includes(project.submissionStatus)) ||
    allStudentProposals.some((proposal) => openProposalStatuses.includes(proposal.status));
  const forceOnboarding = shouldForceStudentOnboarding({
    role: "STUDENT",
    onboardingExperienceVersion: user.onboardingExperienceVersion,
    hasSubmittedFirstProject,
    hasOpenProjectOrProposal
  });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email
    },
    linkedTeam: user.linkedTeam ?? null,
    gradeBand: user.gradeBand ?? null,
    onboardingCompletedAt: user.onboardingCompletedAt ?? null,
    onboardingExperienceVersion: user.onboardingExperienceVersion,
    progress: parseStudentOnboardingProgress(user.onboardingProgressJson),
    hasSubmittedFirstProject,
    hasOpenProjectOrProposal,
    isRevisit:
      !forceOnboarding &&
      Boolean(
        user.onboardingCompletedAt ||
          user.onboardingExperienceVersion >= CURRENT_STUDENT_ONBOARDING_VERSION
      ),
    missionCandidates,
    stats: {
      newsCount,
      openIssuesCount: activeIssues.length,
      openChallengesCount,
      publicationCount,
      teamCount,
      glossaryCount
    }
  };
}

export async function getNewsPageData() {
  const [editorials, autoEvents] = await Promise.all([
    prisma.newsPost.findMany({
      include: {
        author: {
          select: {
            name: true
          }
        }
      },
      orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
      take: 24
    }),
    prisma.activityEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 24
    })
  ]);

  return buildNewsroomFeed({
    editorials,
    autoEvents
  });
}

export async function getChallengesPageData(viewerId?: string | null) {
  const challenges = await prisma.challenge.findMany({
    include: {
      issue: true,
      team: true,
      entries: {
        include: {
          user: true,
          scoreEvents: {
            orderBy: { createdAt: "asc" }
          }
        },
        orderBy: { joinedAt: "asc" }
      }
    },
    orderBy: [{ endsAt: "asc" }, { startsAt: "asc" }]
  });

  return challenges.map((challenge) => {
    const leaderboard = buildChallengeLeaderboard(challenge.entries);
    return {
      ...challenge,
      isOpen: challengeIsOpen(challenge),
      leaderboard,
      viewerEntry: viewerId ? challenge.entries.find((entry) => entry.userId === viewerId) ?? null : null
    };
  });
}

export async function getChallengePageData(challengeId: string, viewerId?: string | null) {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: {
      issue: true,
      team: true,
      entries: {
        include: {
          user: true,
          scoreEvents: {
            orderBy: { createdAt: "asc" }
          }
        },
        orderBy: { joinedAt: "asc" }
      }
    }
  });

  if (!challenge) {
    return null;
  }

  const viewerEntry = viewerId
    ? challenge.entries.find((entry) => entry.userId === viewerId) ?? null
    : null;

  const [eligibleProjects, eligibleProposals] = viewerId
    ? await Promise.all([
        challenge.allowedEntryType === "PROPOSAL"
          ? Promise.resolve([])
          : prisma.project.findMany({
              where: {
                createdByUserId: viewerId
              },
              select: {
                id: true,
                title: true,
                submissionStatus: true,
                updatedAt: true
              },
              orderBy: { updatedAt: "desc" }
            }),
        challenge.allowedEntryType === "PROJECT"
          ? Promise.resolve([])
          : prisma.proposal.findMany({
              where: {
                createdByUserId: viewerId
              },
              select: {
                id: true,
                title: true,
                status: true,
                updatedAt: true
              },
              orderBy: { updatedAt: "desc" }
            })
      ])
    : [[], []];

  return {
    ...challenge,
    isOpen: challengeIsOpen(challenge),
    viewerEntry,
    leaderboard: buildChallengeLeaderboard(challenge.entries),
    eligibleProjects,
    eligibleProposals
  };
}

export async function getAdminShowcaseData() {
  const now = new Date();
  const [classCodes, newsPosts, challenges, students, activeIssues, cohorts] = await Promise.all([
    prisma.classCode.findMany({
      include: {
        commissioner: {
          select: { name: true }
        },
        linkedTeam: {
          select: { id: true, name: true }
        },
        cohort: {
          select: { id: true, name: true }
        },
        signups: {
          select: { id: true }
        }
      },
      orderBy: [{ active: "desc" }, { createdAt: "desc" }]
    }),
    prisma.newsPost.findMany({
      include: {
        author: {
          select: { name: true }
        }
      },
      orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
      take: 8
    }),
    prisma.challenge.findMany({
      include: {
        issue: true,
        team: true,
        entries: {
          include: {
            user: {
              select: { id: true, name: true }
            },
            scoreEvents: true
          }
        }
      },
      orderBy: [{ endsAt: "asc" }, { createdAt: "desc" }]
    }),
    prisma.user.findMany({
      where: {
        role: UserRole.STUDENT
      },
      select: {
        id: true,
        name: true,
        gradeBand: true,
        createdAt: true,
        onboardingCompletedAt: true,
        linkedTeam: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    }),
    prisma.issue.findMany({
      where: {
        status: {
          in: [IssueStatus.OPEN, IssueStatus.IN_REVIEW]
        }
      },
      include: {
        team: {
          select: {
            id: true,
            name: true
          }
        },
        proposals: {
          select: {
            id: true
          },
          orderBy: {
            createdAt: "desc"
          }
        },
        projectLinks: {
          select: {
            project: {
              select: {
                id: true
              }
            }
          }
        }
      },
      orderBy: [{ severity: "desc" }, { updatedAt: "desc" }]
    }),
    prisma.cohort.findMany({
      select: {
        id: true,
        name: true
      },
      orderBy: { name: "asc" }
    })
  ]);

  const studentIds = students.map((student) => student.id);

  if (studentIds.length > 0) {
    await syncStudentOutcomesForUsers({
      userIds: studentIds
    });
  }

  const [studentProjects, studentProposals] = studentIds.length
    ? await Promise.all([
        prisma.project.findMany({
          where: {
            createdByUserId: {
              in: studentIds
            }
          },
          select: {
            id: true,
            title: true,
            summary: true,
            createdByUserId: true,
            essentialQuestion: true,
            methodsSummary: true,
            findingsMd: true,
            lanePrimary: true,
            contentJson: true,
            referencesJson: true,
            publicationSlug: true,
            submissionStatus: true,
            issueId: true,
            updatedAt: true,
            revisionRequestedAt: true,
            issueLinks: {
              select: {
                issueId: true
              }
            },
            feedbackEntries: {
              select: {
                sectionKey: true,
                createdAt: true
              },
              orderBy: {
                createdAt: "desc"
              },
              take: 1
            }
          },
          orderBy: {
            updatedAt: "desc"
          }
        }),
        prisma.proposal.findMany({
          where: {
            createdByUserId: {
              in: studentIds
            }
          },
          select: {
            id: true,
            title: true,
            createdByUserId: true,
            methodsSummary: true,
            contentJson: true,
            referencesJson: true,
            sandboxResultJson: true,
            status: true,
            issueId: true,
            updatedAt: true,
            revisionRequestedAt: true,
            feedbackEntries: {
              select: {
                sectionKey: true,
                createdAt: true
              },
              orderBy: {
                createdAt: "desc"
              },
              take: 1
            }
          },
          orderBy: {
            updatedAt: "desc"
          }
        })
      ])
    : [[], []];

  const projectsByStudent = new Map<string, typeof studentProjects>();
  for (const project of studentProjects) {
    const existing = projectsByStudent.get(project.createdByUserId) ?? [];
    existing.push(project);
    projectsByStudent.set(project.createdByUserId, existing);
  }

  const proposalsByStudent = new Map<string, typeof studentProposals>();
  for (const proposal of studentProposals) {
    const existing = proposalsByStudent.get(proposal.createdByUserId) ?? [];
    existing.push(proposal);
    proposalsByStudent.set(proposal.createdByUserId, existing);
  }

  const studentOutcomes = studentIds.length
    ? await prisma.studentOutcome.findMany({
        where: {
          userId: {
            in: studentIds
          },
          kind: {
            in: [StudentOutcomeKind.EVIDENCE_DEFENDED, StudentOutcomeKind.VERIFIED_IMPACT]
          }
        },
        include: {
          user: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: [{ submittedAt: "asc" }, { createdAt: "desc" }]
      })
    : [];

  const projectSourceMap = new Map(
    studentProjects.map((project) => [
      outcomeSourceKey(PublicationSourceType.PROJECT, project.id),
      {
        title: project.title,
        href: projectHref(project.id)
      }
    ])
  );
  const proposalSourceMap = new Map(
    studentProposals.map((proposal) => [
      outcomeSourceKey(PublicationSourceType.PROPOSAL, proposal.id),
      {
        title: proposal.title,
        href: proposalHref(proposal.id)
      }
    ])
  );
  const sourceMap = new Map([...projectSourceMap, ...proposalSourceMap]);
  const verifiedImpactKeys = new Set(
    studentOutcomes
      .filter(
        (outcome) =>
          outcome.kind === StudentOutcomeKind.VERIFIED_IMPACT &&
          outcome.status === StudentOutcomeStatus.VERIFIED
      )
      .map((outcome) => outcomeSourceKey(outcome.sourceType, outcome.sourceId))
  );
  const pendingEvidenceOutcomes = studentOutcomes
    .filter(
      (outcome) =>
        outcome.kind === StudentOutcomeKind.EVIDENCE_DEFENDED &&
        outcome.status === StudentOutcomeStatus.PENDING_VERIFICATION
    )
    .map((outcome) => {
      const proof = parseStudentOutcomeProof(outcome.proofJson);
      const source = sourceMap.get(outcomeSourceKey(outcome.sourceType, outcome.sourceId));

      return {
        id: outcome.id,
        sourceType: outcome.sourceType,
        sourceId: outcome.sourceId,
        sourceTitle: source?.title ?? "Untitled source",
        sourceHref: source?.href ?? sourceHref(outcome.sourceType, outcome.sourceId),
        studentName: outcome.user.name,
        submittedAt: outcome.submittedAt,
        reviewNote: outcome.reviewNote,
        artifactSummary: proof.artifactSummary,
        evidenceSummary: proof.evidenceSummary,
        studentReflection: proof.studentReflection,
        evidenceCount: proof.evidenceCount
      };
    });
  const impactCandidates = studentOutcomes
    .filter(
      (outcome) =>
        outcome.kind === StudentOutcomeKind.EVIDENCE_DEFENDED &&
        outcome.status === StudentOutcomeStatus.VERIFIED &&
        !verifiedImpactKeys.has(outcomeSourceKey(outcome.sourceType, outcome.sourceId))
    )
    .map((outcome) => {
      const source = sourceMap.get(outcomeSourceKey(outcome.sourceType, outcome.sourceId));
      const proof = parseStudentOutcomeProof(outcome.proofJson);

      return {
        id: outcome.id,
        sourceType: outcome.sourceType,
        sourceId: outcome.sourceId,
        sourceTitle: source?.title ?? "Untitled source",
        sourceHref: source?.href ?? sourceHref(outcome.sourceType, outcome.sourceId),
        studentName: outcome.user.name,
        artifactSummary: proof.artifactSummary,
        evidenceSummary: proof.evidenceSummary,
        verifiedAt: outcome.verifiedAt
      };
    });

  const studentMomentum = {
    neverStarted: [] as Array<{
      studentId: string;
      studentName: string;
      linkedTeamName: string | null;
      reason: string;
      daysWaiting: number;
      interventionLabel: string;
      interventionHref: string;
      interventionBody: string;
      researchStageLabel: string;
      nextResearchStep: string;
    }>,
    stalledDrafts: [] as Array<{
      studentId: string;
      studentName: string;
      linkedTeamName: string | null;
      reason: string;
      daysWaiting: number;
      interventionLabel: string;
      interventionHref: string;
      interventionBody: string;
      researchStageLabel: string;
      nextResearchStep: string;
    }>,
    revisionWaiting: [] as Array<{
      studentId: string;
      studentName: string;
      linkedTeamName: string | null;
      reason: string;
      daysWaiting: number;
      interventionLabel: string;
      interventionHref: string;
      interventionBody: string;
      researchStageLabel: string;
      nextResearchStep: string;
    }>
  };

  for (const student of students) {
    const projects = projectsByStudent.get(student.id) ?? [];
    const proposals = proposalsByStudent.get(student.id) ?? [];
    const researchProgress = buildStudentResearchSummary({
      projects,
      proposals,
      forceSimulationPreview: true
    });
    const researchStageLabel = getResearchStageMeta(researchProgress.currentResearchStage).label;
    const claimedIssueIds = Array.from(
      new Set([
        ...projects.flatMap((project) => [
          project.issueId ?? "",
          ...project.issueLinks.map((link) => link.issueId)
        ]),
        ...proposals.map((proposal) => proposal.issueId)
      ].filter(Boolean))
    );
    const recommendedMission =
      buildRecommendedMissionCandidates({
        issues: activeIssues,
        linkedTeamId: student.linkedTeam?.id ?? null,
        claimedIssueIds
      })[0] ?? null;

    if (student.onboardingCompletedAt && projects.length === 0) {
      studentMomentum.neverStarted.push({
        studentId: student.id,
        studentName: student.name,
        linkedTeamName: student.linkedTeam?.name ?? null,
        reason: "Onboarding is complete, but the first project draft has not been started yet.",
        daysWaiting: daysSince(student.onboardingCompletedAt, now),
        interventionLabel: "Open recommended mission",
        interventionHref: recommendedMission?.adminHref ?? "/issues",
        interventionBody: recommendedMission
          ? recommendedMission.issue.title
          : "Browse live issues and pick a low-friction starting point.",
        researchStageLabel,
        nextResearchStep: researchProgress.nextResearchStep.detail
      });
    }

    const latestDraft = [
      ...projects
        .filter((project) => project.submissionStatus === SubmissionStatus.DRAFT)
        .map((project) => ({
          updatedAt: project.updatedAt,
          href: projectHref(project.id),
          label: project.title,
          kind: "project" as const
        })),
      ...proposals
        .filter((proposal) => proposal.status === ProposalStatus.DRAFT)
        .map((proposal) => ({
          updatedAt: proposal.updatedAt,
          href: proposalHref(proposal.id),
          label: proposal.title,
          kind: "proposal" as const
        }))
    ].sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())[0];

    if (latestDraft && daysSince(latestDraft.updatedAt, now) >= 7) {
      studentMomentum.stalledDrafts.push({
        studentId: student.id,
        studentName: student.name,
        linkedTeamName: student.linkedTeam?.name ?? null,
        reason: `The latest ${latestDraft.kind} draft has not been updated in at least 7 days.`,
        daysWaiting: daysSince(latestDraft.updatedAt, now),
        interventionLabel: "Open latest draft",
        interventionHref: latestDraft.href,
        interventionBody: latestDraft.label,
        researchStageLabel,
        nextResearchStep: researchProgress.nextResearchStep.detail
      });
    }

    const revisionCandidates = [
      ...projects
        .filter((project) => project.submissionStatus === SubmissionStatus.REVISION_REQUESTED)
        .map((project) => {
          const lastFeedback = project.feedbackEntries[0] ?? null;
          const revisionAnchor = lastFeedback?.createdAt ?? project.revisionRequestedAt ?? project.updatedAt;
          const stale = project.updatedAt.getTime() <= revisionAnchor.getTime();

          return {
            stale,
            daysWaiting: daysSince(revisionAnchor, now),
            href: buildRepairHref({
              kind: "project",
              id: project.id,
              sectionKey: lastFeedback?.sectionKey ?? "analysis"
            }),
            label: project.title,
            reason: `Revision was requested and the student has not updated this project since the latest feedback.`,
            anchor: revisionAnchor
          };
        }),
      ...proposals
        .filter((proposal) => proposal.status === ProposalStatus.REVISION_REQUESTED)
        .map((proposal) => {
          const lastFeedback = proposal.feedbackEntries[0] ?? null;
          const revisionAnchor = lastFeedback?.createdAt ?? proposal.revisionRequestedAt ?? proposal.updatedAt;
          const stale = proposal.updatedAt.getTime() <= revisionAnchor.getTime();

          return {
            stale,
            daysWaiting: daysSince(revisionAnchor, now),
            href: buildRepairHref({
              kind: "proposal",
              id: proposal.id,
              sectionKey: lastFeedback?.sectionKey ?? "problem"
            }),
            label: proposal.title,
            reason: `Revision was requested and the student has not updated this proposal since the latest feedback.`,
            anchor: revisionAnchor
          };
        })
    ]
      .filter((candidate) => candidate.stale && candidate.daysWaiting >= 5)
      .sort((left, right) => right.anchor.getTime() - left.anchor.getTime());

    if (revisionCandidates[0]) {
      studentMomentum.revisionWaiting.push({
        studentId: student.id,
        studentName: student.name,
        linkedTeamName: student.linkedTeam?.name ?? null,
        reason: revisionCandidates[0].reason,
        daysWaiting: revisionCandidates[0].daysWaiting,
        interventionLabel: "Open latest feedback target",
        interventionHref: revisionCandidates[0].href,
        interventionBody: revisionCandidates[0].label,
        researchStageLabel,
        nextResearchStep: researchProgress.nextResearchStep.detail
      });
    }
  }

  studentMomentum.neverStarted.sort((left, right) => right.daysWaiting - left.daysWaiting);
  studentMomentum.stalledDrafts.sort((left, right) => right.daysWaiting - left.daysWaiting);
  studentMomentum.revisionWaiting.sort((left, right) => right.daysWaiting - left.daysWaiting);
  const totalFlaggedStudents = new Set([
    ...studentMomentum.neverStarted.map((entry) => entry.studentId),
    ...studentMomentum.stalledDrafts.map((entry) => entry.studentId),
    ...studentMomentum.revisionWaiting.map((entry) => entry.studentId)
  ]).size;

  return {
    classCodes,
    cohorts,
    newsPosts,
    challenges: challenges.map((challenge) => ({
      ...challenge,
      isOpen: challengeIsOpen(challenge),
      leaderboard: buildChallengeLeaderboard(challenge.entries)
    })),
    studentMomentum: {
      ...studentMomentum,
      totalFlagged: totalFlaggedStudents
    },
    studentOutcomeQueue: {
      pendingEvidenceOutcomes,
      impactCandidates,
      totalPending: pendingEvidenceOutcomes.length,
      totalImpactCandidates: impactCandidates.length
    }
  };
}

export async function getStudentMissionControlData(userId: string) {
  const [
    user,
    openProjects,
    openProposals,
    projectFeedback,
    proposalFeedback,
    votingProposals,
    challengeEntries,
    activeIssues,
    allStudentProjects,
    allStudentProposals
  ] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: {
          linkedTeam: {
            select: { id: true, name: true }
          }
        }
      }),
      prisma.project.findMany({
        where: {
          createdByUserId: userId,
          submissionStatus: { in: openProjectStatuses }
        },
        include: {
          primaryIssue: {
            select: { id: true, title: true }
          }
        },
        orderBy: { updatedAt: "desc" }
      }),
      prisma.proposal.findMany({
        where: {
          createdByUserId: userId,
          status: { in: openProposalStatuses }
        },
        include: {
          issue: {
            select: { id: true, title: true }
          }
        },
        orderBy: { updatedAt: "desc" }
      }),
      prisma.projectFeedback.findMany({
        where: {
          project: {
            createdByUserId: userId
          }
        },
        include: {
          project: {
            select: {
              id: true,
              title: true,
              updatedAt: true
            }
          },
          createdBy: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 6
      }),
      prisma.proposalFeedback.findMany({
        where: {
          proposal: {
            createdByUserId: userId
          }
        },
        include: {
          proposal: {
            select: {
              id: true,
              title: true,
              updatedAt: true
            }
          },
          createdBy: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 6
      }),
      prisma.proposal.findMany({
        where: {
          status: ProposalStatus.VOTING,
          voteEnd: {
            gte: new Date()
          },
          createdByUserId: {
            not: userId
          }
        },
        include: {
          issue: {
            select: { title: true }
          },
          votes: {
            where: {
              userId
            },
            select: {
              id: true
            }
          }
        },
        orderBy: { voteEnd: "asc" },
        take: 4
      }),
      prisma.challengeEntry.findMany({
        where: { userId },
        include: {
          challenge: {
            include: {
              issue: {
                select: { title: true }
              },
              team: {
                select: { name: true }
              }
            }
          },
          scoreEvents: {
            orderBy: { createdAt: "asc" }
          }
        },
        orderBy: { joinedAt: "desc" },
        take: 6
      }),
      prisma.issue.findMany({
        where: {
          status: {
            in: [IssueStatus.OPEN, IssueStatus.IN_REVIEW]
          }
        },
        include: {
          team: {
            select: {
              id: true,
              name: true
            }
          },
          proposals: {
            select: {
              id: true
            },
            orderBy: {
              createdAt: "desc"
            }
          },
          projectLinks: {
            select: {
              project: {
                select: {
                  id: true
                }
              }
            }
          }
        },
        orderBy: [{ severity: "desc" }, { updatedAt: "desc" }]
      }),
      prisma.project.findMany({
        where: {
          createdByUserId: userId
        },
        select: {
          id: true,
          title: true,
          summary: true,
          essentialQuestion: true,
          methodsSummary: true,
          findingsMd: true,
          lanePrimary: true,
          contentJson: true,
          referencesJson: true,
          publicationSlug: true,
          submissionStatus: true,
          issueId: true,
          issueLinks: {
            select: {
              issueId: true
            }
          }
        }
      }),
      prisma.proposal.findMany({
        where: {
          createdByUserId: userId
        },
        select: {
          id: true,
          title: true,
          methodsSummary: true,
          issueId: true
          ,
          contentJson: true,
          referencesJson: true,
          sandboxResultJson: true,
          status: true
        }
      })
    ]);

  const feedbackItems = [
    ...projectFeedback.map((entry) => ({
      id: `project-${entry.id}`,
      kind: "project" as const,
      title: entry.project.title,
      sectionKey: entry.sectionKey,
      body: entry.body,
      createdAt: entry.createdAt,
      createdBy: entry.createdBy.name,
      href: buildRepairHref({
        kind: "project",
        id: entry.project.id,
        sectionKey: entry.sectionKey
      }),
      sourceUpdatedAt: entry.project.updatedAt
    })),
    ...proposalFeedback.map((entry) => ({
      id: `proposal-${entry.id}`,
      kind: "proposal" as const,
      title: entry.proposal.title,
      sectionKey: entry.sectionKey,
      body: entry.body,
      createdAt: entry.createdAt,
      createdBy: entry.createdBy.name,
      href: buildRepairHref({
        kind: "proposal",
        id: entry.proposal.id,
        sectionKey: entry.sectionKey
      }),
      sourceUpdatedAt: entry.proposal.updatedAt
    }))
  ]
    .filter((entry) => entry.sourceUpdatedAt.getTime() <= entry.createdAt.getTime())
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    .slice(0, 6)
    .map(({ sourceUpdatedAt: _sourceUpdatedAt, ...entry }) => entry);

  const claimedIssueIds = Array.from(
    new Set([
      ...allStudentProjects.flatMap((project) => [
        project.issueId ?? "",
        ...project.issueLinks.map((link) => link.issueId)
      ]),
      ...allStudentProposals.map((proposal) => proposal.issueId)
    ].filter(Boolean))
  );
  const missionCandidates = buildRecommendedMissionCandidates({
    issues: activeIssues,
    linkedTeamId: user?.linkedTeam?.id ?? null,
    claimedIssueIds
  });
  const recommendedMission = missionCandidates[0] ?? null;
  const submittedFirstProject = hasStudentSubmittedProject(allStudentProjects);
  const researchProgress = buildStudentResearchSummary({
    projects: allStudentProjects,
    proposals: allStudentProposals,
    nextStep: recommendedMission
      ? {
          ASK_QUESTION: `Start with ${recommendedMission.issue.title}, then write the cleanest question you want to answer.`
        }
      : undefined,
    forceSimulationPreview: true
  });

  const recentWork = [
    ...openProjects.map((project) => ({
      id: project.id,
      kind: "project" as const,
      title: project.title,
      updatedAt: project.updatedAt,
      href: projectHref(project.id),
      reason: project.submissionStatus === "REVISION_REQUESTED" ? "Your teacher asked for another revision pass." : "This is your most recent open project."
    })),
    ...openProposals.map((proposal) => ({
      id: proposal.id,
      kind: "proposal" as const,
      title: proposal.title,
      updatedAt: proposal.updatedAt,
      href: proposalHref(proposal.id),
      reason: proposal.status === "REVISION_REQUESTED" ? "This memo is waiting on revisions." : "This is your most recent open proposal."
    }))
  ].sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());

  const feedbackResume = feedbackItems[0];
  const recommendedAction = feedbackResume
    ? {
        title: `Respond to feedback on ${feedbackResume.title}`,
        body: `${feedbackResume.createdBy} left feedback on ${feedbackResume.sectionKey}. Open that draft and tighten the next weak section.`,
        href: feedbackResume.href,
        ctaLabel: "Open and revise"
      }
    : recentWork[0]
      ? {
          title: `Resume ${recentWork[0].title}`,
          body: recentWork[0].reason,
          href: recentWork[0].href,
          ctaLabel: "Resume draft"
        }
      : recommendedMission
        ? {
            title: `Start ${recommendedMission.issue.title}`,
            body: recommendedMission.reason,
            href: recommendedMission.starterHref,
            ctaLabel: "Start this project"
          }
      : {
          title: "Start your next piece of work",
          body: "You are clear to begin a new project or draft a proposal connected to a live issue.",
          href: "/start",
          ctaLabel: "Pick a mission"
        };

  const sourceIds = [
    ...openProjects.map((project) => project.id),
    ...openProposals.map((proposal) => proposal.id)
  ];

  const spotlightPosts = sourceIds.length
    ? await prisma.newsPost.findMany({
        where: {
          linkedEntityId: {
            in: sourceIds
          }
        },
        include: {
          author: {
            select: { name: true }
          }
        },
        orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
        take: 3
      })
    : [];

  return {
    user,
    recommendedAction,
    recommendedMission,
    missionCandidates,
    currentResearchStage: researchProgress.currentResearchStage,
    nextResearchStep: researchProgress.nextResearchStep,
    researchStageProgress: researchProgress.researchStageProgress,
    simulationPreviewAvailable: researchProgress.simulationPreviewAvailable,
    submittedFirstProject,
    openProjects,
    openProposals,
    feedbackItems,
    votingProposals: votingProposals.filter((proposal) => proposal.votes.length === 0),
    challengeEntries: challengeEntries.map((entry) => ({
      ...entry,
      totalScore: entry.scoreEvents.reduce((total, event) => total + event.points, 0)
    })),
    spotlightPosts
  };
}

export async function getStudentPortfolioData(userId: string) {
  await syncStudentOutcomesForUser({
    userId
  });

  const [user, projects, proposals, challengeEntries, studentOutcomes] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      include: {
        linkedTeam: {
          select: { id: true, name: true }
        },
        commissioner: {
          select: { id: true, name: true }
        }
      }
    }),
    prisma.project.findMany({
      where: {
        createdByUserId: userId
      },
      include: {
        primaryIssue: {
          select: { id: true, title: true }
        },
        revisions: {
          orderBy: { createdAt: "desc" }
        },
        feedbackEntries: {
          orderBy: { createdAt: "desc" }
        },
        aiArtifacts: {
          where: {
            kind: AiArtifactKind.NARRATIVE
          },
          orderBy: {
            createdAt: "desc"
          }
        }
      },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.proposal.findMany({
      where: {
        createdByUserId: userId
      },
      include: {
        issue: {
          select: { id: true, title: true }
        },
        revisions: {
          orderBy: { createdAt: "desc" }
        },
        feedbackEntries: {
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.challengeEntry.findMany({
      where: { userId },
      include: {
        challenge: true,
        scoreEvents: {
          orderBy: { createdAt: "asc" }
        }
      },
      orderBy: { joinedAt: "desc" }
    }),
    prisma.studentOutcome.findMany({
      where: { userId },
      orderBy: [{ verifiedAt: "desc" }, { updatedAt: "desc" }]
    })
  ]);

  const sourceIds = [
    ...projects.map((project) => project.id),
    ...proposals.map((proposal) => proposal.id)
  ];

  const [publications, spotlightPosts] = sourceIds.length
    ? await Promise.all([
        prisma.publication.findMany({
          where: {
            sourceId: {
              in: sourceIds
            }
          },
          orderBy: { publishedAt: "desc" }
        }),
        prisma.newsPost.findMany({
          where: {
            linkedEntityId: {
              in: sourceIds
            }
          },
          include: {
            author: {
              select: { name: true }
            }
          },
          orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }]
        })
      ])
    : [[], []];

  const sourceTitleMap = new Map<string, string>();
  for (const project of projects) {
    sourceTitleMap.set(outcomeSourceKey(PublicationSourceType.PROJECT, project.id), project.title);
  }
  for (const proposal of proposals) {
    sourceTitleMap.set(outcomeSourceKey(PublicationSourceType.PROPOSAL, proposal.id), proposal.title);
  }

  const sourcePublicationMap = new Map<
    string,
    (typeof publications)[number]
  >();
  for (const publication of publications) {
    sourcePublicationMap.set(outcomeSourceKey(publication.sourceType, publication.sourceId), publication);
  }
  const outcomesBySource = new Map<string, typeof studentOutcomes>();
  for (const outcome of studentOutcomes) {
    const key = outcomeSourceKey(outcome.sourceType, outcome.sourceId);
    const existing = outcomesBySource.get(key) ?? [];
    existing.push(outcome);
    outcomesBySource.set(key, existing);
  }
  const projectResearchSignals = projects.map((project) => ({
    project,
    signals: deriveProjectResearchSignals(project)
  }));
  const proposalResearchSignals = proposals.map((proposal) => ({
    proposal,
    signals: deriveProposalResearchSignals(proposal)
  }));
  const researchProgress = buildStudentResearchSummary({
    projects,
    proposals,
    publishedCount: publications.length,
    forceSimulationPreview: true
  });
  const researchMilestones = deriveResearchMilestones({
    questionSources: [
      ...projectResearchSignals
        .filter((entry) => entry.signals.ASK_QUESTION)
        .map((entry) => ({ label: entry.project.title, createdAt: entry.project.updatedAt })),
      ...proposalResearchSignals
        .filter((entry) => entry.signals.ASK_QUESTION)
        .map((entry) => ({ label: entry.proposal.title, createdAt: entry.proposal.updatedAt }))
    ],
    evidenceSources: [
      ...projectResearchSignals
        .filter((entry) => entry.signals.FIND_EVIDENCE)
        .map((entry) => ({ label: entry.project.title, createdAt: entry.project.updatedAt })),
      ...proposalResearchSignals
        .filter((entry) => entry.signals.FIND_EVIDENCE)
        .map((entry) => ({ label: entry.proposal.title, createdAt: entry.proposal.updatedAt }))
    ],
    modelSources: [
      ...projectResearchSignals
        .filter((entry) => entry.signals.TEST_SYSTEM)
        .map((entry) => ({ label: entry.project.title, createdAt: entry.project.updatedAt })),
      ...proposalResearchSignals
        .filter((entry) => entry.signals.TEST_SYSTEM)
        .map((entry) => ({ label: entry.proposal.title, createdAt: entry.proposal.updatedAt }))
    ],
    argumentSources: [
      ...projectResearchSignals
        .filter((entry) => entry.signals.MAKE_CASE)
        .map((entry) => ({ label: entry.project.title, createdAt: entry.project.updatedAt })),
      ...proposalResearchSignals
        .filter((entry) => entry.signals.MAKE_CASE)
        .map((entry) => ({ label: entry.proposal.title, createdAt: entry.proposal.updatedAt }))
    ],
    publicationSources: publications.map((publication) => ({
      label: publication.title,
      createdAt: publication.publishedAt
    }))
  });

  const outcomes = [
    ...projects.map((project) => {
      const key = outcomeSourceKey(PublicationSourceType.PROJECT, project.id);
      const sourceOutcomes = outcomesBySource.get(key) ?? [];
      const byKind = new Map(sourceOutcomes.map((outcome) => [outcome.kind, outcome]));
      const evidenceOutcome = byKind.get(StudentOutcomeKind.EVIDENCE_DEFENDED) ?? null;

      return {
        sourceType: PublicationSourceType.PROJECT,
        sourceId: project.id,
        title: project.title,
        href: projectHref(project.id),
        issueTitle: project.primaryIssue?.title ?? null,
        updatedAt: project.updatedAt,
        publication: sourcePublicationMap.get(key)
          ? {
              slug: sourcePublicationMap.get(key)!.slug,
              title: sourcePublicationMap.get(key)!.title
            }
          : null,
        evidenceEligible: projectQualifiesForEvidenceOutcome(project),
        canSubmitEvidenceProof:
          projectQualifiesForEvidenceOutcome(project) &&
          evidenceOutcome?.status !== StudentOutcomeStatus.PENDING_VERIFICATION &&
          evidenceOutcome?.status !== StudentOutcomeStatus.VERIFIED,
        outcomeStates: studentOutcomeOrder.map((kind) => {
          const outcome = byKind.get(kind);
          return {
            id: outcome?.id ?? `${project.id}-${kind}`,
            kind,
            label: studentOutcomeKindLabels[kind],
            status: outcome?.status ?? null,
            statusLabel: outcome ? studentOutcomeStatusLabels[outcome.status] : "Not earned yet",
            proof: parseStudentOutcomeProof(outcome?.proofJson),
            reviewNote: outcome?.reviewNote ?? null,
            submittedAt: outcome?.submittedAt ?? null,
            verifiedAt: outcome?.verifiedAt ?? null
          };
        })
      };
    }),
    ...proposals.map((proposal) => {
      const key = outcomeSourceKey(PublicationSourceType.PROPOSAL, proposal.id);
      const sourceOutcomes = outcomesBySource.get(key) ?? [];
      const byKind = new Map(sourceOutcomes.map((outcome) => [outcome.kind, outcome]));
      const evidenceOutcome = byKind.get(StudentOutcomeKind.EVIDENCE_DEFENDED) ?? null;

      return {
        sourceType: PublicationSourceType.PROPOSAL,
        sourceId: proposal.id,
        title: proposal.title,
        href: proposalHref(proposal.id),
        issueTitle: proposal.issue.title,
        updatedAt: proposal.updatedAt,
        publication: sourcePublicationMap.get(key)
          ? {
              slug: sourcePublicationMap.get(key)!.slug,
              title: sourcePublicationMap.get(key)!.title
            }
          : null,
        evidenceEligible: proposalQualifiesForEvidenceOutcome(proposal),
        canSubmitEvidenceProof:
          proposalQualifiesForEvidenceOutcome(proposal) &&
          evidenceOutcome?.status !== StudentOutcomeStatus.PENDING_VERIFICATION &&
          evidenceOutcome?.status !== StudentOutcomeStatus.VERIFIED,
        outcomeStates: studentOutcomeOrder.map((kind) => {
          const outcome = byKind.get(kind);
          return {
            id: outcome?.id ?? `${proposal.id}-${kind}`,
            kind,
            label: studentOutcomeKindLabels[kind],
            status: outcome?.status ?? null,
            statusLabel: outcome ? studentOutcomeStatusLabels[outcome.status] : "Not earned yet",
            proof: parseStudentOutcomeProof(outcome?.proofJson),
            reviewNote: outcome?.reviewNote ?? null,
            submittedAt: outcome?.submittedAt ?? null,
            verifiedAt: outcome?.verifiedAt ?? null
          };
        })
      };
    })
  ]
    .filter((entry) => entry.outcomeStates.some((state) => state.status !== null))
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());

  const outcomeStats = {
    realArtifacts: studentOutcomes.filter(
      (outcome) =>
        outcome.kind === StudentOutcomeKind.ARTIFACT_COMPLETED &&
        outcome.status === StudentOutcomeStatus.VERIFIED
    ).length,
    evidenceBacked: studentOutcomes.filter(
      (outcome) =>
        outcome.kind === StudentOutcomeKind.EVIDENCE_DEFENDED &&
        outcome.status === StudentOutcomeStatus.VERIFIED
    ).length,
    verifiedImpact: studentOutcomes.filter(
      (outcome) =>
        outcome.kind === StudentOutcomeKind.VERIFIED_IMPACT &&
        outcome.status === StudentOutcomeStatus.VERIFIED
    ).length,
    publishedCount: publications.length
  };
  const pendingVerificationCount = studentOutcomes.filter(
    (outcome) =>
      outcome.kind === StudentOutcomeKind.EVIDENCE_DEFENDED &&
      outcome.status === StudentOutcomeStatus.PENDING_VERIFICATION
  ).length;

  const growthTimeline = [
    ...studentOutcomes
      .filter((outcome) => outcome.status !== StudentOutcomeStatus.DRAFT)
      .map((outcome) => ({
        id: outcome.id,
        label: `${studentOutcomeKindLabels[outcome.kind]}: ${sourceTitleMap.get(outcomeSourceKey(outcome.sourceType, outcome.sourceId)) ?? "Untitled source"}`,
        createdAt: outcome.verifiedAt ?? outcome.submittedAt ?? outcome.updatedAt
      })),
    ...projects.flatMap((project) =>
      project.revisions.map((revision) => ({
        id: revision.id,
        label: `Saved a new project revision for ${project.title}`,
        createdAt: revision.createdAt
      }))
    ),
    ...proposals.flatMap((proposal) =>
      proposal.revisions.map((revision) => ({
        id: revision.id,
        label: `Saved a new memo revision for ${proposal.title}`,
        createdAt: revision.createdAt
      }))
    ),
    ...publications.map((publication) => ({
      id: publication.id,
      label: `Published ${publication.title} to the research archive`,
      createdAt: publication.publishedAt
    })),
    ...challengeEntries.flatMap((entry) =>
      entry.scoreEvents.map((event) => ({
        id: event.id,
        label: `${entry.challenge.title}: ${event.kind.replaceAll("_", " ").toLowerCase()}`,
        createdAt: event.createdAt
      }))
    )
  ]
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    .slice(0, 18);

  const narratives = projects
    .flatMap((project) =>
      project.aiArtifacts.map((artifact) => ({
        id: artifact.id,
        projectId: project.id,
        projectTitle: project.title,
        milestoneKey: artifact.milestoneKey,
        paragraph: artifact.bodyMd,
        createdAt: artifact.updatedAt
      }))
    )
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

  return {
    user,
    projects,
    proposals,
    currentResearchStage: researchProgress.currentResearchStage,
    nextResearchStep: researchProgress.nextResearchStep,
    researchStageProgress: researchProgress.researchStageProgress,
    simulationPreviewAvailable: researchProgress.simulationPreviewAvailable,
    researchMilestones,
    publications,
    spotlightPosts,
    challengeEntries: challengeEntries.map((entry) => ({
      ...entry,
      totalScore: entry.scoreEvents.reduce((total, event) => total + event.points, 0)
    })),
    narratives,
    growthTimeline,
    outcomes,
    outcomeStats,
    pendingVerificationCount,
    publishedProjects: projects.filter((project) => publishedProjectStatuses.includes(project.submissionStatus)),
    publishedProposals: proposals.filter((proposal) => publishedProposalStatuses.includes(proposal.status))
  };
}
