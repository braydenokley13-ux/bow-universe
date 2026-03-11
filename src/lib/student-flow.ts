import { ProjectType, ProposalStatus, SubmissionStatus } from "@prisma/client";

import { classifyIssueWorkGap } from "@/lib/discovery-guidance";
import { buildProjectStudioHref } from "@/lib/studio-entry";
import type { LaneTag } from "@/lib/types";

type MissionIssueInput = {
  id: string;
  title: string;
  description: string;
  severity: number;
  teamId?: string | null;
  team?: { id: string; name: string } | null;
  proposals: Array<{ id: string }>;
  projectLinks: Array<{ project: { id: string } }>;
};

export type RecommendedMission = {
  issue: {
    id: string;
    title: string;
    description: string;
    severity: number;
    team: { id: string; name: string } | null;
  };
  reason: string;
  suggestedLane: LaneTag;
  alternateLanes: LaneTag[];
  starterHref: string;
  adminHref: string;
  teamId: string | null;
  supportingProposalId: string | null;
};

export type ProjectRepairFieldId =
  | "issueId"
  | "lanePrimary"
  | "title"
  | "summary"
  | "abstract"
  | "essentialQuestion"
  | "methodsSummary"
  | "context"
  | "evidence"
  | "analysis"
  | "recommendations"
  | "references";

export type ProposalRepairFieldId =
  | "issueId"
  | "problem"
  | "currentRuleContext"
  | "proposedChange"
  | "expectedImpact"
  | "tradeoffs"
  | "sandboxInterpretation"
  | "recommendation";

const submittedProjectStatuses = new Set<SubmissionStatus>([
  SubmissionStatus.SUBMITTED,
  SubmissionStatus.REVISION_REQUESTED,
  SubmissionStatus.APPROVED_FOR_INTERNAL_PUBLICATION,
  SubmissionStatus.PUBLISHED_INTERNAL,
  SubmissionStatus.MARKED_EXTERNAL_READY,
  SubmissionStatus.APPROVED_FOR_EXTERNAL_PUBLICATION
]);

const primaryLaneAlternates: Record<LaneTag, LaneTag[]> = {
  TOOL_BUILDERS: ["ECONOMIC_INVESTIGATORS", "STRATEGIC_OPERATORS"],
  POLICY_REFORM_ARCHITECTS: ["ECONOMIC_INVESTIGATORS", "TOOL_BUILDERS"],
  STRATEGIC_OPERATORS: ["ECONOMIC_INVESTIGATORS", "TOOL_BUILDERS"],
  ECONOMIC_INVESTIGATORS: ["TOOL_BUILDERS", "STRATEGIC_OPERATORS"]
};

function projectTypeForLane(lane: LaneTag) {
  if (lane === "TOOL_BUILDERS") {
    return ProjectType.TOOL;
  }

  if (lane === "STRATEGIC_OPERATORS") {
    return ProjectType.STRATEGY;
  }

  if (lane === "POLICY_REFORM_ARCHITECTS") {
    return ProjectType.PROPOSAL_SUPPORT;
  }

  return ProjectType.INVESTIGATION;
}

function appendBeginnerMode(href: string) {
  const [pathname, queryString = ""] = href.split("?");
  const params = new URLSearchParams(queryString);
  params.set("beginner", "1");
  return `${pathname}?${params.toString()}`;
}

export function buildGuidedProjectHref(input: {
  lane: LaneTag;
  issueId: string;
  teamId?: string | null;
  supportingProposalId?: string | null;
}) {
  return appendBeginnerMode(
    buildProjectStudioHref({
      lane: input.lane,
      issueId: input.issueId,
      teamId: input.teamId ?? null,
      supportingProposalId: input.supportingProposalId ?? null
    })
  );
}

