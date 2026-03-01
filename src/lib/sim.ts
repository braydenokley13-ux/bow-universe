import { MarketSizeTier } from "@prisma/client";

import type {
  IssueMetrics,
  LeagueMetricSnapshot,
  LeagueRulesV1,
  RuleDiff,
  SandboxImpactReport,
  TeamSimulationInput,
  TeamSimulationResult
} from "@/lib/types";
import { applyRuleDiff } from "@/lib/rules";
import { roundTo } from "@/lib/utils";

const MARKET_FACTORS: Record<MarketSizeTier, number> = {
  SMALL: 0.92,
  MID: 1,
  LARGE: 1.1,
  MEGA: 1.22
};

export const issueThresholds = {
  marketInequality: 1.65,
  taxArmsRace: 0.72,
  smallMarketCompetitiveness: 0.85,
  parityInstability: 14
} as const;

export type SimulatedSeason = {
  nextCap: number;
  teamResults: TeamSimulationResult[];
  metrics: LeagueMetricSnapshot;
};

type RevenueSeed = TeamSimulationResult & {
  marketSizeTier: MarketSizeTier;
  rawRevenue: number;
  revenueSharingContribution: number;
  ownerDisciplineScore: number;
};

function safeSalarySeries(series: unknown) {
  if (!Array.isArray(series)) {
    return [];
  }

  return series.map((value) => Number(value) || 0);
}

export function getContractSalaryForYear(
  annualSalaryJson: unknown,
  startYear: number,
  years: number,
  seasonYear: number
) {
  if (seasonYear < startYear || seasonYear >= startYear + years) {
    return 0;
  }

  const salaries = safeSalarySeries(annualSalaryJson);
  const offset = seasonYear - startYear;

  return salaries[offset] ?? 0;
}

export function calculatePayrollForYear(
  salaries: TeamSimulationInput["salaries"],
  seasonYear: number,
  contractStartYears: number[],
  contractYears: number[]
) {
  let payroll = 0;

  for (let index = 0; index < salaries.length; index += 1) {
    payroll += getContractSalaryForYear(
      salaries[index],
      contractStartYears[index],
      contractYears[index],
      seasonYear
    );
  }

  return roundTo(payroll, 2);
}

export function calculateLuxuryTax(payroll: number, cap: number, rules: LeagueRulesV1) {
  const orderedBrackets = [...rules.luxuryTaxBrackets].sort((left, right) => {
    const leftThreshold = left.thresholdMultiplier ?? Number.POSITIVE_INFINITY;
    const rightThreshold = right.thresholdMultiplier ?? Number.POSITIVE_INFINITY;

    return leftThreshold - rightThreshold;
  });

  let totalTax = 0;

  for (let index = 0; index < orderedBrackets.length; index += 1) {
    const bracket = orderedBrackets[index];
    const lowerBound = (bracket.thresholdMultiplier ?? 0) * cap;
    const nextBracket = orderedBrackets[index + 1];
    const upperBound =
      nextBracket?.thresholdMultiplier == null
        ? Number.POSITIVE_INFINITY
        : nextBracket.thresholdMultiplier * cap;

    const taxableAmount = Math.min(Math.max(payroll - lowerBound, 0), upperBound - lowerBound);
    totalTax += taxableAmount * bracket.rate;
  }

  return roundTo(Math.max(totalTax, 0), 2);
}

function computeParityIndex(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - average) ** 2, 0) / values.length;

  return roundTo(Math.sqrt(variance), 2);
}

function averageByTier(results: RevenueSeed[], tiers: MarketSizeTier[]) {
  const matches = results.filter((result) => tiers.includes(result.marketSizeTier));

  if (matches.length === 0) {
    return 0;
  }

  return matches.reduce((sum, result) => sum + result.performanceProxy, 0) / matches.length;
}

