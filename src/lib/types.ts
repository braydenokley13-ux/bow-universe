import {
  GradeBand,
  MarketSizeTier,
  ProjectType,
  PublicationType,
  SubmissionStatus
} from "@prisma/client";

export type LaneTag =
  | "TOOL_BUILDERS"
  | "POLICY_REFORM_ARCHITECTS"
  | "STRATEGIC_OPERATORS"
  | "ECONOMIC_INVESTIGATORS";

export type LeagueRulesV1 = {
  capGrowthRate: number;
  luxuryTaxBrackets: Array<{
    label: string;
    thresholdMultiplier: number | null;
    rate: number;
  }>;
  secondApronThreshold: number;
  revenueSharingRate: number;
};

export type RuleDiffChange = {
  op: "replace" | "add" | "remove";
  path: string;
  value?: unknown;
  reason?: string;
};

export type RuleDiff = {
  changes: RuleDiffChange[];
};

export type ProposalNarrative = {
  problem: string;
  proposedChange: string;
  expectedImpact: string;
  tradeoffs: string;
};

export type LeagueMetricSnapshot = {
  parityIndex: number;
  taxConcentration: number;
  revenueInequality: number;
  smallVsBigCompetitiveness: number;
};

export type SandboxImpactReport = {
  baseline: LeagueMetricSnapshot;
  proposed: LeagueMetricSnapshot;
  delta: LeagueMetricSnapshot;
  explanation: string[];
};

export type IssueMetrics = Partial<LeagueMetricSnapshot> & {
  triggerReason?: string;
};

export type ArtifactLink = {
  label: string;
  url: string;
};

export type ReferenceEntry = {
  label: string;
  url: string;
  sourceType: "ARTICLE" | "DATASET" | "INTERVIEW" | "TOOL" | "OTHER";
  note?: string;
};

export type LaneSectionEntry = {
  key: string;
  title: string;
  prompt: string;
  value: string;
};

export type ProjectSubmissionContent = {
  overview: string;
  questionOrMission: string;
  context: string;
  evidence: string;
  analysis: string;
  recommendations: string;
  laneSections: LaneSectionEntry[];
  artifacts: ArtifactLink[];
  reflection: string;
};

export type ProposalSubmissionContent = {
  problem: string;
  currentRuleContext: string;
  proposedChange: string;
  impactAnalysis: string;
  tradeoffs: string;
  sandboxInterpretation: string;
  recommendation: string;
};

export type SubmissionChecklistItem = {
  key: string;
  label: string;
  detail: string;
  complete: boolean;
};

export type PublicationMetadata = {
  title: string;
  subtitle?: string;
  abstract: string;
  keywords: string[];
  authorLine: string;
  publicationType: PublicationType;
  publishedAt?: string | null;
  version: number;
  citationText: string;
  issue?: string | null;
  team?: string | null;
  season?: string | null;
  externalReady: boolean;
  externalApproved: boolean;
};

export type PublicationCard = {
  title: string;
  publicationType: PublicationType;
  abstract: string;
  lane: string | null;
  issue: string | null;
  team: string | null;
  publishedAt: string | null;
  slug: string;
  externalReady: boolean;
};

export type LaneTemplateDefinition = {
  lane: LaneTag;
  publicationType: PublicationType;
  outputLabel: string;
  overviewLabel: string;
  steps: string[];
  requiredSections: string[];
  checklist: Array<{
    key: string;
    label: string;
    detail: string;
  }>;
  examples: Array<{
    title: string;
    body: string;
  }>;
  laneSections: Array<{
    key: string;
    title: string;
    prompt: string;
  }>;
  externalReadinessRules: string[];
};

export type ContractSalarySeries = number[];

export type TeamSimulationInput = {
  id: string;
  name: string;
  marketSizeTier: MarketSizeTier;
  ownerDisciplineScore: number;
  salaries: ContractSalarySeries[];
};

export type TeamSimulationResult = {
  teamId: string;
  teamName: string;
  payroll: number;
  taxPaid: number;
  revenue: number;
  valuation: number;
  performanceProxy: number;
};

export const laneTagLabels: Record<LaneTag, string> = {
  TOOL_BUILDERS: "Lane 1 · Tool Builders",
  POLICY_REFORM_ARCHITECTS: "Lane 2 · Policy Reform Architects",
  STRATEGIC_OPERATORS: "Lane 3 · Strategic Operators",
  ECONOMIC_INVESTIGATORS: "Lane 4 · Economic Investigators"
};

export const projectTypeLabels: Record<ProjectType, string> = {
  TOOL: "Tool",
  INVESTIGATION: "Investigation",
  STRATEGY: "Strategy",
  PROPOSAL_SUPPORT: "Proposal Support"
};

export const submissionStatusLabels: Record<SubmissionStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  REVISION_REQUESTED: "Revision Requested",
  APPROVED_FOR_INTERNAL_PUBLICATION: "Approved for Internal Publication",
  PUBLISHED_INTERNAL: "Published Internally",
  MARKED_EXTERNAL_READY: "Marked External Ready",
  APPROVED_FOR_EXTERNAL_PUBLICATION: "Approved for External Publication"
};

export const publicationTypeLabels: Record<PublicationType, string> = {
  TOOL_BRIEF: "Tool Brief",
  POLICY_MEMO: "Policy Memo",
  TEAM_STRATEGY_DOSSIER: "Team Strategy Dossier",
  RESEARCH_BRIEF: "Research Brief"
};

export const gradeBandLabels: Record<GradeBand, string> = {
  GRADE_5_6: "Grades 5-6",
  GRADE_7_8: "Grades 7-8"
};

export const gradeBandDescriptions: Record<GradeBand, string> = {
  GRADE_5_6: "Smaller steps, fewer choices at once, and clearer helper text.",
  GRADE_7_8: "More independence, broader tools, and deeper project choices."
};