function scoreMissionIssue(
  issue: MissionIssueInput,
  linkedTeamId: string | null | undefined,
  claimedIssueIds: Set<string>
) {
  const gap = classifyIssueWorkGap(issue);
  let score = issue.severity * 20;

  if (linkedTeamId && issue.teamId === linkedTeamId) {
    score += 45;
  }

  if (gap.missing.includes("supporting project")) {
    score += issue.proposals.length > 0 ? 30 : 22;
  }

  if (gap.missing.length === 2) {
    score += 12;
  }

  if (issue.teamId) {
    score += 6;
  }

  if (claimedIssueIds.has(issue.id)) {
    score -= 60;
  }

  return score;
}

function missionReason(issue: MissionIssueInput, linkedTeamId: string | null | undefined) {
  const gap = classifyIssueWorkGap(issue);

  if (linkedTeamId && issue.teamId === linkedTeamId) {
    return "This issue touches your linked team, so it gives you a real place to start instead of a blank page.";
  }

  if (gap.missing.includes("supporting project") && issue.proposals.length > 0) {
    return "A memo already exists here, so your project can do the next clear job: add supporting evidence, structure, or tools.";
  }

  if (gap.missing.includes("supporting project")) {
    return "This issue still needs a project, so your work would help the league right away.";
  }

  if (issue.severity >= 4) {
    return "This is a high-pressure issue with clear stakes, which makes it easier to start and stay focused.";
  }

  return "This issue is specific, active, and manageable enough to become a strong first project.";
}

export function getSuggestedLaneForIssue(input: {
  issue: Pick<MissionIssueInput, "title" | "description" | "teamId">;
  linkedTeamId?: string | null;
}): LaneTag {
  const text = `${input.issue.title} ${input.issue.description}`.toLowerCase();

  if (input.issue.teamId && input.issue.teamId === input.linkedTeamId) {
    return "STRATEGIC_OPERATORS";
  }

  if (input.issue.teamId) {
    return "STRATEGIC_OPERATORS";
  }

  if (/(tool|calculator|tracker|model|simulation|simulate)/.test(text)) {
    return "TOOL_BUILDERS";
  }

  if (/(rule|policy|tax|apron|revenue sharing|cap|reform)/.test(text)) {
    return "ECONOMIC_INVESTIGATORS";
  }

  return "ECONOMIC_INVESTIGATORS";
}

export function buildRecommendedMissionCandidates(input: {
  issues: MissionIssueInput[];
  linkedTeamId?: string | null;
  claimedIssueIds?: string[];
}): RecommendedMission[] {
  const claimedIssueIds = new Set(input.claimedIssueIds ?? []);

  return [...input.issues]
    .sort(
      (left, right) =>
        scoreMissionIssue(right, input.linkedTeamId, claimedIssueIds) -
        scoreMissionIssue(left, input.linkedTeamId, claimedIssueIds)
    )
    .slice(0, 3)
    .map((issue) => {
      const suggestedLane = getSuggestedLaneForIssue({
        issue,
        linkedTeamId: input.linkedTeamId
      });
      const teamId = issue.teamId ?? null;
      const supportingProposalId = issue.proposals[0]?.id ?? null;
      const starterHref = buildGuidedProjectHref({
        lane: suggestedLane,
        issueId: issue.id,
        teamId,
        supportingProposalId
      });

      return {
        issue: {
          id: issue.id,
          title: issue.title,
          description: issue.description,
          severity: issue.severity,
          team: issue.team ?? null
        },
        reason: missionReason(issue, input.linkedTeamId),
        suggestedLane,
        alternateLanes: primaryLaneAlternates[suggestedLane],
        starterHref,
        adminHref: `/issues/${issue.id}`,
        teamId,
        supportingProposalId
      };
    });
}

export function hasStudentSubmittedProject(
  projects: Array<{ submissionStatus: SubmissionStatus }>
) {
  return projects.some((project) => submittedProjectStatuses.has(project.submissionStatus));
}

