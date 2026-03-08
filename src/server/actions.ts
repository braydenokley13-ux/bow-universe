"use server";

import { randomBytes } from "node:crypto";

import { hash } from "bcryptjs";
import {
  DecisionType,
  ExternalPublicationTarget,
  FeedbackType,
  IssueStatus,
  Prisma,
  ProjectType,
  ProposalStatus,
  SubmissionStatus,
  UserRole,
  VoteValue
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  buildExternalReadinessChecklist,
  buildProjectChecklist,
  buildProposalChecklist,
  createPublicationSlug,
  getPrimaryLaneTag,
  getSuggestedProjectStatus,
  getSuggestedProposalStatus,
  projectTypeToPublicationType
} from "@/lib/publications";
import { prisma } from "@/lib/prisma";
import { parseRuleDiff } from "@/lib/rules";
import type { ReferenceEntry } from "@/lib/types";
import { parseJsonText, parseStringList } from "@/lib/utils";
import { requireAdmin, requireUser } from "@/server/auth";
import {
  snapshotProjectRevision,
  snapshotProposalRevision,
  syncProjectPublication,
  syncProposalPublication
} from "@/server/publications";
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
  abstract: z.string().min(12),
  essentialQuestion: z.string().min(8),
  methodsSummary: z.string().min(8),
  projectType: z.nativeEnum(ProjectType),
  lanePrimary: z.string().min(1),
  findingsMd: z.string().optional().default("")
});

const proposalSchema = z.object({
  title: z.string().min(5),
  issueId: z.string().min(1),
  ruleSetId: z.string().min(1),
  abstract: z.string().min(12),
  currentRuleContext: z.string().min(10),
  problem: z.string().min(10),
  proposedChange: z.string().min(10),
  expectedImpact: z.string().min(10),
  tradeoffs: z.string().min(10),
  sandboxInterpretation: z.string().min(10),
  recommendation: z.string().min(10),
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

const studentAccountSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  linkedTeamId: z.string().trim().optional().nullable()
});

const studentActivationSchema = z
  .object({
    token: z.string().min(20),
    password: z.string().min(8),
    confirmPassword: z.string().min(8)
  })
  .refine((input) => input.password === input.confirmPassword, {
    message: "Passwords must match.",
    path: ["confirmPassword"]
  });

const studentAccountsAnchor = "#student-accounts";

function redirectToStudentAccounts(status: string): never {
  redirect(`/admin?studentAccount=${encodeURIComponent(status)}${studentAccountsAnchor}`);
}

