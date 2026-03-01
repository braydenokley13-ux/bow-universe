import { MarketSizeTier, ProjectType } from "@prisma/client";

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
