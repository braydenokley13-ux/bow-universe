"use server";

import { DecisionType, IssueStatus, Prisma, ProjectType, ProposalStatus, UserRole, VoteValue } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { parseRuleDiff } from "@/lib/rules";
import { parseJsonText, parseStringList } from "@/lib/utils";
import { requireAdmin, requireUser } from "@/server/auth";
import {
  advanceSeasonWorkflow,
  applyDecisionToPendingRuleSetWorkflow,
  canVoteOnProposal,
  createActivityEvent,
  runProposalSandboxWorkflow
} from "@/server/workflows";

const projectSchema = z.object({
  title: z.string().min(3),
  summary: z.string().min(10),
  projectType: z.nativeEnum(ProjectType),
  findingsMd: z.string().min(10)
});

const proposalSchema = z.object({
  title: z.string().min(5),
  issueId: z.string().min(1),
  ruleSetId: z.string().min(1),
  problem: z.string().min(10),
  proposedChange: z.string().min(10),
  expectedImpact: z.string().min(10),
  tradeoffs: z.string().min(10),
  diffJson: z.string().min(2)
});

const issueSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(10),
  severity: z.coerce.number().int().min(1).max(5),
  status: z.nativeEnum(IssueStatus),
  teamId: z.string().optional().nullable(),
  evidenceMd: z.string().min(4)
});

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function parseArtifactLinks(lines: string[]) {
  return lines
    .map((line) => {
      const [label, url] = line.split("|").map((value) => value.trim());
      if (!label || !url) {
        return null;
      }

      return { label, url };
    })
    .filter(Boolean);
}

