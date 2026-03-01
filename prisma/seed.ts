import { hash } from "bcryptjs";
import { Prisma, ProjectType, ProposalStatus, UserRole, VoteValue } from "@prisma/client";

import {
  activityFeed,
  issues,
  projects,
  proposals,
  ruleSets,
  teams
} from "../src/lib/demo-data";
import { prisma } from "../src/lib/prisma";
import { slugify } from "../src/lib/utils";

const defaultPassword = "bowuniverse";

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function uniqueNames() {
  const names = new Set<string>(["Commissioner Avery"]);

  for (const project of projects) {
    names.add(project.createdBy);
    for (const collaborator of project.collaborators) {
      names.add(collaborator);
    }
    for (const comment of project.comments) {
      names.add(comment.author);
    }
  }

  for (const proposal of proposals) {
    names.add(proposal.createdBy);
    if (proposal.decision) {
      names.add(proposal.decision.decidedBy);
    }
  }

  names.add("Owen Brooks");
  names.add("Mina Holt");
  names.add("Ari Benson");
  names.add("Nia Park");
  names.add("Jonah Fields");
  names.add("Sasha Kim");
  names.add("Eva Quinn");
  names.add("Leo Marsh");
  names.add("Mika Torres");
  names.add("Nora James");

  for (let index = 1; index <= 18; index += 1) {
    names.add(`Student Analyst ${index}`);
  }

  return Array.from(names);
}

function voteSchedule(status: ProposalStatus) {
  if (status === ProposalStatus.VOTING) {
    return {
      voteStart: new Date("2028-11-04T09:00:00Z"),
      voteEnd: new Date("2028-11-08T21:00:00Z")
    };
  }

  if (status === ProposalStatus.DECISION) {
    return {
      voteStart: new Date("2028-10-24T09:00:00Z"),
      voteEnd: new Date("2028-10-29T21:00:00Z")
    };
  }

  return {
    voteStart: null,
    voteEnd: null
  };
}

