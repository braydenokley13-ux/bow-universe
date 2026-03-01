import { describe, expect, it } from "vitest";

import {
  assessProposalCoach,
  createInitialProposalCoachValues,
  defaultProposalDiffJson,
  getSandboxFingerprint,
  getStepStatusLabel,
  isProposalCoachStepId,
  proposalCoachStepOrder
} from "@/lib/proposal-wizard";

function completeValues() {
  return createInitialProposalCoachValues({
    issueId: "issue-1",
    ruleSetId: "ruleset-1",
    title: "Raise the revenue sharing rate to protect small-market flexibility",
    abstract:
      "The league is squeezing smaller markets during short spending windows. This memo proposes a modest revenue sharing increase. If adopted, the change would give smaller markets more flexibility while preserving league pressure.",
    problem:
      "Small-market teams lose planned flexibility when spending pressure rises, which makes it harder for those teams to move from rebuilding into short competitive windows.",
    currentRuleContext:
      "Under the current RuleSet, high spending pressure and the present sharing structure combine to limit how smaller markets can hold a viable core together once costs rise.",
    proposedChange:
      "The league should raise the revenue sharing rate slightly so smaller-market teams keep more short-term roster flexibility during a build-up window.",
    expectedImpact:
      "If the league changes this rule, smaller-market teams would gain more breathing room, while top-revenue teams would lose some spending freedom because more local revenue would flow back into the league pool.",
    tradeoffs:
      "This reform helps smaller markets, but it also reduces the freedom of high-revenue teams and could create new pressure around how much local success they can convert into immediate roster upgrades.",
    recommendation:
      "The commissioner should adopt a small increase in the revenue sharing rate for the next rules cycle because the added parity support outweighs the loss of spending freedom for top-revenue teams.",
    methodsSummary:
      "I compared the active RuleSet to a proposed rule diff and used the BOW sandbox to study likely league effects.",
    diffJson: defaultProposalDiffJson,
    sandboxInterpretation:
      "The sandbox suggests the reform would shift a little flexibility toward smaller markets, which means the league could improve balance without fully removing spending pressure.",
    references:
      "League finance note | https://example.com | ARTICLE | Explains the revenue-sharing rationale",
    keywords: "revenue sharing, small-market teams, league parity",
    keyTakeaways:
      "A higher sharing pool would give smaller markets more short-term roster flexibility.\nThe reform helps parity without fully removing spending pressure.",
    publicationSlug: "raise-revenue-sharing-rate"
  });
}

