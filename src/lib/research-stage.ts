import { ProposalStatus, PublicationSourceType, SubmissionStatus } from "@prisma/client";

import { parseProjectContent, parseProposalContent, parseReferences } from "@/lib/publications";
import type { LaneTag } from "@/lib/types";

export type ResearchStage =
  | "ASK_QUESTION"
  | "FIND_EVIDENCE"
  | "TEST_SYSTEM"
  | "MAKE_CASE"
  | "SHARE_WORK";

export type ResearchStageStatus = "done" | "active" | "upcoming" | "preview";

export type ResearchStageStep = {
  id: ResearchStage;
  label: string;
  shortLabel: string;
  description: string;
  status: ResearchStageStatus;
};

export type ResearchStageNextStep = {
  title: string;
  detail: string;
};

export type ResearchStageProgress = {
  currentResearchStage: ResearchStage;
  nextResearchStep: ResearchStageNextStep;
  researchStageProgress: ResearchStageStep[];
  simulationPreviewAvailable: boolean;
};

type ProjectResearchSource = {
  title: string;
  summary: string;
  essentialQuestion?: string | null;
  methodsSummary?: string | null;
  findingsMd?: string | null;
  lanePrimary?: LaneTag | null;
  contentJson: unknown;
  referencesJson: unknown;
  publicationSlug?: string | null;
  submissionStatus?: SubmissionStatus | null;
};

type ProposalResearchSource = {
  title: string;
  methodsSummary?: string | null;
  issueId?: string | null;
  contentJson: unknown;
  referencesJson: unknown;
  sandboxResultJson?: unknown;
  status?: ProposalStatus | null;
};

type MilestoneSource = {
  label: string;
  createdAt: Date;
};

export type ResearchMilestone = {
  stage: ResearchStage;
  label: string;
  description: string;
  achieved: boolean;
  sourceLabel: string | null;
  createdAt: Date | null;
};

const stageMeta: Record<
  ResearchStage,
  {
    label: string;
    shortLabel: string;
    description: string;
    nextTitle: string;
    nextDetail: string;
  }
> = {
  ASK_QUESTION: {
    label: "Ask the question",
    shortLabel: "Question",
    description: "Name the league pressure you want to understand.",
    nextTitle: "Lock one real question",
    nextDetail: "Pick one issue and write the clearest question you want your research to answer."
  },
  FIND_EVIDENCE: {
    label: "Find evidence",
    shortLabel: "Evidence",
    description: "Collect facts, examples, notes, and sources that can support a claim.",
    nextTitle: "Add evidence you can point to",
    nextDetail: "Find the strongest source, comparison, or data point that makes the pressure easier to explain."
  },
  TEST_SYSTEM: {
    label: "Test the system",
    shortLabel: "Model",
    description: "Preview how the league might change if the rules or conditions shift.",
    nextTitle: "Preview a system test",
    nextDetail: "Use a tool, model, or sandbox-style comparison to see what the pressure changes in the league."
  },
  MAKE_CASE: {
    label: "Make the case",
    shortLabel: "Case",
    description: "Turn the evidence into a clear explanation or recommendation.",
    nextTitle: "Explain what the evidence means",
    nextDetail: "Say what pattern you found, why it matters, and what action or conclusion the league should take seriously."
  },
  SHARE_WORK: {
    label: "Share the work",
    shortLabel: "Share",
    description: "Turn the research into something other people can read, use, or publish.",
    nextTitle: "Package the work so others can use it",
    nextDetail: "Tighten the title, sources, and final explanation so the work is ready to share or publish."
  }
};

export const researchStageOrder: ResearchStage[] = [
  "ASK_QUESTION",
  "FIND_EVIDENCE",
  "TEST_SYSTEM",
  "MAKE_CASE",
  "SHARE_WORK"
];

function hasText(value: string | null | undefined, min = 12) {
  return (value ?? "").trim().length >= min;
}

function mentionsModeling(value: string | null | undefined) {
  return /\b(model|simulate|simulation|sandbox|scenario|projection|tracker|calculator|what if)\b/i.test(
    value ?? ""
  );
}