export function shouldUseBeginnerProjectMode(input: {
  hasSubmittedProject: boolean;
  currentProjectStatus?: SubmissionStatus | null;
  forceFullStudio?: boolean;
}) {
  if (input.forceFullStudio) {
    return false;
  }

  if (input.hasSubmittedProject) {
    return false;
  }

  if (input.currentProjectStatus && input.currentProjectStatus !== SubmissionStatus.DRAFT) {
    return false;
  }

  return true;
}

export function getProjectTypeForLane(lane: LaneTag) {
  return projectTypeForLane(lane);
}

export function getProjectRepairTarget(sectionKey: string): {
  fieldId: ProjectRepairFieldId;
  label: string;
} {
  const normalized = sectionKey.replace(/[^a-z]/gi, "").toLowerCase();

  if (normalized.includes("lane")) {
    return { fieldId: "lanePrimary", label: "lane choice" };
  }

  if (normalized.includes("issue")) {
    return { fieldId: "issueId", label: "issue choice" };
  }

  if (normalized.includes("title")) {
    return { fieldId: "title", label: "working title" };
  }

  if (normalized.includes("summary")) {
    return { fieldId: "summary", label: "summary" };
  }

  if (normalized.includes("abstract")) {
    return { fieldId: "abstract", label: "abstract" };
  }

  if (normalized.includes("method")) {
    return { fieldId: "methodsSummary", label: "methods summary" };
  }

  if (normalized.includes("question") || normalized.includes("mission")) {
    return { fieldId: "essentialQuestion", label: "big question" };
  }

  if (normalized.includes("context") || normalized.includes("why")) {
    return { fieldId: "context", label: "why this matters" };
  }

  if (normalized.includes("evidence")) {
    return { fieldId: "evidence", label: "evidence" };
  }

  if (normalized.includes("analysis") || normalized.includes("meaning")) {
    return { fieldId: "analysis", label: "what the evidence means" };
  }

  if (
    normalized.includes("recommend") ||
    normalized.includes("next") ||
    normalized.includes("action")
  ) {
    return { fieldId: "recommendations", label: "next step" };
  }

  if (normalized.includes("reference") || normalized.includes("source")) {
    return { fieldId: "references", label: "sources" };
  }

  return { fieldId: "analysis", label: "analysis" };
}

export function getProposalRepairTarget(sectionKey: string): {
  fieldId: ProposalRepairFieldId;
  label: string;
} {
  const normalized = sectionKey.replace(/[^a-z]/gi, "").toLowerCase();

  if (normalized.includes("issue")) {
    return { fieldId: "issueId", label: "issue choice" };
  }

  if (normalized.includes("currentrule")) {
    return { fieldId: "currentRuleContext", label: "current rule context" };
  }

  if (normalized.includes("reform") || normalized.includes("change")) {
    return { fieldId: "proposedChange", label: "proposed reform" };
  }

  if (normalized.includes("impact")) {
    return { fieldId: "expectedImpact", label: "impact analysis" };
  }

  if (normalized.includes("tradeoff")) {
    return { fieldId: "tradeoffs", label: "tradeoffs" };
  }

  if (normalized.includes("sandbox")) {
    return { fieldId: "sandboxInterpretation", label: "sandbox interpretation" };
  }

  if (normalized.includes("recommend")) {
    return { fieldId: "recommendation", label: "recommendation" };
  }

  return { fieldId: "problem", label: "problem" };
}

export function buildRepairHref(input: {
  kind: "project" | "proposal";
  id: string;
  sectionKey: string;
}) {
  if (input.kind === "project") {
    const target = getProjectRepairTarget(input.sectionKey);
    return `/projects/${input.id}/edit?repair=${target.fieldId}`;
  }

  const target = getProposalRepairTarget(input.sectionKey);
  return `/proposals/${input.id}/edit?repair=${target.fieldId}`;
}

export function proposalNeedsAttention(status: ProposalStatus) {
  return status === ProposalStatus.REVISION_REQUESTED;
}
