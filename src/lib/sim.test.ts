import { MarketSizeTier, ProposalStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { calculateLuxuryTax, compareRuleOutcomes, simulateSeason } from "@/lib/sim";
import type { LeagueRulesV1 } from "@/lib/types";
import { canVoteOnProposal } from "@/server/workflows";

const baseRules: LeagueRulesV1 = {
  capGrowthRate: 0.08,
  luxuryTaxBrackets: [
    { label: "Tax line", thresholdMultiplier: 1, rate: 1.5 },
    { label: "Upper band", thresholdMultiplier: 1.1, rate: 2.25 },
    { label: "Second apron", thresholdMultiplier: 1.18, rate: 3.0 }
  ],
  secondApronThreshold: 1.18,
  revenueSharingRate: 0.14
};

describe("simulation math", () => {
  it("calculates progressive luxury tax across multiple brackets", () => {
    const tax = calculateLuxuryTax(130, 100, baseRules);
    expect(tax).toBe(69);
  });

  it("produces zero parity index for identical teams", () => {
    const result = simulateSeason({
      currentCap: 100,
      seasonYear: 2029,
      rules: baseRules,
      teams: [
        {
          id: "a",
          name: "Alpha",
          marketSizeTier: MarketSizeTier.MID,
          ownerDisciplineScore: 1,
          salaries: [[100]],
          contractStartYears: [2029],
          contractYears: [1]
        },
        {
          id: "b",
          name: "Beta",
          marketSizeTier: MarketSizeTier.MID,
          ownerDisciplineScore: 1,
          salaries: [[100]],
          contractStartYears: [2029],
          contractYears: [1]
        }
      ]
    });

    expect(result.metrics.parityIndex).toBe(0);
  });

  it("revenue sharing reduces inequality in a fixed fixture", () => {
    const noSharing = simulateSeason({
      currentCap: 100,
      seasonYear: 2029,
      rules: {
        ...baseRules,
        revenueSharingRate: 0
      },
      teams: [
        {
          id: "small",
          name: "Small",
          marketSizeTier: MarketSizeTier.SMALL,
          ownerDisciplineScore: 1,
          salaries: [[95]],
          contractStartYears: [2029],
          contractYears: [1]
        },
        {
          id: "mega",
          name: "Mega",
          marketSizeTier: MarketSizeTier.MEGA,
          ownerDisciplineScore: 1,
          salaries: [[120]],
          contractStartYears: [2029],
          contractYears: [1]
        }
      ]
    });

    const withSharing = simulateSeason({
      currentCap: 100,
      seasonYear: 2029,
      rules: {
        ...baseRules,
        revenueSharingRate: 0.2
      },
      teams: [
        {
          id: "small",
          name: "Small",
          marketSizeTier: MarketSizeTier.SMALL,
          ownerDisciplineScore: 1,
          salaries: [[95]],
          contractStartYears: [2029],
          contractYears: [1]
        },
        {
          id: "mega",
          name: "Mega",
          marketSizeTier: MarketSizeTier.MEGA,
          ownerDisciplineScore: 1,
          salaries: [[120]],
          contractStartYears: [2029],
          contractYears: [1]
        }
      ]
    });

    expect(withSharing.metrics.revenueInequality).toBeLessThan(noSharing.metrics.revenueInequality);
  });

  it("returns zero deltas for an empty sandbox diff", () => {
    const report = compareRuleOutcomes({
      currentCap: 100,
      nextSeasonYear: 2029,
      activeRules: baseRules,
      diff: { changes: [] },
      teams: [
        {
          id: "alpha",
          name: "Alpha",
          marketSizeTier: MarketSizeTier.MID,
          ownerDisciplineScore: 1,
          salaries: [[100]],
          contractStartYears: [2029],
          contractYears: [1]
        }
      ]
    });

    expect(report.delta).toEqual({
      parityIndex: 0,
      taxConcentration: 0,
      smallVsBigCompetitiveness: 0,
      revenueInequality: 0
    });
  });
});

describe("voting guardrails", () => {
  it("only allows voting inside an active voting window", () => {
    const now = Date.now();

    expect(
      canVoteOnProposal({
        status: ProposalStatus.VOTING,
        voteStart: new Date(now - 60_000),
        voteEnd: new Date(now + 60_000)
      })
    ).toBe(true);

    expect(
      canVoteOnProposal({
        status: ProposalStatus.VOTING,
        voteStart: new Date(now + 60_000),
        voteEnd: new Date(now + 120_000)
      })
    ).toBe(false);
  });
});
