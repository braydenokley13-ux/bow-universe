import {
  PublicationSourceType,
  StudentOutcomeKind,
  StudentOutcomeStatus
} from "@prisma/client";

import {
  parseProjectContent,
  parseProposalContent,
  parseReferences
} from "@/lib/publications";
import type { ArtifactLink } from "@/lib/types";
import type { LaneTag } from "@/lib/types";

export type StudentOutcomeVerificationMode =
  | "AUTO_GATE"
  | "STUDENT_SUBMITTED"
  | "ADMIN_SIGNOFF"
  | "PUBLICATION";

export type StudentOutcomeProof = {
  artifactSummary: string;
  artifactLink: string | null;
  evidenceCount: number;
  evidenceSummary: string;
  studentReflection: string;
  verificationMode: StudentOutcomeVerificationMode;
  supportingPublicationId: string | null;
};

export const studentOutcomeOrder: StudentOutcomeKind[] = [
  StudentOutcomeKind.ARTIFACT_COMPLETED,
  StudentOutcomeKind.EVIDENCE_DEFENDED,
  StudentOutcomeKind.VERIFIED_IMPACT
];

export const studentOutcomeKindLabels: Record<StudentOutcomeKind, string> = {
  [StudentOutcomeKind.ARTIFACT_COMPLETED]: "Made something real",
  [StudentOutcomeKind.EVIDENCE_DEFENDED]: "Backed it with evidence",
  [StudentOutcomeKind.VERIFIED_IMPACT]: "Got it verified"
};

export const studentOutcomeStatusLabels: Record<StudentOutcomeStatus, string> = {
  [StudentOutcomeStatus.DRAFT]: "Draft proof",
  [StudentOutcomeStatus.PENDING_VERIFICATION]: "Pending review",
  [StudentOutcomeStatus.VERIFIED]: "Verified",
  [StudentOutcomeStatus.REJECTED]: "Needs revision"
};

type ProjectOutcomeSource = {
  id: string;
  title: string;
  summary: string;
  abstract: string | null;
  essentialQuestion: string | null;
  methodsSummary: string | null;
  findingsMd: string;
  lanePrimary: LaneTag | null;
  issueId: string | null;
  teamId: string | null;
  supportingProposalId: string | null;
  contentJson: unknown;
  referencesJson: unknown;
  artifactLinksJson: unknown;
};

type ProposalOutcomeSource = {
  id: string;
  title: string;
  abstract: string | null;
  methodsSummary: string | null;
  issueId: string;
  contentJson: unknown;
  referencesJson: unknown;
};

export function parseStudentOutcomeProof(value: unknown): StudentOutcomeProof {
  if (!value || typeof value !== "object") {
    return {
      artifactSummary: "",
      artifactLink: null,
      evidenceCount: 0,
      evidenceSummary: "",
      studentReflection: "",
      verificationMode: "AUTO_GATE",
      supportingPublicationId: null
    };
  }

  const record = value as Record<string, unknown>;

  return {
    artifactSummary: String(record.artifactSummary ?? "").trim(),
    artifactLink: String(record.artifactLink ?? "").trim() || null,
    evidenceCount: Number(record.evidenceCount ?? 0) || 0,
    evidenceSummary: String(record.evidenceSummary ?? "").trim(),
    studentReflection: String(record.studentReflection ?? "").trim(),
    verificationMode: normalizeVerificationMode(record.verificationMode),
    supportingPublicationId: String(record.supportingPublicationId ?? "").trim() || null
  };
}

function parseArtifactLinks(value: unknown): ArtifactLink[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const record = entry as Record<string, unknown>;
      const label = String(record.label ?? "").trim();
      const url = String(record.url ?? "").trim();

      if (!label || !url) {
        return null;
      }

      return { label, url };
    })
    .filter((entry): entry is ArtifactLink => Boolean(entry));
}

export function buildProjectOutcomeProof(
  project: ProjectOutcomeSource,
  verificationMode: StudentOutcomeVerificationMode,
  supportingPublicationId?: string | null
): StudentOutcomeProof {
  const lanePrimary = (project.lanePrimary ?? "ECONOMIC_INVESTIGATORS") as LaneTag;
  const content = parseProjectContent(project.contentJson, lanePrimary);
  const references = parseReferences(project.referencesJson);
  const artifactLinks = parseArtifactLinks(project.artifactLinksJson);

  return {
    artifactSummary:
      firstNonEmpty([
        content.overview,
        project.abstract,
        project.summary,
        content.questionOrMission,
        project.title
      ]) ?? project.title,
    artifactLink: artifactLinks[0]?.url ?? `/projects/${project.id}`,
    evidenceCount: references.length,
    evidenceSummary:
      firstNonEmpty([
        content.evidence,
        content.analysis,
        content.recommendations
      ]) ?? "",
    studentReflection: firstNonEmpty([content.reflection, project.methodsSummary]) ?? "",
    verificationMode,
    supportingPublicationId: supportingPublicationId ?? null
  };
}

