import { Prisma, ProjectType, ProposalStatus, SubmissionStatus } from "@prisma/client";

import { resolveProjectPrimaryIssueId } from "@/lib/project-issues";
import {
  assessProjectCoach,
  createInitialProjectCoachValues,
  type ProjectCoachAssessment
} from "@/lib/project-wizard";
import {
  assessProposalCoach,
  createInitialProposalCoachValues,
  getSandboxFingerprint,
  type ProposalCoachAssessment
} from "@/lib/proposal-wizard";
import { parseProjectJson, parseProposalJson } from "@/server/data";

export type ReviewBucket = "must_fix" | "should_strengthen" | "already_strong";

export type ReviewChecklistItem = {
  id: string;
  label: string;
  bucket: ReviewBucket;
  detail: string;
  nextMove: string;
  complete: boolean;
};

export type ReviewReadinessResult = {
  kind: "proposal" | "project";
  statusLabel: string;
  nextAction: string;
  readyForWorkflow: boolean;
  checklist: ReviewChecklistItem[];
  buckets: Record<
    ReviewBucket,
    {
      title: string;
      items: string[];
    }
  >;
};

type ProposalRecord = {
  title: string;
  issueId: string;
  ruleSetIdTarget: string;
  abstract: string | null;
  methodsSummary: string | null;
  diffJson: Prisma.JsonValue;
  narrativeJson: Prisma.JsonValue;
  sandboxResultJson: Prisma.JsonValue | null;
  contentJson?: Prisma.JsonValue | null;
  referencesJson?: Prisma.JsonValue | null;
  keywordsJson?: Prisma.JsonValue | null;
  keyTakeawaysJson?: Prisma.JsonValue | null;
  publicationSlug?: string | null;
  status: ProposalStatus;
};

type ProjectRecord = {
  title: string;
  summary: string;
  abstract: string | null;
  essentialQuestion: string | null;
  methodsSummary: string | null;
  publicationSlug?: string | null;
  findingsMd: string;
  laneTagsJson: Prisma.JsonValue;
  artifactLinksJson: Prisma.JsonValue;
  contentJson?: Prisma.JsonValue | null;
  referencesJson?: Prisma.JsonValue | null;
  keywordsJson?: Prisma.JsonValue | null;
  keyTakeawaysJson?: Prisma.JsonValue | null;
  lanePrimary?: string | null;
  projectType: ProjectType;
  issueLinks?: Array<{ issueId?: string; issue?: { id: string } }>;
  primaryIssue?: { id: string } | null;
  teamId?: string | null;
  supportingProposalId?: string | null;
  collaborators?: Array<{ userId?: string; user?: { id: string } }>;
  submissionStatus: SubmissionStatus;
};

function makeBucketTitle(bucket: ReviewBucket) {
  switch (bucket) {
    case "must_fix":
      return "Must fix";
    case "should_strengthen":
      return "Should strengthen";
    default:
      return "Already strong";
  }
}

function formatProposalStatus(status: ProposalStatus) {
  return status.replaceAll("_", " ");
}

function formatSubmissionStatus(status: SubmissionStatus) {
  return status.replaceAll("_", " ");
}

function formatReferenceLines(
  references: Array<{ label: string; url: string; sourceType: string; note?: string }>
) {
  return references
    .map((reference) =>
      [reference.label, reference.url, reference.sourceType, reference.note].filter(Boolean).join(" | ")
    )
    .join("\n");
}

function bucketForField(required: boolean, complete: boolean): ReviewBucket {
  if (complete) {
    return "already_strong";
  }

  return required ? "must_fix" : "should_strengthen";
}

function checklistFromProposalAssessment(assessment: ProposalCoachAssessment): ReviewChecklistItem[] {
  return Object.values(assessment.fields).map((field) => ({
    id: field.fieldId,
    label: field.label,
    bucket: bucketForField(field.required, field.complete),
    detail: field.message,
    nextMove: field.nextMove,
    complete: field.complete
  }));
}

function checklistFromProjectAssessment(assessment: ProjectCoachAssessment): ReviewChecklistItem[] {
  const fieldItems = Object.values(assessment.fields).map((field) => ({
    id: field.fieldId,
    label: field.label,
    bucket: bucketForField(field.required, field.complete),
    detail: field.message,
    nextMove: field.nextMove,
    complete: field.complete
  }));

  const laneItems: ReviewChecklistItem[] = assessment.laneSectionEvaluations.map((section) => ({
    id: `lane:${section.key}`,
    label: section.label,
    bucket: section.complete ? ("already_strong" as ReviewBucket) : ("should_strengthen" as ReviewBucket),
    detail: section.message,
    nextMove: section.nextMove,
    complete: section.complete
  }));

  return [...fieldItems, ...laneItems];
}

