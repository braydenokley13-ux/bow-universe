import type { LeagueRulesV1, RuleDiff } from "@/lib/types";

export type SliderState = {
  capGrowthRate: number;
  revenueSharingRate: number;
  secondApronThreshold: number;
  luxuryTaxBrackets: Array<{
    label: string;
    thresholdMultiplier: number | null;
    rate: number;
  }>;
};

export function sliderStateFromRules(rules: LeagueRulesV1): SliderState {
  return {
    capGrowthRate: rules.capGrowthRate,
    revenueSharingRate: rules.revenueSharingRate,
    secondApronThreshold: rules.secondApronThreshold,
    luxuryTaxBrackets: rules.luxuryTaxBrackets.map((b) => ({ ...b }))
  };
}

export function buildDiffFromSliders(baseline: LeagueRulesV1, current: SliderState): RuleDiff {
  const changes: RuleDiff["changes"] = [];

  if (current.capGrowthRate !== baseline.capGrowthRate) {
    changes.push({
      op: "replace",
      path: "/capGrowthRate",
      value: current.capGrowthRate,
      reason: `Cap growth rate changed from ${(baseline.capGrowthRate * 100).toFixed(1)}% to ${(current.capGrowthRate * 100).toFixed(1)}%`
    });
  }

  if (current.revenueSharingRate !== baseline.revenueSharingRate) {
    changes.push({
      op: "replace",
      path: "/revenueSharingRate",
      value: current.revenueSharingRate,
      reason: `Revenue sharing rate changed from ${(baseline.revenueSharingRate * 100).toFixed(1)}% to ${(current.revenueSharingRate * 100).toFixed(1)}%`
    });
  }

  if (current.secondApronThreshold !== baseline.secondApronThreshold) {
    changes.push({
      op: "replace",
      path: "/secondApronThreshold",
      value: current.secondApronThreshold,
      reason: `Second apron threshold changed from ${(baseline.secondApronThreshold * 100).toFixed(1)}% to ${(current.secondApronThreshold * 100).toFixed(1)}%`
    });
  }

  const baselineJson = JSON.stringify(baseline.luxuryTaxBrackets);
  const currentJson = JSON.stringify(current.luxuryTaxBrackets);
  if (baselineJson !== currentJson) {
    changes.push({
      op: "replace",
      path: "/luxuryTaxBrackets",
      value: current.luxuryTaxBrackets,
      reason: "Luxury tax brackets modified"
    });
  }

  return { changes };
}

export function isSliderStateDirty(baseline: LeagueRulesV1, current: SliderState): boolean {
  return buildDiffFromSliders(baseline, current).changes.length > 0;
}
