import {
  IssueStatus,
  ProjectMilestoneStatus,
  ProposalStatus,
  SubmissionStatus
} from "@prisma/client";

import { parseProjectContent, parseReferences } from "@/lib/publications";
import { prisma } from "@/lib/prisma";
import type { LaneTag } from "@/lib/types";

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

export async function loadProjectAiContext(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          linkedTeam: {
            select: {
              id: true,
              name: true
            }
          }
        }
      },
      primaryIssue: {
        include: {
          team: {
            select: {
              id: true,
              name: true
            }
          },
          proposals: {
            select: {
              id: true,
              title: true,
              status: true
            },
            orderBy: {
              createdAt: "desc"
            }
          },
          projectLinks: {
            select: {
              project: {
                select: {
                  id: true,
                  title: true
                }
              }
            }
          }
        }
      },
      issueLinks: {
        include: {
          issue: {
            select: {
              id: true,
              title: true,
              severity: true
            }
          }
        }
      },
      milestones: {
        orderBy: {
          targetDate: "asc"
        }
      },
      deliverables: {
        orderBy: {
          key: "asc"
        }
      },
      campaignEvents: {
        include: {
          actor: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 40
      },
      revisions: {
        orderBy: {
          createdAt: "desc"
        },
        take: 8
      },
      feedbackEntries: {
        include: {
          createdBy: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 10
      },
      collaborators: {
        include: {
          user: {
            select: {
              id: true,
              name: true
            }
          }
        }
      },
      aiArtifacts: {
        include: {
          sources: {
            orderBy: {
              rank: "asc"
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      }
    }
  });

  if (!project) {
    return null;
  }

  const lanePrimary = (project.lanePrimary ?? "ECONOMIC_INVESTIGATORS") as LaneTag;

  return {
    project,
    lanePrimary,
    content: parseProjectContent(project.contentJson, lanePrimary),
    references: parseReferences(project.referencesJson),
    activeMilestone:
      project.milestones.find((milestone) => milestone.status === ProjectMilestoneStatus.ACTIVE) ?? null
  };
}

export async function loadIssueAiContext(issueId: string) {
  return prisma.issue.findUnique({
    where: { id: issueId },
    include: {
      team: {
        select: {
          id: true,
          name: true
        }
      },
      proposals: {
        include: {
          createdBy: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      },
      projectLinks: {
        include: {
          project: {
            select: {
              id: true,
              title: true,
              updatedAt: true
            }
          }
        }
      },
      aiArtifacts: {
        include: {
          sources: {
            orderBy: {
              rank: "asc"
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      }
    }
  });
}

export async function loadStudentMissionContext(userId: string) {
  const [user, openProjects, openProposals, issues] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
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
        createdByUserId: userId,
        submissionStatus: {
          in: openProjectStatuses
        }
      },
      include: {
        primaryIssue: {
          select: {
            id: true,
            title: true
          }
        },
        milestones: {
          orderBy: {
            targetDate: "asc"
          }
        },
        deliverables: true,
        campaignEvents: {
          include: {
            actor: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            createdAt: "desc"
          },
          take: 20
        },
        aiArtifacts: {
          include: {
            sources: {
              orderBy: {
                rank: "asc"
              }
            }
          },
          orderBy: {
            createdAt: "desc"
          }
        }
      },
      orderBy: {
        updatedAt: "desc"
      }
    }),
    prisma.proposal.findMany({
      where: {
        createdByUserId: userId,
        status: {
          in: openProposalStatuses
        }
      },
      include: {
        issue: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: {
        updatedAt: "desc"
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
            id: true,
            title: true
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
    })
  ]);

  return {
    user,
    openProjects,
    openProposals,
    issues
  };
}