function bucketsFromAssessment(
  result: ProposalCoachAssessment | ProjectCoachAssessment
): ReviewReadinessResult["buckets"] {
  return {
    must_fix: {
      title: makeBucketTitle("must_fix"),
      items: result.reviewBuckets.blockers.items
    },
    should_strengthen: {
      title: makeBucketTitle("should_strengthen"),
      items: result.reviewBuckets.polish.items
    },
    already_strong: {
      title: makeBucketTitle("already_strong"),
      items: result.reviewBuckets.strengths.items
    }
  };
}

export function getProposalReviewReadiness(proposal: ProposalRecord): ReviewReadinessResult {
  const parsed = parseProposalJson(proposal);
  const diffJsonText = JSON.stringify(parsed.diff, null, 2);
  const fingerprint = parsed.sandbox
    ? getSandboxFingerprint(proposal.ruleSetIdTarget, diffJsonText)
    : null;
  const assessment = assessProposalCoach(
    createInitialProposalCoachValues({
      title: proposal.title,
      issueId: proposal.issueId,
      ruleSetId: proposal.ruleSetIdTarget,
      abstract: proposal.abstract ?? "",
      methodsSummary: proposal.methodsSummary ?? "",
      problem: parsed.content.problem || parsed.narrative.problem,
      currentRuleContext: parsed.content.currentRuleContext,
      proposedChange: parsed.content.proposedChange || parsed.narrative.proposedChange,
      expectedImpact: parsed.content.impactAnalysis || parsed.narrative.expectedImpact,
      tradeoffs: parsed.content.tradeoffs || parsed.narrative.tradeoffs,
      sandboxInterpretation: parsed.content.sandboxInterpretation,
      recommendation: parsed.content.recommendation,
      diffJson: diffJsonText,
      references: formatReferenceLines(parsed.references),
      keywords: parsed.keywords.join(", "),
      keyTakeaways: parsed.keyTakeaways.join("\n"),
      publicationSlug: proposal.publicationSlug ?? ""
    }),
    {
      result: parsed.sandbox,
      runFingerprint: fingerprint
    }
  );

  return {
    kind: "proposal",
    statusLabel: formatProposalStatus(proposal.status),
    nextAction: assessment.nextAction,
    readyForWorkflow: assessment.reviewBuckets.blockers.items.length === 0,
    checklist: checklistFromProposalAssessment(assessment),
    buckets: bucketsFromAssessment(assessment)
  };
}

export function getProjectReviewReadiness(project: ProjectRecord): ReviewReadinessResult {
  const parsed = parseProjectJson(project);
  const issueId = resolveProjectPrimaryIssueId({
    issueId: project.primaryIssue?.id ?? "",
    issueLinks: (project.issueLinks ?? []).map((link) => ({
      issueId: link.issueId ?? link.issue?.id ?? ""
    }))
  });
  const collaboratorIds = (project.collaborators ?? [])
    .map((collaborator) => collaborator.userId ?? collaborator.user?.id ?? "")
    .filter(Boolean);
  const assessment = assessProjectCoach(
    createInitialProjectCoachValues({
      lanePrimary: parsed.lanePrimary,
      projectType: project.projectType,
      laneTags: parsed.laneTags,
      issueId,
      teamId: project.teamId ?? "",
      supportingProposalId: project.supportingProposalId ?? "",
      collaboratorIds,
      title: project.title,
      summary: project.summary,
      abstract: project.abstract ?? "",
      essentialQuestion: project.essentialQuestion ?? parsed.content.questionOrMission,
      methodsSummary: project.methodsSummary ?? "",
      publicationSlug: project.publicationSlug ?? "",
      findingsMd: project.findingsMd,
      overview: parsed.content.overview || project.summary,
      context: parsed.content.context,
      evidence: parsed.content.evidence || project.findingsMd,
      analysis: parsed.content.analysis || project.findingsMd,
      recommendations: parsed.content.recommendations || project.findingsMd,
      reflection: parsed.content.reflection,
      artifactLinks: parsed.artifactLinks.map((artifact) => `${artifact.label} | ${artifact.url}`).join("\n"),
      references: formatReferenceLines(parsed.references),
      keywords: parsed.keywords.join(", "),
      keyTakeaways: parsed.keyTakeaways.join("\n"),
      laneSections: parsed.content.laneSections
    })
  );

  return {
    kind: "project",
    statusLabel: formatSubmissionStatus(project.submissionStatus),
    nextAction: assessment.nextAction,
    readyForWorkflow: assessment.reviewBuckets.blockers.items.length === 0,
    checklist: checklistFromProjectAssessment(assessment),
    buckets: bucketsFromAssessment(assessment)
  };
}