describe("proposal coach wizard", () => {
  it("keeps the expected step order", () => {
    expect(proposalCoachStepOrder).toEqual([
      "issue",
      "ruleset",
      "title",
      "abstract",
      "problem",
      "currentRule",
      "reform",
      "impact",
      "tradeoffs",
      "action",
      "sandbox",
      "review"
    ]);
  });

  it("finds the first incomplete step for a new draft", () => {
    const assessment = assessProposalCoach(createInitialProposalCoachValues(), {
      result: null,
      runFingerprint: null
    });

    expect(assessment.firstIncompleteStepId).toBe("issue");
    expect(assessment.nextAction).toContain("Choose the issue");
  });

  it("classifies title quality and keeps submit blocked for weak content", () => {
    const assessment = assessProposalCoach(
      createInitialProposalCoachValues({
        issueId: "issue-1",
        ruleSetId: "ruleset-1",
        title: "Fairness idea"
      }),
      { result: null, runFingerprint: null }
    );

    expect(assessment.fields.title.state).toBe("starting");
    expect(assessment.fields.title.complete).toBe(false);
    expect(assessment.reviewBuckets.blockers.items.some((item) => item.includes("Decision title"))).toBe(true);
    expect(assessment.submitReady).toBe(false);
  });

  it("marks the action step as strong when recommendation is ready but methods are optional", () => {
    const values = completeValues();
    values.methodsSummary = "";
    const fingerprint = getSandboxFingerprint(values.ruleSetId, values.diffJson);

    const assessment = assessProposalCoach(values, {
      result: {
        baseline: {
          parityIndex: 1,
          taxConcentration: 1,
          revenueInequality: 1,
          smallVsBigCompetitiveness: 1
        },
        proposed: {
          parityIndex: 1.2,
          taxConcentration: 0.9,
          revenueInequality: 0.95,
          smallVsBigCompetitiveness: 1.1
        },
        delta: {
          parityIndex: 0.2,
          taxConcentration: -0.1,
          revenueInequality: -0.05,
          smallVsBigCompetitiveness: 0.1
        },
        explanation: ["A modest shift toward small-market flexibility."]
      },
      runFingerprint: fingerprint
    });

    expect(assessment.steps.action.status).toBe("strong");
    expect(getStepStatusLabel(assessment.steps.action.status)).toBe("Strong");
  });

  it("treats a fresh sandbox result as submit-ready when required fields are strong", () => {
    const values = completeValues();
    const fingerprint = getSandboxFingerprint(values.ruleSetId, values.diffJson);

    const assessment = assessProposalCoach(values, {
      result: {
        baseline: {
          parityIndex: 1,
          taxConcentration: 1,
          revenueInequality: 1,
          smallVsBigCompetitiveness: 1
        },
        proposed: {
          parityIndex: 1.2,
          taxConcentration: 0.9,
          revenueInequality: 0.95,
          smallVsBigCompetitiveness: 1.1
        },
        delta: {
          parityIndex: 0.2,
          taxConcentration: -0.1,
          revenueInequality: -0.05,
          smallVsBigCompetitiveness: 0.1
        },
        explanation: ["A modest shift toward small-market flexibility."]
      },
      runFingerprint: fingerprint
    });

    expect(assessment.sandboxFreshness).toBe("fresh");
    expect(assessment.fields.sandboxResult.complete).toBe(true);
    expect(assessment.submitReady).toBe(true);
    expect(assessment.reviewBuckets.blockers.items).toHaveLength(0);
  });

  it("marks the sandbox stale after the diff changes", () => {
    const values = completeValues();
    const originalFingerprint = getSandboxFingerprint(values.ruleSetId, values.diffJson);
    values.diffJson = `{
  "changes": [
    {
      "op": "replace",
      "path": "/revenueSharingRate",
      "value": 0.17,
      "reason": "Raise the league sharing pool a little more."
    }
  ]
}`;

    const assessment = assessProposalCoach(values, {
      result: {
        baseline: {
          parityIndex: 1,
          taxConcentration: 1,
          revenueInequality: 1,
          smallVsBigCompetitiveness: 1
        },
        proposed: {
          parityIndex: 1.2,
          taxConcentration: 0.9,
          revenueInequality: 0.95,
          smallVsBigCompetitiveness: 1.1
        },
        delta: {
          parityIndex: 0.2,
          taxConcentration: -0.1,
          revenueInequality: -0.05,
          smallVsBigCompetitiveness: 0.1
        },
        explanation: ["A modest shift toward small-market flexibility."]
      },
      runFingerprint: originalFingerprint
    });

    expect(assessment.sandboxFreshness).toBe("stale");
    expect(assessment.submitReady).toBe(false);
    expect(assessment.reviewBuckets.blockers.items[0]).toContain("You changed the rule after the last sandbox run");
  });

  it("reports invalid diff input clearly", () => {
    const values = completeValues();
    values.diffJson = '{"changes": [';

    const assessment = assessProposalCoach(values, {
      result: null,
      runFingerprint: null
    });

    expect(assessment.diffError).toBeTruthy();
    expect(assessment.sandboxFreshness).toBe("invalid");
    expect(assessment.fields.diffJson.complete).toBe(false);
    expect(assessment.fields.diffJson.message).toContain("usable JSON");
  });

  it("validates step ids from the query string", () => {
    expect(isProposalCoachStepId("sandbox")).toBe(true);
    expect(isProposalCoachStepId("unknown")).toBe(false);
    expect(isProposalCoachStepId(null)).toBe(false);
  });
});