export function calculateLeagueMetrics(teamResults: RevenueSeed[] | TeamSimulationResult[]) {
  if (teamResults.length === 0) {
    return {
      parityIndex: 0,
      taxConcentration: 0,
      revenueInequality: 0,
      smallVsBigCompetitiveness: 0
    };
  }

  const parityIndex = computeParityIndex(teamResults.map((team) => team.performanceProxy));
  const revenues = teamResults.map((team) => team.revenue);
  const highestRevenue = Math.max(...revenues);
  const lowestRevenue = Math.min(...revenues);
  const revenueInequality = roundTo(highestRevenue / Math.max(lowestRevenue, 1), 2);

  const sortedTax = [...teamResults].sort((left, right) => right.taxPaid - left.taxPaid);
  const totalTax = sortedTax.reduce((sum, team) => sum + team.taxPaid, 0);
  const topThreeTax = sortedTax.slice(0, 3).reduce((sum, team) => sum + team.taxPaid, 0);
  const taxConcentration = roundTo(totalTax === 0 ? 0 : topThreeTax / totalTax, 2);

  const typedResults = teamResults as RevenueSeed[];
  const smallAverage = averageByTier(typedResults, [MarketSizeTier.SMALL]);
  const bigAverage = averageByTier(typedResults, [MarketSizeTier.LARGE, MarketSizeTier.MEGA]);
  const smallVsBigCompetitiveness = roundTo(
    bigAverage === 0 ? 0 : smallAverage / bigAverage,
    2
  );

  return {
    parityIndex,
    taxConcentration,
    revenueInequality,
    smallVsBigCompetitiveness
  };
}

export function simulateSeason(params: {
  currentCap: number;
  seasonYear: number;
  rules: LeagueRulesV1;
  teams: Array<
    TeamSimulationInput & {
      contractStartYears: number[];
      contractYears: number[];
    }
  >;
}): SimulatedSeason {
  const nextCap = Math.round(params.currentCap * (1 + params.rules.capGrowthRate));
  const preliminary: RevenueSeed[] = params.teams.map((team) => {
    const payroll = calculatePayrollForYear(
      team.salaries,
      params.seasonYear,
      team.contractStartYears,
      team.contractYears
    );
    const taxPaid = calculateLuxuryTax(payroll, nextCap, params.rules);
    const marketFactor = MARKET_FACTORS[team.marketSizeTier];
    const teamStrength =
      50 +
      30 * (payroll / nextCap - 1) +
      12 * (marketFactor - 1) +
      8 * (team.ownerDisciplineScore - 1) -
      10 * (taxPaid / nextCap);
    const performanceProxy = Math.min(95, Math.max(20, Math.round(teamStrength)));
    const rawRevenue = nextCap * (1.1 + 0.45 * marketFactor + 0.01 * performanceProxy);
    const revenueSharingContribution = rawRevenue * params.rules.revenueSharingRate;

    return {
      teamId: team.id,
      teamName: team.name,
      marketSizeTier: team.marketSizeTier,
      ownerDisciplineScore: team.ownerDisciplineScore,
      payroll,
      taxPaid,
      performanceProxy,
      rawRevenue,
      revenueSharingContribution,
      revenue: 0,
      valuation: 0
    };
  });

  const totalContribution = preliminary.reduce(
    (sum, team) => sum + team.revenueSharingContribution,
    0
  );
  const equalDistribution = preliminary.length === 0 ? 0 : totalContribution / preliminary.length;

  const teamResults: RevenueSeed[] = preliminary.map((team) => {
    const revenue = roundTo(
      team.rawRevenue - team.revenueSharingContribution + equalDistribution,
      2
    );
    const stabilityFactor = nextCap * 0.15 * team.ownerDisciplineScore;
    const valuation = roundTo(revenue * 4.2 - team.taxPaid + stabilityFactor, 2);

    return {
      ...team,
      revenue,
      valuation
    };
  });

  return {
    nextCap,
    teamResults,
    metrics: calculateLeagueMetrics(teamResults)
  };
}

