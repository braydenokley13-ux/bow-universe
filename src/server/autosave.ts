import {
  ProjectArtifactFocus,
  ProjectDeliverableKey,
  ProjectMilestoneKey,
  ProjectScale,
  ProjectType,
  ProposalStatus,
  PublicationType,
  SubmissionStatus
} from "@prisma/client";
import { Prisma } from "@prisma/client";

import {
  buildProjectCampaignAssessment,
  getArtifactFocusForProjectType,
  getLaneForArtifactFocus,
  getProjectTypeForArtifactFocus
} from "@/lib/project-campaign";
import { getPrimaryLaneTag, projectTypeToPublicationType } from "@/lib/publications";
import { buildProjectIssueLinkCreates, resolveProjectPrimaryIssueId } from "@/lib/project-issues";
import { prisma } from "@/lib/prisma";
import type { LaneTag, ReferenceEntry } from "@/lib/types";
import { parseJsonText, parseStringList } from "@/lib/utils";
import { canUserEditProjectDraft } from "@/server/project-access";
import {
  syncProjectAiCampaignState,
} from "@/server/ai/service";
import {
  createProjectCampaignProgressEvent,
  syncProjectCampaignState
} from "@/server/project-campaign";
import { syncProjectStudentOutcomes, syncProposalStudentOutcomes } from "@/server/student-outcomes";

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

function parseProjectType(value: string | null | undefined) {
  if (!value || !Object.values(ProjectType).includes(value as ProjectType)) {
    return ProjectType.INVESTIGATION;
  }

  return value as ProjectType;
}

function parseProjectScale(
  value: string | null | undefined,
  fallback: ProjectScale = ProjectScale.FIRST_PROJECT
) {
  if (!value || !Object.values(ProjectScale).includes(value as ProjectScale)) {
    return fallback;
  }

  return value as ProjectScale;
}

function parseArtifactFocus(value: string | null | undefined, fallbackProjectType: ProjectType) {
  if (value && Object.values(ProjectArtifactFocus).includes(value as ProjectArtifactFocus)) {
    return value as ProjectArtifactFocus;
  }

  return getArtifactFocusForProjectType(fallbackProjectType);
}

function parseLanePrimary(value: string | null | undefined, projectType: ProjectType, laneTags: string[]) {
  const validLane = value as LaneTag | undefined;
  if (
    validLane &&
    ["TOOL_BUILDERS", "POLICY_REFORM_ARCHITECTS", "STRATEGIC_OPERATORS", "ECONOMIC_INVESTIGATORS"].includes(validLane)
  ) {
    return validLane;
  }

  return getPrimaryLaneTag(laneTags as LaneTag[], projectType);
}