export function buildProposalOutcomeProof(
  proposal: ProposalOutcomeSource,
  verificationMode: StudentOutcomeVerificationMode,
  supportingPublicationId?: string | null
): StudentOutcomeProof {
  const content = parseProposalContent(proposal.contentJson);
  const references = parseReferences(proposal.referencesJson);

  return {
    artifactSummary:
      firstNonEmpty([
        proposal.abstract,
        content.problem,
        content.recommendation,
        proposal.title
      ]) ?? proposal.title,
    artifactLink: `/proposals/${proposal.id}`,
    evidenceCount: references.length,
    evidenceSummary:
      firstNonEmpty([
        content.impactAnalysis,
        content.sandboxInterpretation,
        content.tradeoffs,
        content.recommendation
      ]) ?? "",
    studentReflection: proposal.methodsSummary?.trim() || "",
    verificationMode,
    supportingPublicationId: supportingPublicationId ?? null
  };
}

export function projectQualifiesForArtifactOutcome(project: ProjectOutcomeSource) {
  const lanePrimary = (project.lanePrimary ?? "ECONOMIC_INVESTIGATORS") as LaneTag;
  const content = parseProjectContent(project.contentJson, lanePrimary);
  const substantivePieces = countSubstantiveFields([
    project.summary,
    project.abstract,
    project.essentialQuestion,
    project.methodsSummary,
    project.findingsMd,
    content.overview,
    content.context,
    content.evidence,
    content.analysis,
    content.recommendations,
    content.reflection,
    ...content.laneSections.map((section) => section.value)
  ]);

  return (
    project.title.trim().length >= 3 &&
    Boolean(project.issueId || project.teamId || project.supportingProposalId) &&
    substantivePieces >= 3
  );
}

export function projectQualifiesForEvidenceOutcome(project: ProjectOutcomeSource) {
  const lanePrimary = (project.lanePrimary ?? "ECONOMIC_INVESTIGATORS") as LaneTag;
  const content = parseProjectContent(project.contentJson, lanePrimary);
  const references = parseReferences(project.referencesJson);

  return (
    projectQualifiesForArtifactOutcome(project) &&
    references.length >= 1 &&
    hasSubstance(project.methodsSummary, 16) &&
    countSubstantiveFields([
      content.evidence,
      content.analysis,
      content.recommendations,
      content.reflection
    ]) >= 2
  );
}

export function proposalQualifiesForArtifactOutcome(proposal: ProposalOutcomeSource) {
  const content = parseProposalContent(proposal.contentJson);
  const substantivePieces = countSubstantiveFields([
    proposal.abstract,
    proposal.methodsSummary,
    content.problem,
    content.currentRuleContext,
    content.proposedChange,
    content.impactAnalysis,
    content.tradeoffs,
    content.sandboxInterpretation,
    content.recommendation
  ]);

  return proposal.title.trim().length >= 5 && Boolean(proposal.issueId) && substantivePieces >= 3;
}

export function proposalQualifiesForEvidenceOutcome(proposal: ProposalOutcomeSource) {
  const content = parseProposalContent(proposal.contentJson);
  const references = parseReferences(proposal.referencesJson);

  return (
    proposalQualifiesForArtifactOutcome(proposal) &&
    references.length >= 1 &&
    hasSubstance(proposal.methodsSummary, 16) &&
    countSubstantiveFields([
      content.impactAnalysis,
      content.tradeoffs,
      content.sandboxInterpretation,
      content.recommendation
    ]) >= 2
  );
}

export function sourceHref(sourceType: PublicationSourceType, sourceId: string) {
  return sourceType === PublicationSourceType.PROJECT ? `/projects/${sourceId}/edit` : `/proposals/${sourceId}/edit`;
}

function normalizeVerificationMode(value: unknown): StudentOutcomeVerificationMode {
  const parsed = String(value ?? "").trim();

  if (
    parsed === "AUTO_GATE" ||
    parsed === "STUDENT_SUBMITTED" ||
    parsed === "ADMIN_SIGNOFF" ||
    parsed === "PUBLICATION"
  ) {
    return parsed;
  }

  return "AUTO_GATE";
}

function countSubstantiveFields(values: Array<string | null | undefined>) {
  return values.filter((value) => hasSubstance(value, 24)).length;
}

function hasSubstance(value: string | null | undefined, minimum: number) {
  return String(value ?? "").trim().length >= minimum;
}

function firstNonEmpty(values: Array<string | null | undefined>) {
  return values.map((value) => String(value ?? "").trim()).find(Boolean) ?? null;
}