function redirectToStudentActivation(token: string, status: string): never {
  redirect(`/activate/${encodeURIComponent(token)}?status=${encodeURIComponent(status)}`);
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function parseArtifactLinks(lines: string[]) {
  const links: Array<{ label: string; url: string }> = [];

  for (const line of lines) {
    const [label, url] = line.split("|").map((value) => value.trim());
    if (!label || !url) {
      continue;
    }

    links.push({ label, url });
  }

  return links;
}

function parseReferences(lines: string[]) {
  const references: ReferenceEntry[] = [];

  for (const line of lines) {
    const [label, url, sourceType, note] = line.split("|").map((value) => value.trim());
    if (!label || !url) {
      continue;
    }

    references.push({
      label,
      url,
      sourceType: (sourceType || "OTHER") as ReferenceEntry["sourceType"],
      note: note || undefined
    });
  }

  return references;
}

function parseKeywords(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function parseTakeaways(value: FormDataEntryValue | null) {
  return parseStringList(value).slice(0, 6);
}

function parseOptionalDate(value: FormDataEntryValue | null) {
  if (!value || typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  return new Date(value);
}

function normalizeSubmissionTimestamps(status: SubmissionStatus, previous?: SubmissionStatus) {
  const now = new Date();

  return {
    submittedAt: status === SubmissionStatus.SUBMITTED && previous !== SubmissionStatus.SUBMITTED ? now : undefined,
    revisionRequestedAt:
      status === SubmissionStatus.REVISION_REQUESTED && previous !== SubmissionStatus.REVISION_REQUESTED
        ? now
        : undefined,
    approvedForInternalPublicationAt:
      status === SubmissionStatus.APPROVED_FOR_INTERNAL_PUBLICATION &&
      previous !== SubmissionStatus.APPROVED_FOR_INTERNAL_PUBLICATION
        ? now
        : undefined,
    publishedInternalAt:
      status === SubmissionStatus.PUBLISHED_INTERNAL && previous !== SubmissionStatus.PUBLISHED_INTERNAL
        ? now
        : undefined,
    markedExternalReadyAt:
      status === SubmissionStatus.MARKED_EXTERNAL_READY && previous !== SubmissionStatus.MARKED_EXTERNAL_READY
        ? now
        : undefined,
    approvedForExternalPublicationAt:
      status === SubmissionStatus.APPROVED_FOR_EXTERNAL_PUBLICATION &&
      previous !== SubmissionStatus.APPROVED_FOR_EXTERNAL_PUBLICATION
        ? now
        : undefined
  };
}

function normalizeProposalTimestamps(status: ProposalStatus, previous?: ProposalStatus) {
  const now = new Date();

  return {
    submittedAt: status === ProposalStatus.SUBMITTED && previous !== ProposalStatus.SUBMITTED ? now : undefined,
    revisionRequestedAt:
      status === ProposalStatus.REVISION_REQUESTED && previous !== ProposalStatus.REVISION_REQUESTED
        ? now
        : undefined,
    approvedForInternalPublicationAt:
      status === ProposalStatus.APPROVED_FOR_INTERNAL_PUBLICATION &&
      previous !== ProposalStatus.APPROVED_FOR_INTERNAL_PUBLICATION
        ? now
        : undefined,
    readyForVotingAt:
      status === ProposalStatus.READY_FOR_VOTING && previous !== ProposalStatus.READY_FOR_VOTING
        ? now
        : undefined,
    publishedInternalAt:
      status === ProposalStatus.PUBLISHED_INTERNAL && previous !== ProposalStatus.PUBLISHED_INTERNAL
        ? now
        : undefined,
    markedExternalReadyAt:
      status === ProposalStatus.MARKED_EXTERNAL_READY && previous !== ProposalStatus.MARKED_EXTERNAL_READY
        ? now
        : undefined,
    approvedForExternalPublicationAt:
      status === ProposalStatus.APPROVED_FOR_EXTERNAL_PUBLICATION &&
      previous !== ProposalStatus.APPROVED_FOR_EXTERNAL_PUBLICATION
        ? now
        : undefined
  };
}

function projectMarkdownFromSections(input: {
  overview: string;
  evidence: string;
  analysis: string;
  recommendations: string;
}) {
  return [
    "## Overview",
    input.overview,
    "",
    "## Evidence",
    input.evidence,
    "",
    "## Analysis",
    input.analysis,
    "",
    "## Recommendations",
    input.recommendations
  ].join("\n");
}

async function saveProjectRecord(params: {
  formData: FormData;
  actor: Awaited<ReturnType<typeof requireUser>>;
  projectId?: string;
}) {
  const parsed = projectSchema.parse({
    title: params.formData.get("title"),
    summary: params.formData.get("summary"),
    abstract: params.formData.get("abstract"),
    essentialQuestion: params.formData.get("essentialQuestion"),
    methodsSummary: params.formData.get("methodsSummary"),
    projectType: params.formData.get("projectType"),
    lanePrimary: params.formData.get("lanePrimary"),
    findingsMd: params.formData.get("findingsMd")
  });

  const existing = params.projectId
    ? await prisma.project.findUnique({
        where: { id: params.projectId },
        include: {
          issueLinks: true,
          collaborators: true
        }
      })
    : null;

  if (existing && existing.createdByUserId !== params.actor.id && params.actor.role !== "ADMIN") {
    redirect(`/projects/${existing.id}`);
  }

  const intent = String(params.formData.get("intent") ?? "DRAFT");
  const issueIds = params.formData.getAll("issueIds").map(String).filter(Boolean);
  const collaboratorIds = params.formData.getAll("collaboratorIds").map(String).filter(Boolean);
  const lanePrimary = parsed.lanePrimary as Parameters<typeof getPrimaryLaneTag>[0][number];
  const laneTags = Array.from(new Set([...params.formData.getAll("laneTags").map(String).filter(Boolean), lanePrimary]));
  const teamId = String(params.formData.get("teamId") ?? "").trim() || null;
  const supportingProposalId = String(params.formData.get("supportingProposalId") ?? "").trim() || null;
  const artifactLinks = parseArtifactLinks(parseStringList(params.formData.get("artifactLinks")));
  const references = parseReferences(parseStringList(params.formData.get("references")));
  const keywords = parseKeywords(params.formData.get("keywords"));
  const keyTakeaways = parseTakeaways(params.formData.get("keyTakeaways"));
  const laneSectionKeys = parseStringList(params.formData.get("laneSectionKeys"));
  const overview = String(params.formData.get("overview") ?? parsed.summary).trim();
  const context = String(params.formData.get("context") ?? "").trim();
  const evidence = String(params.formData.get("evidence") ?? "").trim();
  const analysis = String(params.formData.get("analysis") ?? "").trim();
  const recommendations = String(params.formData.get("recommendations") ?? "").trim();
  const reflection = String(params.formData.get("reflection") ?? "").trim();
  const content = {
    overview,
    questionOrMission: parsed.essentialQuestion,
    context,
    evidence,
    analysis,
    recommendations,
    laneSections: laneSectionKeys.map((key) => ({
      key,
      title: String(params.formData.get(`laneSectionTitle_${key}`) ?? "").trim(),
      prompt: String(params.formData.get(`laneSectionPrompt_${key}`) ?? "").trim(),
      value: String(params.formData.get(`laneSectionValue_${key}`) ?? "").trim()
    })),
    artifacts: artifactLinks,
    reflection
  };
  const publicationType = projectTypeToPublicationType(parsed.projectType, lanePrimary);
  const submissionStatus = getSuggestedProjectStatus(intent);
  const checklist = buildProjectChecklist(
    {
      title: parsed.title,
      abstract: parsed.abstract,
      essentialQuestion: parsed.essentialQuestion,
      content,
      references,
      keywords
    },
    lanePrimary
  );
  const externalChecklist = buildExternalReadinessChecklist({
    title: parsed.title,
    abstract: parsed.abstract,
    slug: String(params.formData.get("publicationSlug") ?? existing?.publicationSlug ?? "").trim(),
    references,
    keywords,
    requiredSections: [
      { label: "Overview", value: content.overview },
      { label: "Evidence", value: content.evidence },
      { label: "Analysis", value: content.analysis },
      { label: "Recommendations", value: content.recommendations }
    ]
  });
  const findingsMd = parsed.findingsMd.trim().length > 0
    ? parsed.findingsMd
    : projectMarkdownFromSections({ overview, evidence, analysis, recommendations });
  const publicationVersion =
    existing && existing.publishedInternalAt ? existing.publicationVersion + 1 : existing?.publicationVersion ?? 1;
  const timestampFields = normalizeSubmissionTimestamps(submissionStatus, existing?.submissionStatus);

  if (existing) {
    await snapshotProjectRevision({
      projectId: existing.id,
      actorUserId: params.actor.id
    });
  }

  const project = existing
    ? await prisma.project.update({
        where: { id: existing.id },
        data: {
          title: parsed.title,
          summary: parsed.summary,
          abstract: parsed.abstract,
          essentialQuestion: parsed.essentialQuestion,
          methodsSummary: parsed.methodsSummary,
          projectType: parsed.projectType,
          submissionStatus,
          publicationType,
          lanePrimary,
          laneTagsJson: asJson(laneTags),
          artifactLinksJson: asJson(artifactLinks),
          issueId: issueIds[0] ?? null,
          teamId,
          supportingProposalId,
          findingsMd,
          contentJson: asJson(content),
          reviewChecklistJson: asJson([...checklist, ...externalChecklist]),
          keyTakeawaysJson: asJson(keyTakeaways),
          referencesJson: asJson(references),
          keywordsJson: asJson(keywords),
          publicationSummary: overview,
          publicationSlug:
            String(params.formData.get("publicationSlug") ?? "").trim() ||
            existing.publicationSlug ||
            createPublicationSlug(parsed.title, existing.id),
          publicationVersion,
          ...timestampFields,
          issueLinks: {
            deleteMany: {},
            create: issueIds.map((issueId) => ({
              issueId
            }))
          },
          collaborators: {
            deleteMany: {},
            create: collaboratorIds.map((userId) => ({
              userId
            }))
          }
        }
      })
    : await prisma.project.create({
        data: {
          title: parsed.title,
          summary: parsed.summary,
          abstract: parsed.abstract,
          essentialQuestion: parsed.essentialQuestion,
          methodsSummary: parsed.methodsSummary,
          projectType: parsed.projectType,
          submissionStatus,
          publicationType,
          lanePrimary,
          laneTagsJson: asJson(laneTags),
          artifactLinksJson: asJson(artifactLinks),
          issueId: issueIds[0] ?? null,
          teamId,
          supportingProposalId,
          findingsMd,
          contentJson: asJson(content),
          reviewChecklistJson: asJson([...checklist, ...externalChecklist]),
          keyTakeawaysJson: asJson(keyTakeaways),
          referencesJson: asJson(references),
          keywordsJson: asJson(keywords),
          publicationSummary: overview,
          publicationSlug: String(params.formData.get("publicationSlug") ?? "").trim() || null,
          publicationVersion: 1,
          createdByUserId: params.actor.id,
          ...timestampFields,
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

  await syncProjectPublication({
    projectId: project.id,
    actorUserId: params.actor.id
  });

  return {
    project,
    issueIds,
    teamId,
    submissionStatus
  };
}

async function saveProposalRecord(params: {
  formData: FormData;
  actor: Awaited<ReturnType<typeof requireUser>>;
  proposalId?: string;
}) {
  const parsed = proposalSchema.parse({
    title: params.formData.get("title"),
    issueId: params.formData.get("issueId"),
    ruleSetId: params.formData.get("ruleSetId"),
    abstract: params.formData.get("abstract"),
    currentRuleContext: params.formData.get("currentRuleContext"),
    problem: params.formData.get("problem"),
    proposedChange: params.formData.get("proposedChange"),
    expectedImpact: params.formData.get("expectedImpact"),
    tradeoffs: params.formData.get("tradeoffs"),
    sandboxInterpretation: params.formData.get("sandboxInterpretation"),
    recommendation: params.formData.get("recommendation"),
    diffJson: params.formData.get("diffJson")
  });

  const existing = params.proposalId
    ? await prisma.proposal.findUnique({
        where: { id: params.proposalId }
      })
    : null;

  if (existing && existing.createdByUserId !== params.actor.id && params.actor.role !== "ADMIN") {
    redirect(`/proposals/${existing.id}`);
  }

  const diff = parseRuleDiff(parseJsonText(parsed.diffJson, { changes: [] }));
  const sandboxResultJson = parseJsonText(params.formData.get("sandboxResultJson"), null);
  const references = parseReferences(parseStringList(params.formData.get("references")));
  const keywords = parseKeywords(params.formData.get("keywords"));
  const keyTakeaways = parseTakeaways(params.formData.get("keyTakeaways"));
  const content = {
    problem: parsed.problem,
    currentRuleContext: parsed.currentRuleContext,
    proposedChange: parsed.proposedChange,
    impactAnalysis: parsed.expectedImpact,
    tradeoffs: parsed.tradeoffs,
    sandboxInterpretation: parsed.sandboxInterpretation,
    recommendation: parsed.recommendation
  };
  const status = getSuggestedProposalStatus(String(params.formData.get("intent") ?? "DRAFT"));
  const checklist = buildProposalChecklist({
    title: parsed.title,
    abstract: parsed.abstract,
    content,
    references,
    keywords,
    sandboxInterpretationSaved: Boolean(sandboxResultJson)
  });
  const externalChecklist = buildExternalReadinessChecklist({
    title: parsed.title,
    abstract: parsed.abstract,
    slug: String(params.formData.get("publicationSlug") ?? existing?.publicationSlug ?? "").trim(),
    references,
    keywords,
    requiredSections: [
      { label: "Problem", value: content.problem },
      { label: "Current rule context", value: content.currentRuleContext },
      { label: "Impact analysis", value: content.impactAnalysis },
      { label: "Recommendation", value: content.recommendation }
    ]
  });
  const timestampFields = normalizeProposalTimestamps(status, existing?.status);

  if (existing) {
    await snapshotProposalRevision({
      proposalId: existing.id,
      actorUserId: params.actor.id
    });
  }

  const proposal = existing
    ? await prisma.proposal.update({
        where: { id: existing.id },
        data: {
          title: parsed.title,
          issueId: parsed.issueId,
          status,
          ruleSetIdTarget: parsed.ruleSetId,
          diffJson: asJson(diff),
          narrativeJson: asJson({
            problem: parsed.problem,
            proposedChange: parsed.proposedChange,
            expectedImpact: parsed.expectedImpact,
            tradeoffs: parsed.tradeoffs
          }),
          contentJson: asJson(content),
          reviewChecklistJson: asJson([...checklist, ...externalChecklist]),
          sandboxResultJson: sandboxResultJson ? asJson(sandboxResultJson) : Prisma.JsonNull,
          abstract: parsed.abstract,
          methodsSummary:
            String(params.formData.get("methodsSummary") ?? "").trim() ||
            "Compared the active RuleSet to the proposed RuleSet using the BOW sandbox model.",
          keyTakeawaysJson: asJson(keyTakeaways),
          referencesJson: asJson(references),
          keywordsJson: asJson(keywords),
          publicationSummary: content.recommendation,
          publicationSlug:
            String(params.formData.get("publicationSlug") ?? "").trim() ||
            existing.publicationSlug ||
            createPublicationSlug(parsed.title, existing.id),
          publicationVersion:
            existing.publishedInternalAt ? existing.publicationVersion + 1 : existing.publicationVersion,
          ...timestampFields
        }
      })
    : await prisma.proposal.create({
        data: {
          title: parsed.title,
          issueId: parsed.issueId,
          createdByUserId: params.actor.id,
          status,
          ruleSetIdTarget: parsed.ruleSetId,
          diffJson: asJson(diff),
          narrativeJson: asJson({
            problem: parsed.problem,
            proposedChange: parsed.proposedChange,
            expectedImpact: parsed.expectedImpact,
            tradeoffs: parsed.tradeoffs
          }),
          contentJson: asJson(content),
          reviewChecklistJson: asJson([...checklist, ...externalChecklist]),
          sandboxResultJson: sandboxResultJson ? asJson(sandboxResultJson) : undefined,
          abstract: parsed.abstract,
          methodsSummary:
            String(params.formData.get("methodsSummary") ?? "").trim() ||
            "Compared the active RuleSet to the proposed RuleSet using the BOW sandbox model.",
          keyTakeawaysJson: asJson(keyTakeaways),
          referencesJson: asJson(references),
          keywordsJson: asJson(keywords),
          publicationSummary: content.recommendation,
          publicationSlug: String(params.formData.get("publicationSlug") ?? "").trim() || null,
          ...timestampFields
        }
      });

  await syncProposalPublication({
    proposalId: proposal.id,
    actorUserId: params.actor.id
  });

  return {
    proposal,
    status
  };
}

export async function completeOnboardingAction() {
  const viewer = await requireUser();
  await prisma.user.update({
    where: { id: viewer.id },
    data: { onboardingCompletedAt: new Date() }
  });
  revalidatePath("/");
}

export async function createProjectAction(formData: FormData) {
  const viewer = await requireUser();
  const projectId = String(formData.get("projectId") ?? "").trim() || undefined;
  const { project, issueIds, teamId, submissionStatus } = await saveProjectRecord({
    formData,
    actor: viewer,
    projectId
  });

  await createActivityEvent(prisma, {
    type: "project",
    title: `${submissionStatus === SubmissionStatus.SUBMITTED ? "Submitted" : "Saved"} project: ${project.title}`,
    summary: `${viewer.name} updated a studio project in the BOW Universe research workspace.`,
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
  const proposalId = String(formData.get("proposalId") ?? "").trim() || undefined;
  const { proposal, status } = await saveProposalRecord({
    formData,
    actor: viewer,
    proposalId
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

export async function updateProjectAction(formData: FormData) {
  const viewer = await requireUser();
  const projectId = String(formData.get("projectId") ?? "").trim();

  if (!projectId) {
    return;
  }

  const { project, submissionStatus } = await saveProjectRecord({
    formData,
    actor: viewer,
    projectId
  });

  await createActivityEvent(prisma, {
    type: "project",
    title: `Updated project: ${project.title}`,
    summary: `${viewer.name} revised a project and moved it to ${submissionStatus.replaceAll("_", " ").toLowerCase()}.`,
    entityType: "Project",
    entityId: project.id,
    createdByUserId: viewer.id,
    metadata: {
      submissionStatus
    }
  });

  revalidatePath("/projects");
  revalidatePath("/research");
  revalidatePath(`/projects/${project.id}`);
  redirect(`/projects/${project.id}`);
}

export async function updateProposalAction(formData: FormData) {
  const viewer = await requireUser();
  const proposalId = String(formData.get("proposalId") ?? "").trim();

  if (!proposalId) {
    return;
  }

  const { proposal, status } = await saveProposalRecord({
    formData,
    actor: viewer,
    proposalId
  });

  await createActivityEvent(prisma, {
    type: "proposal",
    title: `Updated proposal: ${proposal.title}`,
    summary: `${viewer.name} revised a proposal memo and moved it to ${status.replaceAll("_", " ").toLowerCase()}.`,
    entityType: "Proposal",
    entityId: proposal.id,
    createdByUserId: viewer.id,
    metadata: {
      status
    }
  });

  revalidatePath("/proposals");
  revalidatePath("/research");
  revalidatePath(`/proposals/${proposal.id}`);
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

export async function saveProjectFeedbackAction(formData: FormData) {
  const viewer = await requireUser();
  const projectId = String(formData.get("projectId") ?? "").trim();
  const sectionKey = String(formData.get("sectionKey") ?? "").trim() || "general";
  const feedbackType = String(formData.get("feedbackType") ?? "CLARITY") as FeedbackType;
  const body = String(formData.get("body") ?? "").trim();

  if (!projectId || !body || !Object.values(FeedbackType).includes(feedbackType)) {
    return;
  }

  await prisma.projectFeedback.create({
    data: {
      projectId,
      sectionKey,
      feedbackType,
      body,
      createdByUserId: viewer.id
    }
  });

  revalidatePath(`/projects/${projectId}`);
}

export async function saveProposalFeedbackAction(formData: FormData) {
  const viewer = await requireUser();
  const proposalId = String(formData.get("proposalId") ?? "").trim();
  const sectionKey = String(formData.get("sectionKey") ?? "").trim() || "general";
  const feedbackType = String(formData.get("feedbackType") ?? "CLARITY") as FeedbackType;
  const body = String(formData.get("body") ?? "").trim();

  if (!proposalId || !body || !Object.values(FeedbackType).includes(feedbackType)) {
    return;
  }

  await prisma.proposalFeedback.create({
    data: {
      proposalId,
      sectionKey,
      feedbackType,
      body,
      createdByUserId: viewer.id
    }
  });

  revalidatePath(`/proposals/${proposalId}`);
}

export async function reviewProjectAction(formData: FormData) {
  const viewer = await requireAdmin();
  const projectId = String(formData.get("projectId") ?? "").trim();
  const submissionStatus = String(formData.get("submissionStatus") ?? "") as SubmissionStatus;

  if (!projectId || !Object.values(SubmissionStatus).includes(submissionStatus)) {
    return;
  }

  const existing = await prisma.project.findUnique({
    where: { id: projectId }
  });

  if (!existing) {
    return;
  }

  await snapshotProjectRevision({
    projectId,
    actorUserId: viewer.id
  });

  await prisma.project.update({
    where: { id: projectId },
    data: {
      submissionStatus,
      ...normalizeSubmissionTimestamps(submissionStatus, existing.submissionStatus),
      publicationSlug: existing.publicationSlug || createPublicationSlug(existing.title, existing.id)
    }
  });

  await syncProjectPublication({
    projectId,
    actorUserId: viewer.id
  });

  await createActivityEvent(prisma, {
    type: "project",
    title: `Project review state: ${submissionStatus.replaceAll("_", " ")}`,
    summary: `${viewer.name} updated a project review status.`,
    entityType: "Project",
    entityId: projectId,
    createdByUserId: viewer.id,
    metadata: {
      submissionStatus
    }
  });

  revalidatePath("/admin");
  revalidatePath("/admin/publications");
  revalidatePath("/projects");
  revalidatePath("/research");
  revalidatePath(`/projects/${projectId}`);
}

export async function reviewProposalAction(formData: FormData) {
  const viewer = await requireAdmin();
  const proposalId = String(formData.get("proposalId") ?? "").trim();
  const status = String(formData.get("status") ?? "") as ProposalStatus;

  if (!proposalId || !Object.values(ProposalStatus).includes(status)) {
    return;
  }

  const existing = await prisma.proposal.findUnique({
    where: { id: proposalId }
  });

  if (!existing) {
    return;
  }

  await snapshotProposalRevision({
    proposalId,
    actorUserId: viewer.id
  });

  await prisma.proposal.update({
    where: { id: proposalId },
    data: {
      status,
      publicationSlug: existing.publicationSlug || createPublicationSlug(existing.title, existing.id),
      ...normalizeProposalTimestamps(status, existing.status)
    }
  });

  await syncProposalPublication({
    proposalId,
    actorUserId: viewer.id
  });

  await createActivityEvent(prisma, {
    type: "proposal",
    title: `Proposal review state: ${status.replaceAll("_", " ")}`,
    summary: `${viewer.name} updated a proposal review status.`,
    entityType: "Proposal",
    entityId: proposalId,
    createdByUserId: viewer.id,
    metadata: {
      status
    }
  });

  revalidatePath("/admin");
  revalidatePath("/admin/publications");
  revalidatePath("/proposals");
  revalidatePath("/research");
  revalidatePath(`/proposals/${proposalId}`);
}

export async function updatePublicationExportAction(formData: FormData) {
  const viewer = await requireAdmin();
  const publicationId = String(formData.get("publicationId") ?? "").trim();
  const target = String(formData.get("target") ?? "").trim() as ExternalPublicationTarget;
  const status = String(formData.get("status") ?? "").trim();
  const artifactUrl = String(formData.get("artifactUrl") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!publicationId || !Object.values(ExternalPublicationTarget).includes(target) || status.length < 2) {
    return;
  }

  const publication = await prisma.publication.findUnique({
    where: { id: publicationId }
  });

  if (!publication) {
    return;
  }

  await prisma.publicationExport.upsert({
    where: {
      publicationId_target: {
        publicationId,
        target
      }
    },
    update: {
      status,
      artifactUrl: artifactUrl || null,
      notes: notes || null,
      generatedAt:
        status === "GENERATED" || status === "READY" || status === "PUBLISHED" ? new Date() : null
    },
    create: {
      publicationId,
      target,
      status,
      artifactUrl: artifactUrl || null,
      notes: notes || null,
      generatedAt:
        status === "GENERATED" || status === "READY" || status === "PUBLISHED" ? new Date() : null
    }
  });

  await createActivityEvent(prisma, {
    type: "publication",
    title: `Updated ${target} export queue`,
    summary: `${viewer.name} changed the ${target.toLowerCase()} export status for ${publication.title}.`,
    entityType: "Publication",
    entityId: publicationId,
    createdByUserId: viewer.id,
    metadata: {
      target,
      status,
      artifactUrl: artifactUrl || null
    }
  });

  revalidatePath("/admin");
  revalidatePath("/admin/publications");
  revalidatePath("/research");
  revalidatePath(`/research/${publication.slug}`);
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
  revalidatePath("/admin/publications");
  revalidatePath("/proposals");
  revalidatePath(`/proposals/${proposalId}`);
}

export async function updateUserRoleAction(formData: FormData) {
  const viewer = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "") as UserRole;
  const linkedTeamIdInput = String(formData.get("linkedTeamId") ?? "").trim();

  if (!userId || !Object.values(UserRole).includes(role)) {
    return;
  }

  if (linkedTeamIdInput) {
    const linkedTeam = await prisma.team.findUnique({
      where: { id: linkedTeamIdInput },
      select: { id: true }
    });

    if (!linkedTeam) {
      return;
    }
  }

  const nextLinkedTeamId = role === UserRole.STUDENT ? linkedTeamIdInput || null : null;

  await prisma.user.update({
    where: { id: userId },
    data: {
      role,
      linkedTeamId: nextLinkedTeamId
    }
  });

  await createActivityEvent(prisma, {
    type: "user",
    title: `Updated user role`,
    summary: `${viewer.name} changed a user role to ${role}${nextLinkedTeamId ? " and updated the linked team." : "."}`,
    entityType: "User",
    entityId: userId,
    createdByUserId: viewer.id,
    metadata: {
      role,
      linkedTeamId: nextLinkedTeamId
    }
  });

  revalidatePath("/admin");
}

export async function createStudentAccountAction(formData: FormData) {
  const viewer = await requireAdmin();
  const parsed = studentAccountSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    linkedTeamId: formData.get("linkedTeamId")
  });

  if (!parsed.success) {
    redirectToStudentAccounts("invalid");
  }

  const { data } = parsed;
  const email = data.email.toLowerCase();
  const linkedTeamId = data.linkedTeamId || null;

  if (linkedTeamId) {
    const linkedTeam = await prisma.team.findUnique({
      where: { id: linkedTeamId },
      select: { id: true }
    });

    if (!linkedTeam) {
      redirectToStudentAccounts("team-missing");
    }
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true }
  });

  if (existingUser) {
    redirectToStudentAccounts("email-taken");
  }

  const activationToken = randomBytes(24).toString("hex");
  const placeholderPasswordHash = await hash(randomBytes(32).toString("hex"), 10);
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  const createdStudent = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: data.name,
        email,
        passwordHash: placeholderPasswordHash,
        role: UserRole.STUDENT,
        linkedTeamId,
        commissionerId: viewer.id
      }
    });

    await tx.studentInvite.create({
      data: {
        token: activationToken,
        userId: user.id,
        createdByUserId: viewer.id,
        expiresAt
      }
    });

    await createActivityEvent(tx, {
      type: "user",
      title: `Created student account for ${user.name}`,
      summary: `${viewer.name} created a new student account${linkedTeamId ? " and linked it to a team." : "."}`,
      entityType: "User",
      entityId: user.id,
      createdByUserId: viewer.id,
      metadata: {
        email,
        linkedTeamId,
        expiresAt
      }
    });

    return user;
  });

  revalidatePath("/admin");
  revalidatePath("/login");
  redirect(
    `/admin?studentAccount=created&studentEmail=${encodeURIComponent(createdStudent.email)}${studentAccountsAnchor}`
  );
}

export async function activateStudentInviteAction(formData: FormData) {
  const parsed = studentActivationSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword")
  });

  const token = String(formData.get("token") ?? "");

  if (!parsed.success) {
    redirectToStudentActivation(token, "invalid");
  }

  const { data } = parsed;
  const invite = await prisma.studentInvite.findUnique({
    where: { token: data.token },
    include: {
      user: true
    }
  });

  if (!invite) {
    redirect("/login");
  }

  if (invite.usedAt) {
    redirectToStudentActivation(invite.token, "used");
  }

  if (invite.expiresAt.getTime() < Date.now()) {
    redirectToStudentActivation(invite.token, "expired");
  }

  const passwordHash = await hash(data.password, 10);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: invite.userId },
      data: {
        passwordHash
      }
    });

    await tx.studentInvite.update({
      where: { id: invite.id },
      data: {
        usedAt: new Date()
      }
    });

    await createActivityEvent(tx, {
      type: "user",
      title: `Activated student account for ${invite.user.name}`,
      summary: `${invite.user.name} activated a commissioner-created student account.`,
      entityType: "User",
      entityId: invite.userId,
      createdByUserId: invite.userId,
      metadata: {
        inviteId: invite.id
      }
    });
  });

  revalidatePath("/admin");
  revalidatePath("/login");
  redirect(`/login?email=${encodeURIComponent(invite.user.email)}&activated=1`);
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

  const existing = await prisma.proposal.findUnique({
    where: { id: proposalId }
  });

  if (!existing) {
    return;
  }

  await snapshotProposalRevision({
    proposalId,
    actorUserId: viewer.id
  });

  await prisma.proposal.update({
    where: { id: proposalId },
    data: {
      status,
      ...normalizeProposalTimestamps(status, existing.status),
      voteStart: status === ProposalStatus.VOTING ? voteStart ?? new Date() : null,
      voteEnd:
        status === ProposalStatus.VOTING
          ? voteEnd ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          : status === ProposalStatus.DECISION
            ? new Date()
            : null
    }
  });

  await syncProposalPublication({
    proposalId,
    actorUserId: viewer.id
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
  revalidatePath("/admin/publications");
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
  revalidatePath("/chronicle");
}

const saveSandboxScenarioSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  diffJson: z.string().min(2),
  resultJson: z.string().min(2).optional(),
  ruleSetId: z.string().min(1),
  isPublic: z.boolean().default(false)
});

