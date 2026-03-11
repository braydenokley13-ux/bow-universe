import {
  ProjectArtifactFocus,
  ProjectDeliverableKey,
  ProjectMilestoneKey,
  ProjectMilestoneStatus,
  ProjectScale,
  ProjectType
} from "@prisma/client";

import type {
  ArtifactLink,
  LaneSectionEntry,
  LaneTag,
  ReferenceEntry
} from "@/lib/types";

type CampaignMilestoneDefinition = {
  key: ProjectMilestoneKey;
  title: string;
  description: string;
  targetOffsetDays: number;
};

type CampaignDeliverableDefinition = {
  key: ProjectDeliverableKey;
  title: string;
  detail: string;
};

export type ProjectCampaignMilestoneInput = {
  key: ProjectMilestoneKey;
  targetDate: Date;
  completionNote?: string | null;
};

export type ProjectCampaignDeliverableInput = {
  key: ProjectDeliverableKey;
  contentMd?: string | null;
  artifactUrl?: string | null;
};

export type ProjectCampaignAssessmentInput = {
  scale: ProjectScale;
  artifactFocus: ProjectArtifactFocus | null;
  issueId: string;
  issueSeverity?: number | null;
  title: string;
  summary: string;
  abstract: string;
  essentialQuestion: string;
  methodsSummary: string;
  overview: string;
  context: string;
  evidence: string;
  analysis: string;
  recommendations: string;
  reflection: string;
  missionGoal: string;
  successCriteria: string;
  targetLaunchDate: Date | null;
  keyTakeaways: string[];
  artifactLinks: ArtifactLink[];
  references: ReferenceEntry[];
  laneSections: LaneSectionEntry[];
  feedbackCount?: number;
  milestoneInputs?: ProjectCampaignMilestoneInput[];
  deliverableInputs?: ProjectCampaignDeliverableInput[];
};

export type ProjectCampaignMilestoneAssessment = {
  key: ProjectMilestoneKey;
  title: string;
  description: string;
  status: ProjectMilestoneStatus;
  targetDate: Date;
  complete: boolean;
  missingItems: string[];
  completionNote: string | null;
  overdue: boolean;
};

export type ProjectCampaignDeliverableAssessment = {
  key: ProjectDeliverableKey;
  title: string;
  detail: string;
  complete: boolean;
  required: boolean;
  contentMd: string;
  artifactUrl: string | null;
};

export type ProjectCampaignAssessment = {
  isExtended: boolean;
  activeMilestoneKey: ProjectMilestoneKey | null;
  nextAction: string;
  issuePressureLabel: string;
  launchReady: boolean;
  milestones: ProjectCampaignMilestoneAssessment[];
  deliverables: ProjectCampaignDeliverableAssessment[];
};

export const projectArtifactFocusLabels: Record<ProjectArtifactFocus, string> = {
  RESEARCH: "Research mission",
  TOOL: "Tool mission",
  STRATEGY: "Strategy mission"
};

const milestoneDefinitions: CampaignMilestoneDefinition[] = [
  {
    key: ProjectMilestoneKey.CHARTER,
    title: "Project charter",
    description: "Define the mission, the question, and the finish line before the month really starts.",
    targetOffsetDays: 3
  },
  {
    key: ProjectMilestoneKey.EVIDENCE_BOARD,
    title: "Evidence board",
    description: "Collect the strongest facts, sources, and context so the project stops feeling hypothetical.",
    targetOffsetDays: 10
  },
  {
    key: ProjectMilestoneKey.BUILD_SPRINT,
    title: "Build sprint",
    description: "Turn the evidence into a real artifact, model, explanation, or strategy build.",
    targetOffsetDays: 18
  },
  {
    key: ProjectMilestoneKey.FEEDBACK_LOOP,
    title: "Feedback loop",
    description: "Respond to critique, tighten the work, and document what changed.",
    targetOffsetDays: 24
  },
  {
    key: ProjectMilestoneKey.LAUNCH_WEEK,
    title: "Launch week",
    description: "Assemble the final package, stage the reveal, and make the project feel ready to show.",
    targetOffsetDays: 30
  }
];