function normalizeCurrentStage(completions: Record<ResearchStage, boolean>) {
  return researchStageOrder.find((stage) => !completions[stage]) ?? "SHARE_WORK";
}

export function getResearchStageMeta(stage: ResearchStage) {
  return stageMeta[stage];
}

export function buildResearchStageProgress(input: {
  completions?: Partial<Record<ResearchStage, boolean>>;
  currentStage?: ResearchStage;
  previewStages?: ResearchStage[];
  nextStep?: Partial<Record<ResearchStage, string>>;
  forceSimulationPreview?: boolean;
} = {}): ResearchStageProgress {
  const completions: Record<ResearchStage, boolean> = {
    ASK_QUESTION: Boolean(input.completions?.ASK_QUESTION),
    FIND_EVIDENCE: Boolean(input.completions?.FIND_EVIDENCE),
    TEST_SYSTEM: Boolean(input.completions?.TEST_SYSTEM),
    MAKE_CASE: Boolean(input.completions?.MAKE_CASE),
    SHARE_WORK: Boolean(input.completions?.SHARE_WORK)
  };
  const currentStage = input.currentStage ?? normalizeCurrentStage(completions);
  const previewStages = new Set(input.previewStages ?? []);

  return {
    currentResearchStage: currentStage,
    nextResearchStep: {
      title: stageMeta[currentStage].nextTitle,
      detail: input.nextStep?.[currentStage] ?? stageMeta[currentStage].nextDetail
    },
    researchStageProgress: researchStageOrder.map((stage) => ({
      id: stage,
      label: stageMeta[stage].label,
      shortLabel: stageMeta[stage].shortLabel,
      description: stageMeta[stage].description,
      status: completions[stage]
        ? "done"
        : stage === currentStage
          ? previewStages.has(stage)
            ? "preview"
            : "active"
          : previewStages.has(stage)
            ? "preview"
            : "upcoming"
    })),
    simulationPreviewAvailable:
      input.forceSimulationPreview ??
      (
        previewStages.has("TEST_SYSTEM") ||
        currentStage === "ASK_QUESTION" ||
        currentStage === "FIND_EVIDENCE" ||
        currentStage === "TEST_SYSTEM"
      )
  };
}

export function deriveProjectResearchSignals(project: ProjectResearchSource) {
  const lanePrimary = (project.lanePrimary ?? "ECONOMIC_INVESTIGATORS") as LaneTag;
  const content = parseProjectContent(project.contentJson, lanePrimary);
  const references = parseReferences(project.referencesJson);

  return {
    ASK_QUESTION:
      hasText(project.essentialQuestion) ||
      hasText(content.questionOrMission) ||
      hasText(project.summary, 18),
    FIND_EVIDENCE:
      references.length > 0 ||
      hasText(content.evidence) ||
      hasText(project.methodsSummary) ||
      hasText(content.context),
    TEST_SYSTEM:
      lanePrimary === "TOOL_BUILDERS" ||
      mentionsModeling(project.methodsSummary) ||
      mentionsModeling(project.title) ||
      mentionsModeling(content.evidence) ||
      mentionsModeling(content.analysis),
    MAKE_CASE:
      hasText(content.analysis) ||
      hasText(content.recommendations) ||
      hasText(project.findingsMd) ||
      hasText(content.overview),
    SHARE_WORK:
      Boolean(project.publicationSlug?.trim()) ||
      Boolean(
        project.submissionStatus &&
          new Set<SubmissionStatus>([
            SubmissionStatus.PUBLISHED_INTERNAL,
            SubmissionStatus.MARKED_EXTERNAL_READY,
            SubmissionStatus.APPROVED_FOR_EXTERNAL_PUBLICATION
          ]).has(project.submissionStatus)
      )
  } satisfies Record<ResearchStage, boolean>;
}

