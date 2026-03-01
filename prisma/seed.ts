import { hash } from "bcryptjs";
import {
  Prisma,
  ProjectType,
  ProposalStatus,
  SubmissionStatus,
  UserRole,
  VoteValue
} from "@prisma/client";

import {
  activityFeed,
  issues,
  projects,
  proposals,
  ruleSets,
  teams
} from "../src/lib/demo-data";
import {
  backfillProjectContent,
  backfillProposalContent,
  buildExternalReadinessChecklist,
  buildProjectChecklist,
  buildProposalChecklist,
  createPublicationSlug,
  getPrimaryLaneTag,
  projectTypeToPublicationType
} from "../src/lib/publications";
import { prisma } from "../src/lib/prisma";
import type { ReferenceEntry } from "../src/lib/types";
import { slugify } from "../src/lib/utils";
import { syncProjectPublication, syncProposalPublication } from "../src/server/publications";

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

function projectSeedStatus(index: number) {
  if (index === 0) {
    return SubmissionStatus.APPROVED_FOR_EXTERNAL_PUBLICATION;
  }

  if (index === 1 || index === 2) {
    return SubmissionStatus.MARKED_EXTERNAL_READY;
  }

  return SubmissionStatus.PUBLISHED_INTERNAL;
}

function proposalSeedStatus(status: ProposalStatus) {
  if (status === ProposalStatus.DECISION) {
    return ProposalStatus.DECISION;
  }

  return status;
}