export function compareRuleOutcomes(params: {
  currentCap: number;
  nextSeasonYear: number;
  activeRules: LeagueRulesV1;
  diff: RuleDiff;
  teams: Array<
    TeamSimulationInput & {
      contractStartYears: number[];
      contractYears: number[];
    }
  >;
}): SandboxImpactReport {
  const baseline = simulateSeason({
    currentCap: params.currentCap,
    seasonYear: params.nextSeasonYear,
    rules: params.activeRules,
    teams: params.teams
  });
  const proposedRules = applyRuleDiff(params.activeRules, params.diff);
  const proposed = simulateSeason({
    currentCap: params.currentCap,
    seasonYear: params.nextSeasonYear,
    rules: proposedRules,
    teams: params.teams
  });

  const delta = {
    parityIndex: roundTo(proposed.metrics.parityIndex - baseline.metrics.parityIndex, 2),
    taxConcentration: roundTo(
      proposed.metrics.taxConcentration - baseline.metrics.taxConcentration,
      2
    ),
    smallVsBigCompetitiveness: roundTo(
      proposed.metrics.smallVsBigCompetitiveness - baseline.metrics.smallVsBigCompetitiveness,
      2
    ),
    revenueInequality: roundTo(
      proposed.metrics.revenueInequality - baseline.metrics.revenueInequality,
      2
    )
  };

  const explanation = [
    `Cap moves from ${baseline.nextCap}M under the baseline rules to ${proposed.nextCap}M under the proposal.`,
    `Parity index changes by ${delta.parityIndex.toFixed(2)} points.`,
    `Tax concentration changes by ${delta.taxConcentration.toFixed(2)}.`,
    `Small-versus-big competitiveness changes by ${delta.smallVsBigCompetitiveness.toFixed(2)}.`,
    `Revenue inequality changes by ${delta.revenueInequality.toFixed(2)}.`
  ];

  return {
    baseline: baseline.metrics,
    proposed: proposed.metrics,
    delta,
    explanation
  };
}

export function deriveIssueAlerts(metrics: LeagueMetricSnapshot) {
  const alerts: Array<{
    slug: string;
    title: string;
    description: string;
    severity: number;
    status: "OPEN";
    metrics: IssueMetrics;
  }> = [];

  if (metrics.revenueInequality > issueThresholds.marketInequality) {
    alerts.push({
      slug: "market-inequality",
      title: "Market inequality is widening elite-team advantages",
      description:
        "Revenue gaps have crossed the league threshold, signalling that larger markets are pulling away from the rest of the field.",
      severity: 5,
      status: "OPEN",
      metrics: {
        revenueInequality: metrics.revenueInequality,
        triggerReason: `Revenue inequality exceeded ${issueThresholds.marketInequality.toFixed(2)}.`
      }
    });
  }

  if (metrics.taxConcentration > issueThresholds.taxArmsRace) {
    alerts.push({
      slug: "tax-arms-race",
      title: "Luxury-tax spending is concentrating too tightly",
      description:
        "The top tax-paying teams are carrying too much of the tax burden, suggesting the policy is distorting incentives unevenly.",
      severity: 4,
      status: "OPEN",
      metrics: {
        taxConcentration: metrics.taxConcentration,
        triggerReason: `Tax concentration exceeded ${issueThresholds.taxArmsRace.toFixed(2)}.`
      }
    });
  }

  if (metrics.smallVsBigCompetitiveness < issueThresholds.smallMarketCompetitiveness) {
    alerts.push({
      slug: "small-market-retention",
      title: "Small-market teams need stronger retention pathways",
      description:
        "Small-market clubs have fallen below the competitiveness floor against large and mega-market teams.",
      severity: 4,
      status: "OPEN",
      metrics: {
        smallVsBigCompetitiveness: metrics.smallVsBigCompetitiveness,
        triggerReason: `Small-vs-big competitiveness fell below ${issueThresholds.smallMarketCompetitiveness.toFixed(2)}.`
      }
    });
  }

  if (metrics.parityIndex > issueThresholds.parityInstability) {
    alerts.push({
      slug: "parity-instability",
      title: "Parity instability is widening performance gaps",
      description:
        "The spread between strong and weak teams is now large enough to create a new parity concern.",
      severity: 4,
      status: "OPEN",
      metrics: {
        parityIndex: metrics.parityIndex,
        triggerReason: `Parity index exceeded ${issueThresholds.parityInstability.toFixed(2)}.`
      }
    });
  }

  return alerts;
}