export function deriveProposalResearchSignals(proposal: ProposalResearchSource) {
  const content = parseProposalContent(proposal.contentJson);
  const references = parseReferences(proposal.referencesJson);

  return {
    ASK_QUESTION: Boolean(proposal.issueId) && (hasText(content.problem) || hasText(proposal.title, 8)),
    FIND_EVIDENCE:
      references.length > 0 ||
      hasText(proposal.methodsSummary) ||
      hasText(content.currentRuleContext) ||
      hasText(content.impactAnalysis),
    TEST_SYSTEM:
      Boolean(proposal.sandboxResultJson) ||
      mentionsModeling(proposal.methodsSummary) ||
      hasText(content.sandboxInterpretation),
    MAKE_CASE:
      hasText(content.impactAnalysis) ||
      hasText(content.tradeoffs) ||
      hasText(content.recommendation),
    SHARE_WORK:
      Boolean(
        proposal.status &&
          new Set<ProposalStatus>([
            ProposalStatus.PUBLISHED_INTERNAL,
            ProposalStatus.MARKED_EXTERNAL_READY,
            ProposalStatus.APPROVED_FOR_EXTERNAL_PUBLICATION
          ]).has(proposal.status)
      )
  } satisfies Record<ResearchStage, boolean>;
}

export function mergeResearchSignals(
  signalSets: Array<Partial<Record<ResearchStage, boolean>>>
): Record<ResearchStage, boolean> {
  return researchStageOrder.reduce(
    (record, stage) => ({
      ...record,
      [stage]: signalSets.some((signals) => Boolean(signals[stage]))
    }),
    {
      ASK_QUESTION: false,
      FIND_EVIDENCE: false,
      TEST_SYSTEM: false,
      MAKE_CASE: false,
      SHARE_WORK: false
    } satisfies Record<ResearchStage, boolean>
  );
}

export function buildStudentResearchProgress(input: {
  projectSignals: Array<Partial<Record<ResearchStage, boolean>>>;
  proposalSignals: Array<Partial<Record<ResearchStage, boolean>>>;
  publishedCount?: number;
  nextStep?: Partial<Record<ResearchStage, string>>;
  forceSimulationPreview?: boolean;
}) {
  const completions = mergeResearchSignals([...input.projectSignals, ...input.proposalSignals]);

  if ((input.publishedCount ?? 0) > 0) {
    completions.SHARE_WORK = true;
  }

  return buildResearchStageProgress({
    completions,
    nextStep: input.nextStep,
    previewStages: completions.TEST_SYSTEM ? [] : ["TEST_SYSTEM"],
    forceSimulationPreview: input.forceSimulationPreview
  });
}

export function buildResearchStageDisplay(currentStage: ResearchStage, input: {
  completedStages?: ResearchStage[];
  previewStages?: ResearchStage[];
  nextStepDetail?: string;
} = {}) {
  const completedStages = new Set(input.completedStages ?? []);
  const previewStages = new Set(input.previewStages ?? []);

  return buildResearchStageProgress({
    currentStage,
    completions: researchStageOrder.reduce(
      (record, stage) => ({
        ...record,
        [stage]: completedStages.has(stage)
      }),
      {} as Partial<Record<ResearchStage, boolean>>
    ),
    previewStages: Array.from(previewStages),
    nextStep: input.nextStepDetail ? { [currentStage]: input.nextStepDetail } : undefined
  });
}

function buildMilestone(stage: ResearchStage, source: MilestoneSource | null): ResearchMilestone {
  return {
    stage,
    label: stageMeta[stage].label,
    description: stageMeta[stage].description,
    achieved: Boolean(source),
    sourceLabel: source?.label ?? null,
    createdAt: source?.createdAt ?? null
  };
}

export function deriveResearchMilestones(input: {
  questionSources: MilestoneSource[];
  evidenceSources: MilestoneSource[];
  modelSources: MilestoneSource[];
  argumentSources: MilestoneSource[];
  publicationSources: MilestoneSource[];
}) {
  const earliest = (sources: MilestoneSource[]) =>
    [...sources].sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())[0] ?? null;

  return [
    buildMilestone("ASK_QUESTION", earliest(input.questionSources)),
    buildMilestone("FIND_EVIDENCE", earliest(input.evidenceSources)),
    buildMilestone("TEST_SYSTEM", earliest(input.modelSources)),
    buildMilestone("MAKE_CASE", earliest(input.argumentSources)),
    buildMilestone("SHARE_WORK", earliest(input.publicationSources))
  ];
}

export function sourceKey(sourceType: PublicationSourceType, sourceId: string) {
  return `${sourceType}:${sourceId}`;
}
