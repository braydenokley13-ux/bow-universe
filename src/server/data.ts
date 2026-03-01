import { IssueStatus, Prisma, ProjectType, ProposalStatus } from "@prisma/client";

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
  const [projectRecords, issueRecords, teamRecords, userRecords] = await Promise.all([
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
      orderBy: { createdAt: "desc" }
    }),
    prisma.issue.findMany({ orderBy: [{ severity: "desc" }, { title: "asc" }] }),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({ orderBy: { name: "asc" } })
  ]);

  return {
    projects: projectRecords,
    issues: issueRecords,
    teams: teamRecords,
    users: userRecords
  };
}

export async function getProjectPageData(projectId: string) {
  return prisma.project.findUnique({
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
      }
    }
  });
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
    orderBy: { createdAt: "desc" }
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
      issue: true,
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
      }
    }
  });

  if (!proposal) {
    return null;
  }

  return {
    ...proposal,
    canVote: canVoteOnProposal(proposal)
  };
}

export async function getAdminPageData() {
  const [users, issues, proposals, currentSeason, rulesets, teams, activity] = await Promise.all([
    prisma.user.findMany({ orderBy: [{ role: "desc" }, { name: "asc" }] }),
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
    })
  ]);

  return {
    users,
    issues,
    proposals,
    currentSeason,
    rulesets,
    teams,
    activity
  };
}

export function parseProjectJson(project: {
  laneTagsJson: Prisma.JsonValue;
  artifactLinksJson: Prisma.JsonValue;
}) {
  return {
    laneTags: jsonValue<LaneTag[]>(project.laneTagsJson) ?? [],
    artifactLinks: jsonValue<ArtifactLink[]>(project.artifactLinksJson) ?? []
  };
}

export function parseIssueMetrics(metricsJson: Prisma.JsonValue | null) {
  return jsonValue<IssueMetrics>(metricsJson) ?? {};
}

export function parseProposalJson(proposal: {
  diffJson: Prisma.JsonValue;
  narrativeJson: Prisma.JsonValue;
  sandboxResultJson: Prisma.JsonValue | null;
}) {
  return {
    diff: jsonValue<RuleDiff>(proposal.diffJson),
    narrative: jsonValue<ProposalNarrative>(proposal.narrativeJson),
    sandbox: jsonValue<SandboxImpactReport | null>(proposal.sandboxResultJson)
  };
}

export function formatProposalStatus(status: ProposalStatus) {
  return status.replace("_", " ");
}