function parseOptionalDate(value: FormDataEntryValue | null) {
  if (!value || typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  return new Date(value);
}

function parseCampaignDeliverables(formData: FormData) {
  return Object.values(ProjectDeliverableKey).map((key) => ({
    key,
    contentMd: String(formData.get(`deliverableContent_${key}`) ?? "").trim(),
    artifactUrl: String(formData.get(`deliverableArtifactUrl_${key}`) ?? "").trim() || null
  }));
}

function parseCampaignMilestones(formData: FormData) {
  return Object.values(ProjectMilestoneKey)
    .map((key) => {
      const targetDate = parseOptionalDate(formData.get(`milestoneTargetDate_${key}`));

      if (!targetDate) {
        return null;
      }

      return {
        key,
        targetDate,
        completionNote: String(formData.get(`milestoneCompletionNote_${key}`) ?? "").trim() || null
      };
    })
    .filter(Boolean) as Array<{
    key: ProjectMilestoneKey;
    targetDate: Date;
    completionNote: string | null;
  }>;
}

function parseProjectContent(formData: FormData, summary: string, essentialQuestion: string) {
  const artifactLinks = parseArtifactLinks(parseStringList(formData.get("artifactLinks")));
  const laneSectionKeys = parseStringList(formData.get("laneSectionKeys"));

  return {
    overview: String(formData.get("overview") ?? summary).trim(),
    questionOrMission: essentialQuestion,
    context: String(formData.get("context") ?? "").trim(),
    evidence: String(formData.get("evidence") ?? "").trim(),
    analysis: String(formData.get("analysis") ?? "").trim(),
    recommendations: String(formData.get("recommendations") ?? "").trim(),
    laneSections: laneSectionKeys.map((key) => ({
      key,
      title: String(formData.get(`laneSectionTitle_${key}`) ?? "").trim(),
      prompt: String(formData.get(`laneSectionPrompt_${key}`) ?? "").trim(),
      value: String(formData.get(`laneSectionValue_${key}`) ?? "").trim()
    })),
    artifacts: artifactLinks,
    reflection: String(formData.get("reflection") ?? "").trim()
  };
}

export async function autosaveProjectDraft(params: {
  formData: FormData;
  actorUserId: string;
  actorRole: "STUDENT" | "ADMIN";
}) {
  const projectId = String(params.formData.get("projectId") ?? "").trim();
  const existing = projectId
    ? await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          issueLinks: true,
          collaborators: true,
          _count: {
            select: {
              feedbackEntries: true
            }
          }
        }
      })
    : null;

  if (
    existing &&
    !canUserEditProjectDraft(existing, params.actorUserId, params.actorRole)
  ) {
    throw new Error("You can only autosave your own project drafts.");
  }

  const projectType = parseProjectType(String(params.formData.get("projectType") ?? ""));
  const requestedScale = parseProjectScale(
    String(params.formData.get("projectScale") ?? ""),
    existing?.scale ?? ProjectScale.FIRST_PROJECT
  );
  const projectScale =
    String(params.formData.get("beginnerMode") ?? "") === "1" ? ProjectScale.FIRST_PROJECT : requestedScale;
  const artifactFocus = projectScale === ProjectScale.EXTENDED
    ? parseArtifactFocus(String(params.formData.get("artifactFocus") ?? ""), projectType)
    : null;
  const effectiveProjectType =
    artifactFocus && projectScale === ProjectScale.EXTENDED
      ? getProjectTypeForArtifactFocus(artifactFocus)
      : projectType;
  const laneTags = Array.from(
    new Set(
      projectScale === ProjectScale.EXTENDED
        ? [getLaneForArtifactFocus(artifactFocus ?? getArtifactFocusForProjectType(projectType))]
        : params.formData.getAll("laneTags").map(String).filter(Boolean)
    )
  );
  const lanePrimary = artifactFocus && projectScale === ProjectScale.EXTENDED
    ? getLaneForArtifactFocus(artifactFocus)
    : parseLanePrimary(String(params.formData.get("lanePrimary") ?? ""), effectiveProjectType, laneTags);
  const finalLaneTags = Array.from(new Set([...laneTags, lanePrimary]));
  const issueId = resolveProjectPrimaryIssueId({
    issueId: String(params.formData.get("issueId") ?? ""),
    issueIds: params.formData.getAll("issueIds").map(String).filter(Boolean)
  });
  const collaboratorIds = params.formData.getAll("collaboratorIds").map(String).filter(Boolean);
  const title = String(params.formData.get("title") ?? "").trim() || existing?.title || "Untitled project draft";
  const summary = String(params.formData.get("summary") ?? "").trim() || existing?.summary || "Draft summary in progress.";
  const abstract = String(params.formData.get("abstract") ?? "").trim() || existing?.abstract || summary;
  const essentialQuestion =
    String(params.formData.get("essentialQuestion") ?? "").trim() ||
    existing?.essentialQuestion ||
    "Research question in progress.";
  const methodsSummary =
    String(params.formData.get("methodsSummary") ?? "").trim() ||
    existing?.methodsSummary ||
    "Methods summary in progress.";
  const content = parseProjectContent(params.formData, summary, essentialQuestion);
  const artifactLinks = parseArtifactLinks(parseStringList(params.formData.get("artifactLinks")));
  const references = parseReferences(parseStringList(params.formData.get("references")));
  const keywords = parseKeywords(params.formData.get("keywords"));
  const keyTakeaways = parseTakeaways(params.formData.get("keyTakeaways"));
  const missionGoal = String(params.formData.get("missionGoal") ?? "").trim() || null;
  const successCriteria = String(params.formData.get("successCriteria") ?? "").trim() || null;
  const targetLaunchDate = parseOptionalDate(params.formData.get("targetLaunchDate"));
  const campaignDeliverables = parseCampaignDeliverables(params.formData);
  const campaignMilestones = parseCampaignMilestones(params.formData);
  const findingsMd = String(params.formData.get("findingsMd") ?? "").trim() || existing?.findingsMd || "";
  const publicationType = projectTypeToPublicationType(effectiveProjectType, lanePrimary);

  const saved = existing
    ? await prisma.project.update({
        where: { id: existing.id },
        data: {
          title,
          summary,
          abstract,
          essentialQuestion,
          methodsSummary,
          projectType: effectiveProjectType,
          scale: projectScale,
          artifactFocus,
          submissionStatus: SubmissionStatus.DRAFT,
          publicationType,
          lanePrimary,
          laneTagsJson: asJson(finalLaneTags),
          issueId: issueId || null,
          teamId: String(params.formData.get("teamId") ?? "").trim() || null,
          supportingProposalId: String(params.formData.get("supportingProposalId") ?? "").trim() || null,
          missionGoal,
          successCriteria,
          targetLaunchDate,
          artifactLinksJson: asJson(artifactLinks),
          findingsMd,
          contentJson: asJson(content),
          referencesJson: asJson(references),
          keywordsJson: asJson(keywords),
          keyTakeawaysJson: asJson(keyTakeaways),
          publicationSummary: content.overview || summary,
          publicationSlug: String(params.formData.get("publicationSlug") ?? "").trim() || existing.publicationSlug,
          issueLinks: {
            deleteMany: {},
            create: buildProjectIssueLinkCreates(issueId)
          },
          collaborators: {
            deleteMany: {},
            create: collaboratorIds.map((userId) => ({ userId }))
          }
        }
      })
    : await prisma.project.create({
        data: {
          title,
          summary,
          abstract,
          essentialQuestion,
          methodsSummary,
          projectType: effectiveProjectType,
          scale: projectScale,
          artifactFocus,
          submissionStatus: SubmissionStatus.DRAFT,
          publicationType,
          lanePrimary,
          laneTagsJson: asJson(finalLaneTags),
          issueId: issueId || null,
          teamId: String(params.formData.get("teamId") ?? "").trim() || null,
          supportingProposalId: String(params.formData.get("supportingProposalId") ?? "").trim() || null,
          missionGoal,
          successCriteria,
          targetLaunchDate,
          artifactLinksJson: asJson(artifactLinks),
          findingsMd,
          contentJson: asJson(content),
          referencesJson: asJson(references),
          keywordsJson: asJson(keywords),
          keyTakeawaysJson: asJson(keyTakeaways),
          publicationSummary: content.overview || summary,
          publicationSlug: String(params.formData.get("publicationSlug") ?? "").trim() || null,
          createdByUserId: params.actorUserId,
          issueLinks: {
            create: buildProjectIssueLinkCreates(issueId)
          },
          collaborators: {
            create: collaboratorIds.map((userId) => ({ userId }))
          }
        }
      });

  const campaignAssessment = buildProjectCampaignAssessment({
    scale: projectScale,
    artifactFocus,
    issueId,
    issueSeverity: null,
    title,
    summary,
    abstract,
    essentialQuestion,
    methodsSummary,
    overview: content.overview,
    context: content.context,
    evidence: content.evidence,
    analysis: content.analysis,
    recommendations: content.recommendations,
    reflection: content.reflection,
    missionGoal: missionGoal ?? "",
    successCriteria: successCriteria ?? "",
    targetLaunchDate,
    keyTakeaways,
    artifactLinks,
    references,
    laneSections: content.laneSections,
    feedbackCount: existing?._count.feedbackEntries ?? 0,
    milestoneInputs: campaignMilestones,
    deliverableInputs: campaignDeliverables
  });

  await syncProjectCampaignState({
    db: prisma,
    projectId: saved.id,
    scale: projectScale,
    assessment: campaignAssessment
  });

  if (projectScale === ProjectScale.EXTENDED) {
    await createProjectCampaignProgressEvent({
      db: prisma,
      projectId: saved.id,
      milestoneKey: campaignAssessment.activeMilestoneKey,
      actorUserId: params.actorUserId,
      body: "Saved project progress in the campaign workspace."
    });
  }

  await syncProjectStudentOutcomes({
    projectId: saved.id
  });

  if (projectScale === ProjectScale.EXTENDED) {
    await syncProjectAiCampaignState(saved.id);
  }

  return {
    id: saved.id,
    editUrl: `/projects/${saved.id}/edit`,
    savedAt: new Date().toISOString()
  };
}