async function main() {
  const passwordHash = await hash(defaultPassword, 10);
  const names = uniqueNames();
  const studentNames = names.filter((name) => name !== "Commissioner Avery");

  await prisma.publicationExport.deleteMany();
  await prisma.publication.deleteMany();
  await prisma.proposalFeedback.deleteMany();
  await prisma.projectFeedback.deleteMany();
  await prisma.proposalRevision.deleteMany();
  await prisma.projectRevision.deleteMany();
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
    const status = proposalSeedStatus(proposal.status as ProposalStatus);
    const schedule = voteSchedule(status);
    const content = backfillProposalContent(proposal.narrative);
    const references: ReferenceEntry[] = [
      {
        label: "BOW League Rules",
        url: "https://bow.local/rules",
        sourceType: "DATASET",
        note: "Active rule environment used for the memo."
      },
      {
        label: "Issue docket",
        url: `https://bow.local/issues/${proposal.issueId}`,
        sourceType: "ARTICLE",
        note: "Connected issue record."
      }
    ];
    const keywords = proposal.title
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
      .slice(0, 6);
    const keyTakeaways = [proposal.narrative.expectedImpact, proposal.narrative.tradeoffs].filter(Boolean);
    const reviewChecklist = buildProposalChecklist({
      title: proposal.title,
      abstract: proposal.narrative.problem,
      content: {
        ...content,
        sandboxInterpretation:
          proposal.sandbox.explanation[0] ?? "The sandbox suggests a measurable system change."
      },
      references,
      keywords,
      sandboxInterpretationSaved: true
    });
    const externalChecklist = buildExternalReadinessChecklist({
      title: proposal.title,
      abstract: proposal.narrative.problem,
      slug: createPublicationSlug(proposal.title, proposal.id),
      references,
      keywords,
      requiredSections: [
        { label: "Problem", value: content.problem },
        { label: "Current rule context", value: content.currentRuleContext },
        { label: "Impact analysis", value: content.impactAnalysis },
        { label: "Recommendation", value: proposal.narrative.proposedChange }
      ]
    });
    const createdProposal = await prisma.proposal.create({
      data: {
        id: proposal.id,
        title: proposal.title,
        issueId: issueIds.get(proposal.issueId)!,
        createdByUserId: userMap.get(proposal.createdBy)!,
        status,
        abstract: proposal.narrative.problem,
        methodsSummary: "Compared baseline rules to the proposal diff using the BOW sandbox model.",
        ruleSetIdTarget: ruleSetIds.get(proposal.ruleSetTargetId)!,
        diffJson: asJson(proposal.diff),
        narrativeJson: asJson(proposal.narrative),
        contentJson: asJson({
          ...content,
          sandboxInterpretation:
            proposal.sandbox.explanation[0] ?? "The sandbox shows a measurable league effect.",
          recommendation: proposal.narrative.proposedChange
        }),
        reviewChecklistJson: asJson([...reviewChecklist, ...externalChecklist]),
        sandboxResultJson: asJson(proposal.sandbox),
        keyTakeawaysJson: asJson(keyTakeaways),
        referencesJson: asJson(references),
        keywordsJson: asJson(keywords),
        publicationSummary: proposal.narrative.expectedImpact,
        publicationSlug: createPublicationSlug(proposal.title, proposal.id),
        submittedAt: status === ProposalStatus.DRAFT ? null : new Date("2028-10-21T12:00:00Z"),
        approvedForInternalPublicationAt:
          status === ProposalStatus.DECISION ? new Date("2028-10-30T12:00:00Z") : null,
        publishedInternalAt:
          status === ProposalStatus.DECISION ? new Date("2028-11-02T12:00:00Z") : null,
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

    await syncProposalPublication({
      proposalId: createdProposal.id,
      actorUserId: userMap.get("Commissioner Avery")!
    });
  }

  const projectIds = new Map<string, string>();
  for (const [index, project] of projects.entries()) {
    const lanePrimary = getPrimaryLaneTag(project.laneTags, project.projectType as ProjectType);
    const content = backfillProjectContent({
      summary: project.summary,
      findingsMd: project.findings.map((line) => `- ${line}`).join("\n"),
      projectType: project.projectType as ProjectType,
      laneTags: project.laneTags,
      artifactLinks: project.artifactLinks
    });
    const references: ReferenceEntry[] = [
      ...project.artifactLinks.map(
        (artifact): ReferenceEntry => ({
        label: artifact.label,
        url: artifact.url,
        sourceType: "TOOL",
        note: "Linked project artifact."
      })
      ),
      {
        label: "Issue docket",
        url: `https://bow.local/issues/${project.issueIds[0] ?? ""}`,
        sourceType: "DATASET",
        note: "Connected issue context."
      }
    ];
    const keywords = project.title
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
      .slice(0, 6);
    const keyTakeaways = project.findings.slice(0, 3);
    const submissionStatus = projectSeedStatus(index);
    const reviewChecklist = buildProjectChecklist(
      {
        title: project.title,
        abstract: project.summary,
        essentialQuestion: content.questionOrMission,
        content,
        references,
        keywords
      },
      lanePrimary
    );
    const externalChecklist = buildExternalReadinessChecklist({
      title: project.title,
      abstract: project.summary,
      slug: createPublicationSlug(project.title, project.id),
      references,
      keywords,
      requiredSections: [
        { label: "Overview", value: content.overview },
        { label: "Evidence", value: content.evidence },
        { label: "Analysis", value: content.analysis },
        { label: "Recommendations", value: content.recommendations }
      ]
    });
    const createdProject = await prisma.project.create({
      data: {
        id: project.id,
        title: project.title,
        summary: project.summary,
        projectType: project.projectType as ProjectType,
        submissionStatus,
        publicationType: projectTypeToPublicationType(project.projectType as ProjectType, lanePrimary),
        lanePrimary,
        laneTagsJson: asJson(project.laneTags),
        issueId: project.issueIds[0] ? issueIds.get(project.issueIds[0])! : null,
        teamId: project.teamId ? teamIds.get(project.teamId)! : null,
        supportingProposalId: project.supportingProposalId
          ? proposalIds.get(project.supportingProposalId)!
          : null,
        artifactLinksJson: asJson(project.artifactLinks),
        findingsMd: project.findings.map((line) => `- ${line}`).join("\n"),
        contentJson: asJson(content),
        reviewChecklistJson: asJson([...reviewChecklist, ...externalChecklist]),
        abstract: project.summary,
        essentialQuestion: content.questionOrMission,
        methodsSummary: "Built from league records, issue context, and linked artifacts inside the BOW Universe.",
        keyTakeawaysJson: asJson(keyTakeaways),
        referencesJson: asJson(references),
        keywordsJson: asJson(keywords),
        publicationSummary: project.summary,
        publicationSlug: createPublicationSlug(project.title, project.id),
        submittedAt: new Date(project.createdAt),
        approvedForInternalPublicationAt: new Date("2028-10-26T12:00:00Z"),
        publishedInternalAt: new Date("2028-10-30T12:00:00Z"),
        markedExternalReadyAt:
          submissionStatus === SubmissionStatus.MARKED_EXTERNAL_READY ||
          submissionStatus === SubmissionStatus.APPROVED_FOR_EXTERNAL_PUBLICATION
            ? new Date("2028-11-04T12:00:00Z")
            : null,
        approvedForExternalPublicationAt:
          submissionStatus === SubmissionStatus.APPROVED_FOR_EXTERNAL_PUBLICATION
            ? new Date("2028-11-07T12:00:00Z")
            : null,
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

    await syncProjectPublication({
      projectId: createdProject.id,
      actorUserId: userMap.get("Commissioner Avery")!
    });
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