export async function saveSandboxScenarioAction(formData: FormData) {
  const viewer = await requireUser();
  const raw = {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? "") || undefined,
    diffJson: String(formData.get("diffJson") ?? ""),
    resultJson: String(formData.get("resultJson") ?? "") || undefined,
    ruleSetId: String(formData.get("ruleSetId") ?? ""),
    isPublic: formData.get("isPublic") === "true"
  };

  const parsed = saveSandboxScenarioSchema.parse(raw);

  await prisma.sandboxScenario.create({
    data: {
      name: parsed.name,
      description: parsed.description ?? null,
      diffJson: JSON.parse(parsed.diffJson) as Prisma.InputJsonValue,
      resultJson: parsed.resultJson
        ? (JSON.parse(parsed.resultJson) as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      ruleSetId: parsed.ruleSetId,
      createdByUserId: viewer.id,
      isPublic: parsed.isPublic
    }
  });

  revalidatePath("/sandbox");
}

export async function deleteSandboxScenarioAction(formData: FormData) {
  const viewer = await requireUser();
  const scenarioId = String(formData.get("scenarioId") ?? "");
  if (!scenarioId) return;

  const scenario = await prisma.sandboxScenario.findUnique({ where: { id: scenarioId } });
  if (!scenario || scenario.createdByUserId !== viewer.id) {
    throw new Error("Not authorized to delete this scenario.");
  }

  await prisma.sandboxScenario.delete({ where: { id: scenarioId } });
  revalidatePath("/sandbox");
}

export async function updateSandboxScenarioAction(formData: FormData) {
  const viewer = await requireUser();
  const scenarioId = String(formData.get("scenarioId") ?? "");
  if (!scenarioId) return;

  const scenario = await prisma.sandboxScenario.findUnique({ where: { id: scenarioId } });
  if (!scenario || scenario.createdByUserId !== viewer.id) {
    throw new Error("Not authorized to update this scenario.");
  }

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const isPublic = formData.get("isPublic") === "true";

  await prisma.sandboxScenario.update({
    where: { id: scenarioId },
    data: { name: name || scenario.name, description, isPublic }
  });

  revalidatePath("/sandbox");
}
