import { IssueStatus, Prisma, ProjectType, ProposalStatus, PublicationSourceType, SubmissionStatus } from "@prisma/client";

import {
  getPrimaryLaneTag,
  parseChecklist,
  parseKeywords,
  parseProjectContent,
  parseProposalContent,
  parseReferences,
  parseTakeaways
} from "@/lib/publications";
import { prisma } from "@/lib/prisma";
import type {
  ArtifactLink,
  IssueMetrics,
  LaneTag,
  LeagueRulesV1,
  ProposalNarrative,
  RuleDiff,
  SandboxImpactReport
} from "@/lib/types";
import { parseRules } from "@/lib/rules";
import { calculateLeagueMetrics } from "@/lib/sim";
import { canVoteOnProposal } from "@/server/workflows";

function jsonValue<T>(value: Prisma.JsonValue | null | undefined) {
  return (value ?? null) as T;
}

export async function getCurrentSeason() {
  return prisma.season.findFirst({
    orderBy: { year: "desc" },
    include: {
      activeRuleSet: true
    }
  });
}

export async function getDashboardData() {
  const currentSeason = await getCurrentSeason();
  const latestTeamSeasons = currentSeason
    ? await prisma.teamSeason.findMany({
        where: { seasonId: currentSeason.id },
        include: { team: true },
        orderBy: { revenue: "desc" }
      })
    : [];

  const metrics = calculateLeagueMetrics(
    latestTeamSeasons.map((teamSeason) => ({
      teamId: teamSeason.teamId,
      teamName: teamSeason.team.name,
      payroll: teamSeason.payroll,
      taxPaid: teamSeason.taxPaid,
      revenue: teamSeason.revenue,
      valuation: teamSeason.valuation,
      performanceProxy: teamSeason.performanceProxy,
      marketSizeTier: teamSeason.team.marketSizeTier,
      rawRevenue: teamSeason.revenue,
      revenueSharingContribution: 0,
      ownerDisciplineScore: teamSeason.team.ownerDisciplineScore
    }))
  );
  const activity = await prisma.activityEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 6
  });

  return {
    currentSeason,
    metrics,
    activity,
    latestTeamSeasons
  };
}

export async function getTeamsPageData() {
  const currentSeason = await getCurrentSeason();

  if (!currentSeason) {
    return {
      currentSeason: null,
      teams: []
    };
  }

  const teamSeasons = await prisma.teamSeason.findMany({
    where: { seasonId: currentSeason.id },
    include: { team: true },
    orderBy: {
      team: {
        name: "asc"
      }
    }
  });

  return {
    currentSeason,
    teams: teamSeasons
  };
}