const deliverableDefinitions: CampaignDeliverableDefinition[] = [
  {
    key: ProjectDeliverableKey.DOSSIER,
    title: "Dossier",
    detail: "A sharp written brief that explains the mission, context, and main idea."
  },
  {
    key: ProjectDeliverableKey.CORE_BUILD,
    title: "Core build",
    detail: "The main thing the student made, proved, or planned."
  },
  {
    key: ProjectDeliverableKey.EVIDENCE_BOARD,
    title: "Evidence board",
    detail: "The source bank, evidence trail, and proof behind the project."
  },
  {
    key: ProjectDeliverableKey.REVISION_LOG,
    title: "Revision log",
    detail: "What changed after feedback and why the project got stronger."
  },
  {
    key: ProjectDeliverableKey.LAUNCH_DECK,
    title: "Launch deck",
    detail: "Presentation notes, talking points, and reveal materials for the final week."
  }
];

function hasText(value: string | null | undefined, min = 16) {
  return Boolean(value && value.trim().length >= min);
}

function startOfToday() {
  const value = new Date();
  value.setHours(0, 0, 0, 0);
  return value;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function deliverableInputMap(inputs: ProjectCampaignDeliverableInput[] = []) {
  return new Map(inputs.map((input) => [input.key, input]));
}

function milestoneInputMap(inputs: ProjectCampaignMilestoneInput[] = []) {
  return new Map(inputs.map((input) => [input.key, input]));
}

export function getProjectTypeForArtifactFocus(focus: ProjectArtifactFocus) {
  if (focus === ProjectArtifactFocus.TOOL) {
    return ProjectType.TOOL;
  }

  if (focus === ProjectArtifactFocus.STRATEGY) {
    return ProjectType.STRATEGY;
  }

  return ProjectType.INVESTIGATION;
}

export function getLaneForArtifactFocus(focus: ProjectArtifactFocus): LaneTag {
  if (focus === ProjectArtifactFocus.TOOL) {
    return "TOOL_BUILDERS";
  }

  if (focus === ProjectArtifactFocus.STRATEGY) {
    return "STRATEGIC_OPERATORS";
  }

  return "ECONOMIC_INVESTIGATORS";
}

export function getArtifactFocusForProjectType(projectType: ProjectType): ProjectArtifactFocus {
  if (projectType === ProjectType.TOOL) {
    return ProjectArtifactFocus.TOOL;
  }

  if (projectType === ProjectType.STRATEGY) {
    return ProjectArtifactFocus.STRATEGY;
  }

  return ProjectArtifactFocus.RESEARCH;
}

export function getCampaignMilestoneForSectionKey(sectionKey: string) {
  const value = sectionKey.trim().toLowerCase();

  if (!value) {
    return null;
  }

  if (
    ["issue", "title", "question", "mission", "goal", "success", "lane", "artifact focus"].some((token) =>
      value.includes(token)
    )
  ) {
    return ProjectMilestoneKey.CHARTER;
  }

  if (["summary", "overview", "context", "evidence", "reference", "source"].some((token) => value.includes(token))) {
    return ProjectMilestoneKey.EVIDENCE_BOARD;
  }

  if (["method", "analysis", "recommendation", "artifact", "build", "strategy"].some((token) => value.includes(token))) {
    return ProjectMilestoneKey.BUILD_SPRINT;
  }

  if (["reflection", "revision", "feedback"].some((token) => value.includes(token))) {
    return ProjectMilestoneKey.FEEDBACK_LOOP;
  }

  if (["takeaway", "launch", "presentation", "deck"].some((token) => value.includes(token))) {
    return ProjectMilestoneKey.LAUNCH_WEEK;
  }

  return null;
}

export function buildDefaultProjectMilestones(anchorDate = new Date()) {
  return milestoneDefinitions.map((definition, index) => ({
    key: definition.key,
    title: definition.title,
    status: index === 0 ? ProjectMilestoneStatus.ACTIVE : ProjectMilestoneStatus.LOCKED,
    targetDate: addDays(anchorDate, definition.targetOffsetDays),
    completedAt: null,
    completionNote: null
  }));
}

export function buildDefaultProjectDeliverables() {
  return deliverableDefinitions.map((definition) => ({
    key: definition.key,
    title: definition.title,
    required: true,
    complete: false,
    contentMd: "",
    artifactUrl: null
  }));
}

export function buildProjectCampaignAssessment(
  input: ProjectCampaignAssessmentInput
): ProjectCampaignAssessment {
  if (input.scale !== ProjectScale.EXTENDED) {
    return {
      isExtended: false,
      activeMilestoneKey: null,
      nextAction: "Keep the guided project moving one section at a time.",
      issuePressureLabel: input.issueSeverity ? `Severity ${input.issueSeverity}` : "Issue anchor optional",
      launchReady: false,
      milestones: [],
      deliverables: []
    };
  }

  const deliverablesByKey = deliverableInputMap(input.deliverableInputs);
  const artifactLink = input.artifactLinks[0]?.url ?? null;
  const feedbackCount = input.feedbackCount ?? 0;
  const evidenceBoardText = [input.evidence.trim(), input.references.map((reference) => reference.label).join("\n")]
    .filter(Boolean)
    .join("\n\n");
  const dossierText = [input.summary.trim(), input.abstract.trim(), input.overview.trim(), input.context.trim()]
    .filter(Boolean)
    .join("\n\n");
  const revisionText = [
    deliverablesByKey.get(ProjectDeliverableKey.REVISION_LOG)?.contentMd?.trim() ?? "",
    input.reflection.trim()
  ]
    .filter(Boolean)
    .join("\n\n");
  const launchText = [
    deliverablesByKey.get(ProjectDeliverableKey.LAUNCH_DECK)?.contentMd?.trim() ?? "",
    input.keyTakeaways.join("\n")
  ]
    .filter(Boolean)
    .join("\n\n");
  const coreBuildInput = deliverablesByKey.get(ProjectDeliverableKey.CORE_BUILD);
  const hasSectionBuild = input.laneSections.some((section) => hasText(section.value, 24));
  const coreBuildText = [
    coreBuildInput?.contentMd?.trim() ?? "",
    input.methodsSummary.trim(),
    input.analysis.trim(),
    input.recommendations.trim()
  ]
    .filter(Boolean)
    .join("\n\n");

  const deliverables: ProjectCampaignDeliverableAssessment[] = deliverableDefinitions.map((definition) => {
    if (definition.key === ProjectDeliverableKey.DOSSIER) {
      return {
        key: definition.key,
        title: definition.title,
        detail: definition.detail,
        required: true,
        complete:
          hasText(input.title, 12) &&
          hasText(input.summary, 20) &&
          hasText(input.abstract, 40) &&
          hasText(input.overview, 24),
        contentMd: dossierText,
        artifactUrl: null
      };
    }

    if (definition.key === ProjectDeliverableKey.CORE_BUILD) {
      return {
        key: definition.key,
        title: definition.title,
        detail: definition.detail,
        required: true,
        complete:
          hasText(input.methodsSummary, 24) &&
          hasText(input.analysis, 32) &&
          hasText(input.recommendations, 24) &&
          (hasText(coreBuildInput?.contentMd, 40) || hasSectionBuild || Boolean(coreBuildInput?.artifactUrl || artifactLink)),
        contentMd: coreBuildText,
        artifactUrl: coreBuildInput?.artifactUrl?.trim() || artifactLink
      };
    }

    if (definition.key === ProjectDeliverableKey.EVIDENCE_BOARD) {
      return {
        key: definition.key,
        title: definition.title,
        detail: definition.detail,
        required: true,
        complete: hasText(input.evidence, 40) && input.references.length > 0,
        contentMd: evidenceBoardText,
        artifactUrl: null
      };
    }

    if (definition.key === ProjectDeliverableKey.REVISION_LOG) {
      return {
        key: definition.key,
        title: definition.title,
        detail: definition.detail,
        required: true,
        complete: hasText(revisionText, 40) && feedbackCount > 0,
        contentMd: revisionText,
        artifactUrl: null
      };
    }

    return {
      key: definition.key,
      title: definition.title,
      detail: definition.detail,
      required: true,
      complete: hasText(launchText, 40) && input.keyTakeaways.length >= 2,
      contentMd: launchText,
      artifactUrl: deliverablesByKey.get(ProjectDeliverableKey.LAUNCH_DECK)?.artifactUrl?.trim() || null
    };
  });

  const milestoneInputs = milestoneInputMap(input.milestoneInputs);
  const charterMissing = [
    input.issueId.trim() ? null : "Choose the main issue.",
    hasText(input.title, 12) ? null : "Write a project title.",
    input.artifactFocus ? null : "Choose the project focus.",
    hasText(input.essentialQuestion, 12) ? null : "Write the driving question.",
    hasText(input.missionGoal, 20) ? null : "State the mission goal.",
    hasText(input.successCriteria, 28) ? null : "Define how success will be judged.",
    input.targetLaunchDate ? null : "Set the target finish date."
  ].filter(Boolean) as string[];
  const evidenceMissing = [
    hasText(input.summary, 20) ? null : "Tighten the short summary.",
    hasText(input.overview, 24) ? null : "Write the dossier opening.",
    hasText(input.context, 24) ? null : "Explain why the issue matters now.",
    hasText(input.evidence, 40) ? null : "Add deeper evidence notes.",
    input.references.length > 0 ? null : "Add at least one reference."
  ].filter(Boolean) as string[];
  const buildMissing = [
    hasText(input.methodsSummary, 24) ? null : "Explain the build or method clearly.",
    hasText(input.analysis, 32) ? null : "Interpret what the work shows.",
    hasText(input.recommendations, 24) ? null : "Name the move or recommendation.",
    deliverables.find((deliverable) => deliverable.key === ProjectDeliverableKey.CORE_BUILD)?.complete
      ? null
      : "Finish the core build."
  ].filter(Boolean) as string[];
  const feedbackMissing = [
    feedbackCount > 0 ? null : "Collect at least one piece of feedback.",
    deliverables.find((deliverable) => deliverable.key === ProjectDeliverableKey.REVISION_LOG)?.complete
      ? null
      : "Record the revision changes."
  ].filter(Boolean) as string[];
  const launchMissing = deliverables
    .filter((deliverable) => !deliverable.complete)
    .map((deliverable) => `Finish ${deliverable.title.toLowerCase()}.`);

  const milestoneMissingMap = new Map<ProjectMilestoneKey, string[]>([
    [ProjectMilestoneKey.CHARTER, charterMissing],
    [ProjectMilestoneKey.EVIDENCE_BOARD, evidenceMissing],
    [ProjectMilestoneKey.BUILD_SPRINT, buildMissing],
    [ProjectMilestoneKey.FEEDBACK_LOOP, feedbackMissing],
    [ProjectMilestoneKey.LAUNCH_WEEK, launchMissing]
  ]);

  const today = startOfToday();
  const milestones = milestoneDefinitions.map((definition, index) => {
    const configured = milestoneInputs.get(definition.key);
    const missingItems = milestoneMissingMap.get(definition.key) ?? [];
    const complete = missingItems.length === 0;
    const earlierComplete = milestoneDefinitions
      .slice(0, index)
      .every((entry) => (milestoneMissingMap.get(entry.key) ?? []).length === 0);
    const status = complete
      ? ProjectMilestoneStatus.COMPLETE
      : earlierComplete
        ? ProjectMilestoneStatus.ACTIVE
        : ProjectMilestoneStatus.LOCKED;
    const targetDate = configured?.targetDate ?? addDays(today, definition.targetOffsetDays);

    return {
      key: definition.key,
      title: definition.title,
      description: definition.description,
      status,
      targetDate,
      complete,
      missingItems,
      completionNote: configured?.completionNote?.trim() || null,
      overdue: status === ProjectMilestoneStatus.ACTIVE && targetDate.getTime() < today.getTime()
    };
  });

  const activeMilestone = milestones.find((milestone) => milestone.status === ProjectMilestoneStatus.ACTIVE) ?? null;
  const issuePressureLabel = input.issueSeverity
    ? input.issueSeverity >= 5
      ? "High-pressure issue"
      : input.issueSeverity >= 3
        ? "Medium-pressure issue"
        : "Lower-pressure issue"
    : "Issue anchor set";

  return {
    isExtended: true,
    activeMilestoneKey: activeMilestone?.key ?? null,
    nextAction:
      activeMilestone?.missingItems[0] ??
      "The campaign package is complete. Move into launch week and present the work.",
    issuePressureLabel,
    launchReady: milestones.every((milestone) => milestone.complete),
    milestones,
    deliverables
  };
}