function parseOptionalDate(value: FormDataEntryValue | null) {
  if (!value || typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  return new Date(value);
}

export async function createProjectAction(formData: FormData) {
  const viewer = await requireUser();

  const parsed = projectSchema.parse({
    title: formData.get("title"),
    summary: formData.get("summary"),
    projectType: formData.get("projectType"),
    findingsMd: formData.get("findingsMd")
  });

  const issueIds = formData.getAll("issueIds").map(String).filter(Boolean);
  const collaboratorIds = formData.getAll("collaboratorIds").map(String).filter(Boolean);
  const laneTags = formData.getAll("laneTags").map(String).filter(Boolean);
  const teamId = String(formData.get("teamId") ?? "").trim() || null;
  const artifactLinks = parseArtifactLinks(parseStringList(formData.get("artifactLinks")));

  const project = await prisma.project.create({
    data: {
      title: parsed.title,
      summary: parsed.summary,
      projectType: parsed.projectType,
      findingsMd: parsed.findingsMd,
      laneTagsJson: asJson(laneTags),
      artifactLinksJson: asJson(artifactLinks),
      teamId,
      issueId: issueIds[0] ?? null,
      createdByUserId: viewer.id,
      issueLinks: {
        create: issueIds.map((issueId) => ({
          issueId
        }))
      },
      collaborators: {
        create: collaboratorIds.map((userId) => ({
          userId
        }))
      }
    }
  });

  await createActivityEvent(prisma, {
    type: "project",
    title: `New project: ${project.title}`,
    summary: `${viewer.name} published a ${parsed.projectType.toLowerCase().replace("_", " ")} project in the BOW Universe registry.`,
    entityType: "Project",
    entityId: project.id,
    createdByUserId: viewer.id,
    metadata: {
      issueIds,
      teamId
    }
  });

  revalidatePath("/projects");
  revalidatePath("/");
  redirect(`/projects/${project.id}`);
}

export async function createProposalAction(formData: FormData) {
  const viewer = await requireUser();

  const parsed = proposalSchema.parse({
    title: formData.get("title"),
    issueId: formData.get("issueId"),
    ruleSetId: formData.get("ruleSetId"),
    problem: formData.get("problem"),
    proposedChange: formData.get("proposedChange"),
    expectedImpact: formData.get("expectedImpact"),
    tradeoffs: formData.get("tradeoffs"),
    diffJson: formData.get("diffJson")
  });

  const diff = parseRuleDiff(parseJsonText(parsed.diffJson, { changes: [] }));
  const status = String(formData.get("intent") ?? "DRAFT") === "SUBMITTED"
    ? ProposalStatus.SUBMITTED
    : ProposalStatus.DRAFT;
  const sandboxResultJson = parseJsonText(formData.get("sandboxResultJson"), null);

  const proposal = await prisma.proposal.create({
    data: {
      title: parsed.title,
      issueId: parsed.issueId,
      createdByUserId: viewer.id,
      status,
      ruleSetIdTarget: parsed.ruleSetId,
      diffJson: asJson(diff),
      narrativeJson: asJson({
        problem: parsed.problem,
        proposedChange: parsed.proposedChange,
        expectedImpact: parsed.expectedImpact,
        tradeoffs: parsed.tradeoffs
      }),
      sandboxResultJson: sandboxResultJson ? asJson(sandboxResultJson) : undefined
    }
  });

  await createActivityEvent(prisma, {
    type: "proposal",
    title: `${status === ProposalStatus.SUBMITTED ? "Submitted" : "Drafted"} proposal: ${proposal.title}`,
    summary: `${viewer.name} created a proposal connected to a live league issue.`,
    entityType: "Proposal",
    entityId: proposal.id,
    createdByUserId: viewer.id,
    metadata: {
      status
    }
  });

  revalidatePath("/proposals");
  revalidatePath("/");
  redirect(`/proposals/${proposal.id}`);
}

export async function addProjectCommentAction(formData: FormData) {
  const viewer = await requireUser();
  const projectId = String(formData.get("projectId") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!projectId || body.length < 2) {
    return;
  }

  await prisma.projectComment.create({
    data: {
      projectId,
      userId: viewer.id,
      body
    }
  });

  await createActivityEvent(prisma, {
    type: "comment",
    title: `New project comment`,
    summary: `${viewer.name} added a comment to a project discussion thread.`,
    entityType: "Project",
    entityId: projectId,
    createdByUserId: viewer.id
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function castVoteAction(formData: FormData) {
  const viewer = await requireUser();
  const proposalId = String(formData.get("proposalId") ?? "");
  const value = String(formData.get("value") ?? "") as VoteValue;

  if (!proposalId || !Object.values(VoteValue).includes(value)) {
    return;
  }

  const proposal = await prisma.proposal.findUnique({
    where: { id: proposalId }
  });

  if (!proposal || !canVoteOnProposal(proposal)) {
    return;
  }

  const existingVote = await prisma.vote.findUnique({
    where: {
      proposalId_userId: {
        proposalId,
        userId: viewer.id
      }
    }
  });

  if (existingVote) {
    return;
  }

  await prisma.vote.create({
    data: {
      proposalId,
      userId: viewer.id,
      value
    }
  });

  await createActivityEvent(prisma, {
    type: "vote",
    title: `${viewer.name} voted ${value}`,
    summary: `${viewer.name} cast a ${value} vote on a proposal during an active voting window.`,
    entityType: "Proposal",
    entityId: proposalId,
    createdByUserId: viewer.id,
    metadata: {
      value
    }
  });

  revalidatePath("/admin");
  revalidatePath("/proposals");
  revalidatePath(`/proposals/${proposalId}`);
}

export async function updateUserRoleAction(formData: FormData) {
  const viewer = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "") as UserRole;

  if (!userId || !Object.values(UserRole).includes(role)) {
    return;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role }
  });

  await createActivityEvent(prisma, {
    type: "user",
    title: `Updated user role`,
    summary: `${viewer.name} changed a user role to ${role}.`,
    entityType: "User",
    entityId: userId,
    createdByUserId: viewer.id,
    metadata: { role }
  });

  revalidatePath("/admin");
}

export async function updateProposalStatusAction(formData: FormData) {
  const viewer = await requireAdmin();
  const proposalId = String(formData.get("proposalId") ?? "");
  const status = String(formData.get("status") ?? "") as ProposalStatus;
  const voteStart = parseOptionalDate(formData.get("voteStart"));
  const voteEnd = parseOptionalDate(formData.get("voteEnd"));

  if (!proposalId || !Object.values(ProposalStatus).includes(status)) {
    return;
  }

  await prisma.proposal.update({
    where: { id: proposalId },
    data: {
      status,
      voteStart: status === ProposalStatus.VOTING ? voteStart ?? new Date() : null,
      voteEnd:
        status === ProposalStatus.VOTING
          ? voteEnd ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          : status === ProposalStatus.DECISION
            ? new Date()
            : null
    }
  });

  await createActivityEvent(prisma, {
    type: "proposal",
    title: `Proposal status moved to ${status.replace("_", " ")}`,
    summary: `${viewer.name} updated the proposal workflow state.`,
    entityType: "Proposal",
    entityId: proposalId,
    createdByUserId: viewer.id,
    metadata: {
      status,
      voteStart,
      voteEnd
    }
  });

  revalidatePath("/admin");
  revalidatePath("/proposals");
  revalidatePath(`/proposals/${proposalId}`);
}

export async function recordDecisionAction(formData: FormData) {
  const viewer = await requireAdmin();
  const proposalId = String(formData.get("proposalId") ?? "");
  const decision = String(formData.get("decision") ?? "") as DecisionType;
  const notes = String(formData.get("notes") ?? "").trim();
  const amendedDiffJson = String(formData.get("amendedDiffJson") ?? "").trim();

  if (!proposalId || !Object.values(DecisionType).includes(decision)) {
    return;
  }

  await applyDecisionToPendingRuleSetWorkflow({
    proposalId,
    actorUserId: viewer.id,
    decision,
    notes,
    amendedDiff:
      decision === DecisionType.AMEND && amendedDiffJson
        ? parseRuleDiff(parseJsonText(amendedDiffJson, { changes: [] }))
        : null
  });

  revalidatePath("/admin");
  revalidatePath("/rules");
  revalidatePath("/proposals");
  revalidatePath("/");
  revalidatePath(`/proposals/${proposalId}`);
}

export async function saveIssueAction(formData: FormData) {
  const viewer = await requireAdmin();
  const issueId = String(formData.get("issueId") ?? "").trim();
  const parsed = issueSchema.parse({
    title: formData.get("title"),
    description: formData.get("description"),
    severity: formData.get("severity"),
    status: formData.get("status"),
    teamId: formData.get("teamId"),
    evidenceMd: formData.get("evidenceMd")
  });
  const metricsJson = parseJsonText(formData.get("metricsJson"), {});
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) {
    throw new Error("Issues must have a slug.");
  }

  const savedIssue = issueId
    ? await prisma.issue.update({
        where: { id: issueId },
        data: {
          slug,
          title: parsed.title,
          description: parsed.description,
          severity: parsed.severity,
          status: parsed.status,
          teamId: parsed.teamId || null,
          evidenceMd: parsed.evidenceMd,
          metricsJson: asJson(metricsJson)
        }
      })
    : await prisma.issue.create({
        data: {
          slug,
          title: parsed.title,
          description: parsed.description,
          severity: parsed.severity,
          status: parsed.status,
          teamId: parsed.teamId || null,
          evidenceMd: parsed.evidenceMd,
          metricsJson: asJson(metricsJson),
          createdByUserId: viewer.id
        }
      });

  await createActivityEvent(prisma, {
    type: "issue",
    title: `${issueId ? "Updated" : "Created"} issue: ${savedIssue.title}`,
    summary: `${viewer.name} ${issueId ? "updated" : "opened"} an issue in the commissioner workspace.`,
    entityType: "Issue",
    entityId: savedIssue.id,
    createdByUserId: viewer.id,
    metadata: {
      severity: savedIssue.severity,
      status: savedIssue.status
    }
  });

  revalidatePath("/admin");
  revalidatePath("/issues");
  revalidatePath("/");
  revalidatePath(`/issues/${savedIssue.id}`);
}

export async function runProposalSandboxAction(formData: FormData) {
  const viewer = await requireUser();
  const proposalId = String(formData.get("proposalId") ?? "");

  if (!proposalId) {
    return;
  }

  await runProposalSandboxWorkflow({
    proposalId,
    actorUserId: viewer.id
  });

  revalidatePath("/proposals");
  revalidatePath("/");
  revalidatePath(`/proposals/${proposalId}`);
}

export async function advanceSeasonAction() {
  const viewer = await requireAdmin();
  await advanceSeasonWorkflow({
    actorUserId: viewer.id
  });

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/teams");
  revalidatePath("/issues");
  revalidatePath("/rules");
  revalidatePath("/proposals");
}