export async function getTeamPageData(teamId: string) {
  const currentSeason = await getCurrentSeason();
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      contracts: true
    }
  });

  if (!team) {
    return null;
  }

  const teamSeason = currentSeason
    ? await prisma.teamSeason.findUnique({
        where: {
          teamId_seasonId: {
            teamId: team.id,
            seasonId: currentSeason.id
          }
        }
      })
    : null;

  const strategyProjects = await prisma.project.findMany({
    where: {
      teamId: team.id,
      projectType: ProjectType.STRATEGY
    },
    include: {
      createdBy: true,
      issueLinks: {
        include: {
          issue: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const relatedProjects = await prisma.project.findMany({
    where: {
      teamId: team.id
    },
    include: {
      primaryIssue: true,
      issueLinks: {
        include: {
          issue: true
        }
      }
    }
  });

  const issueMap = new Map<string, { id: string; title: string; severity: number; status: IssueStatus }>();
  for (const project of relatedProjects) {
    if (project.primaryIssue) {
      issueMap.set(project.primaryIssue.id, {
        id: project.primaryIssue.id,
        title: project.primaryIssue.title,
        severity: project.primaryIssue.severity,
        status: project.primaryIssue.status
      });
    }

    for (const link of project.issueLinks) {
      issueMap.set(link.issue.id, {
        id: link.issue.id,
        title: link.issue.title,
        severity: link.issue.severity,
        status: link.issue.status
      });
    }
  }

  const directIssues = await prisma.issue.findMany({
    where: {
      teamId: team.id
    }
  });

  for (const issue of directIssues) {
    issueMap.set(issue.id, {
      id: issue.id,
      title: issue.title,
      severity: issue.severity,
      status: issue.status
    });
  }

  return {
    currentSeason,
    team,
    teamSeason,
    strategyProjects,
    linkedIssues: Array.from(issueMap.values())
  };
}

export async function getRuleSetsData() {
  const records = await prisma.ruleSet.findMany({
    orderBy: { version: "desc" }
  });

  return records.map((record) => ({
    ...record,
    title: record.isActive
      ? `RuleSet v${record.version}`
      : record.effectiveSeasonYear
        ? `Pending RuleSet v${record.version}`
        : `Archived RuleSet v${record.version}`,
    summary: record.isActive
      ? "This ruleset is currently governing the active season."
      : record.effectiveSeasonYear
        ? `This ruleset is waiting to activate in season ${record.effectiveSeasonYear}.`
        : "This ruleset is preserved for historical comparison.",
    rules: parseRules(jsonValue<LeagueRulesV1>(record.rulesJson)),
    changeSummary: jsonValue<Array<{ label: string; previous: string; next: string }>>(
      record.changeSummaryJson
    )
  }));
}

export async function getIssuesPageData() {
  return prisma.issue.findMany({
    include: {
      team: true,
      proposals: true,
      projectLinks: {
        include: {
          project: true
        }
      }
    },
    orderBy: [{ severity: "desc" }, { createdAt: "desc" }]
  });
}

export async function getIssuePageData(issueId: string) {
  return prisma.issue.findUnique({
    where: { id: issueId },
    include: {
      team: true,
      projectLinks: {
        include: {
          project: {
            include: {
              createdBy: true
            }
          }
        }
      },
      proposals: {
        include: {
          createdBy: true,
          decision: true
        },
        orderBy: { createdAt: "desc" }
      }
    }
  });
}

export async function getProjectsPageData() {
  const [projectRecords, issueRecords, teamRecords, userRecords, proposalRecords, publicationRecords] =
    await Promise.all([
    prisma.project.findMany({
      include: {
        createdBy: true,
        team: true,
        issueLinks: {
          include: {
            issue: true
          }
        },
        collaborators: {
          include: {
            user: true
          }
        },
        comments: true
      },
      orderBy: [{ submissionStatus: "asc" }, { updatedAt: "desc" }]
    }),
    prisma.issue.findMany({ orderBy: [{ severity: "desc" }, { title: "asc" }] }),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
    prisma.proposal.findMany({
      include: {
        issue: true
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.publication.findMany({
      orderBy: { publishedAt: "desc" },
      take: 6
    })
  ]);

  return {
    projects: projectRecords,
    issues: issueRecords,
    teams: teamRecords,
    users: userRecords,
    proposals: proposalRecords,
    recentPublications: publicationRecords
  };
}

export async function getProjectPageData(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      createdBy: true,
      team: true,
      primaryIssue: true,
      supportingProposal: true,
      issueLinks: {
        include: {
          issue: true
        }
      },
      collaborators: {
        include: {
          user: true
        }
      },
      comments: {
        include: {
          user: true
        },
        orderBy: { createdAt: "asc" }
      },
      feedbackEntries: {
        include: {
          createdBy: true
        },
        orderBy: { createdAt: "desc" }
      },
      revisions: {
        include: {
          createdBy: true
        },
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!project) {
    return null;
  }

  const publication = await prisma.publication.findUnique({
    where: {
      sourceType_sourceId: {
        sourceType: PublicationSourceType.PROJECT,
        sourceId: project.id
      }
    }
  });

  return {
    ...project,
    publication
  };
}

export async function getProposalsPageData() {
  return prisma.proposal.findMany({
    include: {
      issue: true,
      createdBy: true,
      targetRuleSet: true,
      votes: true,
      decision: true
    },
    orderBy: [{ updatedAt: "desc" }]
  });
}

export async function getProposalCreateData() {
  const [issues, ruleSets] = await Promise.all([
    prisma.issue.findMany({
      where: { status: { in: [IssueStatus.OPEN, IssueStatus.IN_REVIEW] } },
      orderBy: [{ severity: "desc" }, { title: "asc" }]
    }),
    prisma.ruleSet.findMany({
      where: { isActive: true },
      orderBy: { version: "desc" }
    })
  ]);

  return { issues, ruleSets };
}

export async function getProposalPageData(proposalId: string) {
  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId },
    include: {
      issue: {
        include: {
          team: true
        }
      },
      createdBy: true,
      targetRuleSet: true,
      votes: {
        include: {
          user: true
        }
      },
      decision: {
        include: {
          decidedBy: true
        }
      },
      supportingProjects: {
        include: {
          createdBy: true
        }
      },
      feedbackEntries: {
        include: {
          createdBy: true
        },
        orderBy: { createdAt: "desc" }
      },
      revisions: {
        include: {
          createdBy: true
        },
        orderBy: { createdAt: "desc" }
      }
    }
  });

  if (!proposal) {
    return null;
  }

  const publication = await prisma.publication.findUnique({
    where: {
      sourceType_sourceId: {
        sourceType: PublicationSourceType.PROPOSAL,
        sourceId: proposal.id
      }
    }
  });

  return {
    ...proposal,
    publication,
    canVote: canVoteOnProposal(proposal)
  };
}

export async function getAdminPageData() {
  const [users, issues, proposals, currentSeason, rulesets, teams, activity, publications] = await Promise.all([
    prisma.user.findMany({
      include: {
        linkedTeam: true,
        commissioner: true,
        studentInvites: {
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: [{ role: "desc" }, { name: "asc" }]
    }),
    prisma.issue.findMany({
      include: {
        team: true
      },
      orderBy: [{ severity: "desc" }, { createdAt: "desc" }]
    }),
    prisma.proposal.findMany({
      include: {
        issue: true,
        createdBy: true,
        decision: true,
        votes: true,
        targetRuleSet: true
      },
      orderBy: { createdAt: "desc" }
    }),
    getCurrentSeason(),
    prisma.ruleSet.findMany({ orderBy: { version: "desc" } }),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
    prisma.activityEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 8
    }),
    prisma.publication.findMany({
      include: {
        issue: true,
        team: true
      },
      orderBy: { publishedAt: "desc" },
      take: 12
    })
  ]);

  return {
    users,
    issues,
    proposals,
    currentSeason,
    rulesets,
    teams,
    activity,
    publications
  };
}

export async function getAdminPublicationsData() {
  const publications = await prisma.publication.findMany({
    include: {
      issue: true,
      team: true,
      season: true,
      exports: {
        orderBy: { target: "asc" }
      }
    },
    orderBy: [{ externalApproved: "asc" }, { externalReady: "desc" }, { publishedAt: "desc" }]
  });

  const projectIds = publications
    .filter((publication) => publication.sourceType === PublicationSourceType.PROJECT)
    .map((publication) => publication.sourceId);
  const proposalIds = publications
    .filter((publication) => publication.sourceType === PublicationSourceType.PROPOSAL)
    .map((publication) => publication.sourceId);

  const [projects, proposals] = await Promise.all([
    projectIds.length > 0
      ? prisma.project.findMany({
          where: { id: { in: projectIds } },
          select: {
            id: true,
            submissionStatus: true,
            updatedAt: true
          }
        })
      : [],
    proposalIds.length > 0
      ? prisma.proposal.findMany({
          where: { id: { in: proposalIds } },
          select: {
            id: true,
            status: true,
            updatedAt: true
          }
        })
      : []
  ]);

  const projectStatusById = new Map(
    projects.map((project) => [
      project.id,
      {
        sourceStatus: project.submissionStatus,
        sourceUpdatedAt: project.updatedAt
      }
    ])
  );
  const proposalStatusById = new Map(
    proposals.map((proposal) => [
      proposal.id,
      {
        sourceStatus: proposal.status,
        sourceUpdatedAt: proposal.updatedAt
      }
    ])
  );

  return publications.map((publication) => ({
    ...publication,
    ...(publication.sourceType === PublicationSourceType.PROJECT
      ? projectStatusById.get(publication.sourceId)
      : proposalStatusById.get(publication.sourceId))
  }));
}

export async function getProjectStudioData(projectId?: string) {
  const [issues, teams, users, proposals, project] = await Promise.all([
    prisma.issue.findMany({
      where: { status: { in: [IssueStatus.OPEN, IssueStatus.IN_REVIEW] } },
      orderBy: [{ severity: "desc" }, { title: "asc" }]
    }),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ orderBy: { name: "asc" } }),
    prisma.proposal.findMany({
      where: {
        status: {
          in: [
            ProposalStatus.SUBMITTED,
            ProposalStatus.APPROVED_FOR_INTERNAL_PUBLICATION,
            ProposalStatus.READY_FOR_VOTING,
            ProposalStatus.VOTING,
            ProposalStatus.DECISION,
            ProposalStatus.PUBLISHED_INTERNAL,
            ProposalStatus.MARKED_EXTERNAL_READY,
            ProposalStatus.APPROVED_FOR_EXTERNAL_PUBLICATION
          ]
        }
      },
      include: {
        issue: true
      },
      orderBy: { createdAt: "desc" }
    }),
    projectId
      ? prisma.project.findUnique({
          where: { id: projectId },
          include: {
            issueLinks: true,
            collaborators: true,
            feedbackEntries: {
              include: {
                createdBy: {
                  select: {
                    name: true
                  }
                }
              },
              orderBy: {
                createdAt: "desc"
              }
            }
          }
        })
      : null
  ]);

  return {
    issues,
    teams,
    users,
    proposals,
    project
  };
}

export async function getProposalStudioData(proposalId?: string) {
  const [issues, ruleSets, proposal] = await Promise.all([
    prisma.issue.findMany({
      where: { status: { in: [IssueStatus.OPEN, IssueStatus.IN_REVIEW] } },
      include: { team: true },
      orderBy: [{ severity: "desc" }, { title: "asc" }]
    }),
    prisma.ruleSet.findMany({
      where: { isActive: true },
      orderBy: { version: "desc" }
    }),
    proposalId
      ? prisma.proposal.findUnique({
          where: { id: proposalId }
        })
      : null
  ]);

  return { issues, ruleSets, proposal };
}

export async function getResearchPageData() {
  return prisma.publication.findMany({
    include: {
      issue: true,
      team: true,
      season: true
    },
    orderBy: { publishedAt: "desc" }
  });
}

export async function getPublicationPageData(slug: string) {
  const publication = await prisma.publication.findUnique({
    where: { slug },
    include: {
      issue: true,
      team: true,
      season: true
    }
  });

  if (!publication) {
    return null;
  }

  if (publication.sourceType === PublicationSourceType.PROJECT) {
    const project = await getProjectPageData(publication.sourceId);
    return {
      publication,
      sourceType: PublicationSourceType.PROJECT,
      project,
      proposal: null
    };
  }

  const proposal = await getProposalPageData(publication.sourceId);
  return {
    publication,
    sourceType: PublicationSourceType.PROPOSAL,
    project: null,
    proposal
  };
}

export function parseProjectJson(project: {
  laneTagsJson: Prisma.JsonValue;
  artifactLinksJson: Prisma.JsonValue;
  contentJson?: Prisma.JsonValue | null;
  reviewChecklistJson?: Prisma.JsonValue | null;
  referencesJson?: Prisma.JsonValue | null;
  keywordsJson?: Prisma.JsonValue | null;
  keyTakeawaysJson?: Prisma.JsonValue | null;
  lanePrimary?: string | null;
  projectType?: ProjectType;
}) {
  const laneTags = jsonValue<LaneTag[]>(project.laneTagsJson) ?? [];
  const lanePrimary = (project.lanePrimary as LaneTag | null) ?? getPrimaryLaneTag(
    laneTags,
    project.projectType ?? ProjectType.INVESTIGATION
  );
  const content = parseProjectContent(project.contentJson, lanePrimary);
  const artifactLinks = jsonValue<ArtifactLink[]>(project.artifactLinksJson) ?? [];

  return {
    lanePrimary,
    laneTags,
    artifactLinks: artifactLinks.length > 0 ? artifactLinks : content.artifacts,
    content,
    checklist: parseChecklist(project.reviewChecklistJson),
    references: parseReferences(project.referencesJson),
    keywords: parseKeywords(project.keywordsJson),
    keyTakeaways: parseTakeaways(project.keyTakeawaysJson)
  };
}

export function parseIssueMetrics(metricsJson: Prisma.JsonValue | null) {
  return jsonValue<IssueMetrics>(metricsJson) ?? {};
}

export function parseProposalJson(proposal: {
  diffJson: Prisma.JsonValue;
  narrativeJson: Prisma.JsonValue;
  sandboxResultJson: Prisma.JsonValue | null;
  contentJson?: Prisma.JsonValue | null;
  reviewChecklistJson?: Prisma.JsonValue | null;
  referencesJson?: Prisma.JsonValue | null;
  keywordsJson?: Prisma.JsonValue | null;
  keyTakeawaysJson?: Prisma.JsonValue | null;
}) {
  return {
    diff: jsonValue<RuleDiff>(proposal.diffJson),
    narrative: jsonValue<ProposalNarrative>(proposal.narrativeJson),
    content: parseProposalContent(proposal.contentJson),
    sandbox: jsonValue<SandboxImpactReport | null>(proposal.sandboxResultJson),
    checklist: parseChecklist(proposal.reviewChecklistJson),
    references: parseReferences(proposal.referencesJson),
    keywords: parseKeywords(proposal.keywordsJson),
    keyTakeaways: parseTakeaways(proposal.keyTakeawaysJson)
  };
}

export function formatProposalStatus(status: ProposalStatus) {
  return status.replace("_", " ");
}

export async function getStudentDashboardData(userId: string) {
  const OPEN_PROJECT_STATUSES: SubmissionStatus[] = [
    SubmissionStatus.DRAFT,
    SubmissionStatus.SUBMITTED,
    SubmissionStatus.REVISION_REQUESTED,
    SubmissionStatus.APPROVED_FOR_INTERNAL_PUBLICATION
  ];
  const OPEN_PROPOSAL_STATUSES: ProposalStatus[] = [
    ProposalStatus.DRAFT,
    ProposalStatus.SUBMITTED,
    ProposalStatus.REVISION_REQUESTED
  ];

  const [openProjects, openProposals] = await Promise.all([
    prisma.project.findMany({
      where: { createdByUserId: userId, submissionStatus: { in: OPEN_PROJECT_STATUSES } },
      select: { id: true, title: true, submissionStatus: true, lanePrimary: true, updatedAt: true },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.proposal.findMany({
      where: { createdByUserId: userId, status: { in: OPEN_PROPOSAL_STATUSES } },
      select: { id: true, title: true, status: true, updatedAt: true },
      orderBy: { updatedAt: "desc" }
    })
  ]);

  return { openProjects, openProposals };
}
