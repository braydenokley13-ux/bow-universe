import { describe, expect, it } from "vitest";

import { applyRuleDiff } from "@/lib/rules";
import type { LeagueRulesV1 } from "@/lib/types";

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

describe("applyRuleDiff", () => {
  it("updates allowed root fields", () => {
    const nextRules = applyRuleDiff(baseRules, {
      changes: [{ op: "replace", path: "/revenueSharingRate", value: 0.17 }]
    });

    expect(nextRules.revenueSharingRate).toBe(0.17);
  });

  it("rejects illegal paths", () => {
    expect(() =>
      applyRuleDiff(baseRules, {
        changes: [{ op: "replace", path: "/totallyUnknownField", value: 1 }]
      })
    ).toThrow(/Illegal rule diff path/);
  });
});