async function main() {
  const passwordHash = await hash(defaultPassword, 10);
  const names = uniqueNames();
  const studentNames = names.filter((name) => name !== "Commissioner Avery");

  await prisma.activityEvent.deleteMany();
  await prisma.projectComment.deleteMany();
  await prisma.projectCollaborator.deleteMany();
  await prisma.projectIssue.deleteMany();
  await prisma.project.deleteMany();
  await prisma.commissionerDecision.deleteMany();
  await prisma.vote.deleteMany();
  await prisma.proposal.deleteMany();
  await prisma.issue.deleteMany();
  await prisma.teamSeason.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.season.deleteMany();
  await prisma.ruleSet.deleteMany();
  await prisma.team.deleteMany();
  await prisma.user.deleteMany();

  const userMap = new Map<string, string>();

  for (const name of names) {
    const role = name === "Commissioner Avery" ? UserRole.ADMIN : UserRole.STUDENT;
    const user = await prisma.user.create({
      data: {
        id: slugify(name),
        name,
        email:
          name === "Commissioner Avery"
            ? "commissioner@bow.local"
            : `${slugify(name)}@bow.local`,
        passwordHash,
        role
      }
    });
    userMap.set(name, user.id);
  }

  const ruleSetIds = new Map<string, string>();
  for (const ruleSet of [...ruleSets].sort((a, b) => a.version - b.version)) {
    const created = await prisma.ruleSet.create({
      data: {
        id: ruleSet.id,
        version: ruleSet.version,
        isActive: ruleSet.isActive,
        rulesJson: asJson(ruleSet.rules),
        changeSummaryJson: asJson(ruleSet.diffNotes),
        effectiveSeasonYear: ruleSet.effectiveSeasonYear,
        createdAt: new Date(ruleSet.createdAt),
        createdByUserId: userMap.get("Commissioner Avery")!
      }
    });
    ruleSetIds.set(ruleSet.id, created.id);
  }

  const teamIds = new Map<string, string>();
  for (const team of teams) {
    const createdTeam = await prisma.team.create({
      data: {
        id: team.id,
        name: team.name,
        slug: team.id,
        marketSizeTier: team.marketSizeTier,
        ownerProfile: team.ownerProfile,
        ownerDisciplineScore: team.ownerDisciplineScore
      }
    });
    teamIds.set(team.id, createdTeam.id);

    for (const contract of team.contracts) {
      await prisma.contract.create({
        data: {
          id: `${team.id}-${slugify(contract.playerName)}`,
          teamId: createdTeam.id,
          playerName: contract.playerName,
          startYear: 2028,
          years: contract.years,
          annualSalaryJson: asJson(contract.salaries),
          notes: contract.notes
        }
      });
    }
  }

  const season = await prisma.season.create({
    data: {
      id: "season-2028",
      year: 2028,
      activeRuleSetId: ruleSetIds.get("rules-v2")!,
      capNumber: 148,
      createdAt: new Date("2028-10-01T12:00:00Z")
    }
  });

  for (const team of teams) {
    await prisma.teamSeason.create({
      data: {
        id: `${team.id}-2028`,
        teamId: teamIds.get(team.id)!,
        seasonId: season.id,
        payroll: team.payroll,
        taxPaid: team.taxPaid,
        revenue: team.revenue,
        valuation: team.valuation,
        performanceProxy: team.performanceProxy
      }
    });
  }

  const issueIds = new Map<string, string>();
  for (const issue of issues) {
    const createdIssue = await prisma.issue.create({
      data: {
        id: issue.id,
        title: issue.title,
        slug: issue.id,
        description: issue.description,
        severity: issue.severity,
        status: issue.status,
        metricsJson: asJson(issue.metrics),
        evidenceMd: issue.evidence.map((line) => `- ${line}`).join("\n"),
        teamId: issue.teamId ? teamIds.get(issue.teamId) : null,
        createdAt: new Date("2028-10-15T12:00:00Z"),
        createdByUserId: userMap.get("Commissioner Avery")!
      }
    });
    issueIds.set(issue.id, createdIssue.id);
  }

  const proposalIds = new Map<string, string>();
  for (const proposal of proposals) {
    const status = proposal.status as ProposalStatus;
    const schedule = voteSchedule(status);
    const createdProposal = await prisma.proposal.create({
      data: {
        id: proposal.id,
        title: proposal.title,
        issueId: issueIds.get(proposal.issueId)!,
        createdByUserId: userMap.get(proposal.createdBy)!,
        status,
        ruleSetIdTarget: ruleSetIds.get(proposal.ruleSetTargetId)!,
        diffJson: asJson(proposal.diff),
        narrativeJson: asJson(proposal.narrative),
        sandboxResultJson: asJson(proposal.sandbox),
        voteStart: schedule.voteStart,
        voteEnd: schedule.voteEnd,
        createdAt: new Date("2028-10-20T12:00:00Z")
      }
    });
    proposalIds.set(proposal.id, createdProposal.id);

    if (proposal.decision) {
      await prisma.commissionerDecision.create({
        data: {
          id: `${proposal.id}-decision`,
          proposalId: createdProposal.id,
          decidedByUserId: userMap.get(proposal.decision.decidedBy)!,
          decision: proposal.decision.decision,
          notes: proposal.decision.notes,
          decidedAt: new Date(proposal.decision.decidedAt),
          amendedDiffJson:
            proposal.decision.decision === "AMEND" ? asJson(proposal.diff) : Prisma.JsonNull
        }
      });
    }

    const studentIds = studentNames.map((name) => userMap.get(name)!);

    const voteUsers = studentIds.slice(0, proposal.voteTally.yes + proposal.voteTally.no);

    for (let index = 0; index < voteUsers.length; index += 1) {
      await prisma.vote.create({
        data: {
          id: `${proposal.id}-vote-${index + 1}`,
          proposalId: createdProposal.id,
          userId: voteUsers[index],
          value: index < proposal.voteTally.yes ? VoteValue.YES : VoteValue.NO
        }
      });
    }
  }

  const projectIds = new Map<string, string>();
  for (const project of projects) {
    const createdProject = await prisma.project.create({
      data: {
        id: project.id,
        title: project.title,
        summary: project.summary,
        projectType: project.projectType as ProjectType,
        laneTagsJson: asJson(project.laneTags),
        issueId: project.issueIds[0] ? issueIds.get(project.issueIds[0])! : null,
        teamId: project.teamId ? teamIds.get(project.teamId)! : null,
        supportingProposalId: project.supportingProposalId
          ? proposalIds.get(project.supportingProposalId)!
          : null,
        artifactLinksJson: asJson(project.artifactLinks),
        findingsMd: project.findings.map((line) => `- ${line}`).join("\n"),
        createdByUserId: userMap.get(project.createdBy)!,
        createdAt: new Date(project.createdAt)
      }
    });
    projectIds.set(project.id, createdProject.id);

    for (const issueId of project.issueIds) {
      await prisma.projectIssue.create({
        data: {
          projectId: createdProject.id,
          issueId: issueIds.get(issueId)!
        }
      });
    }

    for (const collaborator of project.collaborators) {
      const collaboratorId = userMap.get(collaborator);
      if (collaboratorId) {
        await prisma.projectCollaborator.create({
          data: {
            projectId: createdProject.id,
            userId: collaboratorId
          }
        });
      }
    }

    for (const comment of project.comments) {
      await prisma.projectComment.create({
        data: {
          id: `${project.id}-comment-${slugify(comment.author)}`,
          projectId: createdProject.id,
          userId: userMap.get(comment.author)!,
          body: comment.body,
          createdAt: new Date(comment.createdAt)
        }
      });
    }
  }

  await prisma.ruleSet.update({
    where: { id: ruleSetIds.get("rules-v3")! },
    data: {
      sourceProposalId: proposalIds.get("raise-top-tax-band")!
    }
  });

  for (const event of activityFeed) {
    const entityType =
      event.type === "proposal"
        ? "Proposal"
        : event.type === "project"
          ? "Project"
          : event.type === "decision"
            ? "CommissionerDecision"
            : "Issue";

    const entityId =
      event.href.startsWith("/proposals/")
        ? proposalIds.get(event.href.replace("/proposals/", ""))
        : event.href.startsWith("/projects/")
          ? projectIds.get(event.href.replace("/projects/", ""))
          : event.href.startsWith("/issues/")
            ? issueIds.get(event.href.replace("/issues/", ""))
            : null;

    await prisma.activityEvent.create({
      data: {
        id: event.id,
        type: event.type,
        title: event.title,
        summary: event.summary,
        entityType,
        entityId,
        createdAt: new Date("2028-11-01T12:00:00Z"),
        createdByUserId: userMap.get("Commissioner Avery")!
      }
    });
  }

  console.log("Seeded BOW Universe.");
  console.log(`Commissioner login: commissioner@bow.local / ${defaultPassword}`);
  console.log(`Student login: riya-patel@bow.local / ${defaultPassword}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