export async function autosaveProposalDraft(params: {
  formData: FormData;
  actorUserId: string;
}) {
  const proposalId = String(params.formData.get("proposalId") ?? "").trim();
  const existing = proposalId
    ? await prisma.proposal.findUnique({
        where: { id: proposalId }
      })
    : null;

  if (existing && existing.createdByUserId !== params.actorUserId) {
    throw new Error("You can only autosave your own proposal drafts.");
  }

  const title = String(params.formData.get("title") ?? "").trim() || existing?.title || "Untitled proposal memo";
  const abstract = String(params.formData.get("abstract") ?? "").trim() || existing?.abstract || "Executive summary in progress.";
  const methodsSummary =
    String(params.formData.get("methodsSummary") ?? "").trim() ||
    existing?.methodsSummary ||
    "Methods summary in progress.";
  const content = {
    problem: String(params.formData.get("problem") ?? "").trim(),
    currentRuleContext: String(params.formData.get("currentRuleContext") ?? "").trim(),
    proposedChange: String(params.formData.get("proposedChange") ?? "").trim(),
    impactAnalysis: String(params.formData.get("expectedImpact") ?? "").trim(),
    tradeoffs: String(params.formData.get("tradeoffs") ?? "").trim(),
    sandboxInterpretation: String(params.formData.get("sandboxInterpretation") ?? "").trim(),
    recommendation: String(params.formData.get("recommendation") ?? "").trim()
  };
  const references = parseReferences(parseStringList(params.formData.get("references")));
  const keywords = parseKeywords(params.formData.get("keywords"));
  const keyTakeaways = parseTakeaways(params.formData.get("keyTakeaways"));
  const diffJson = parseJsonText(params.formData.get("diffJson"), { changes: [] });
  const sandboxResultJson = parseJsonText(params.formData.get("sandboxResultJson"), null);

  const saved = existing
    ? await prisma.proposal.update({
        where: { id: existing.id },
        data: {
          title,
          issueId: String(params.formData.get("issueId") ?? "").trim() || existing.issueId,
          status: ProposalStatus.DRAFT,
          publicationType: PublicationType.POLICY_MEMO,
          ruleSetIdTarget: String(params.formData.get("ruleSetId") ?? "").trim() || existing.ruleSetIdTarget,
          diffJson: asJson(diffJson),
          narrativeJson: asJson({
            problem: content.problem,
            proposedChange: content.proposedChange,
            expectedImpact: content.impactAnalysis,
            tradeoffs: content.tradeoffs
          }),
          contentJson: asJson(content),
          sandboxResultJson: sandboxResultJson ? asJson(sandboxResultJson) : Prisma.JsonNull,
          abstract,
          methodsSummary,
          keyTakeawaysJson: asJson(keyTakeaways),
          referencesJson: asJson(references),
          keywordsJson: asJson(keywords),
          publicationSummary: content.recommendation || abstract,
          publicationSlug: String(params.formData.get("publicationSlug") ?? "").trim() || existing.publicationSlug
        }
      })
    : await prisma.proposal.create({
        data: {
          title,
          issueId: String(params.formData.get("issueId") ?? "").trim(),
          createdByUserId: params.actorUserId,
          status: ProposalStatus.DRAFT,
          publicationType: PublicationType.POLICY_MEMO,
          ruleSetIdTarget: String(params.formData.get("ruleSetId") ?? "").trim(),
          diffJson: asJson(diffJson),
          narrativeJson: asJson({
            problem: content.problem,
            proposedChange: content.proposedChange,
            expectedImpact: content.impactAnalysis,
            tradeoffs: content.tradeoffs
          }),
          contentJson: asJson(content),
          sandboxResultJson: sandboxResultJson ? asJson(sandboxResultJson) : undefined,
          abstract,
          methodsSummary,
          keyTakeawaysJson: asJson(keyTakeaways),
          referencesJson: asJson(references),
          keywordsJson: asJson(keywords),
          publicationSummary: content.recommendation || abstract,
          publicationSlug: String(params.formData.get("publicationSlug") ?? "").trim() || null
        }
      });

  await syncProposalStudentOutcomes({
    proposalId: saved.id
  });

  return {
    id: saved.id,
    editUrl: `/proposals/${saved.id}/edit`,
    savedAt: new Date().toISOString()
  };
}
