import { ProjectType, ProposalStatus, SubmissionStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { getProjectReviewReadiness, getProposalReviewReadiness } from "@/lib/review-readiness";

describe("review readiness", () => {
  it("builds proposal must-fix items from weak content", () => {
    const result = getProposalReviewReadiness({
      title: "Idea",
      issueId: "issue-1",
      ruleSetIdTarget: "ruleset-1",
      abstract: "short",
      methodsSummary: "",
      diffJson: { changes: [] },
      narrativeJson: {
        problem: "",
        proposedChange: "",
        expectedImpact: "",
        tradeoffs: ""
      },
      sandboxResultJson: null,
      contentJson: {
        problem: "",
        currentRuleContext: "",
        proposedChange: "",
        impactAnalysis: "",
        tradeoffs: "",
        sandboxInterpretation: "",
        recommendation: ""
      },
      referencesJson: [],
      keywordsJson: [],
      keyTakeawaysJson: [],
      publicationSlug: null,
      status: ProposalStatus.DRAFT
    });

    expect(result.readyForWorkflow).toBe(false);
    expect(result.buckets.must_fix.items.length).toBeGreaterThan(0);
    expect(result.checklist.some((item) => item.bucket === "must_fix")).toBe(true);
  });

  it("marks a strong project as workflow ready", () => {
    const result = getProjectReviewReadiness({
      title: "How the second apron changes small-market flexibility",
      summary:
        "This project studies how teams lose planning freedom before they lose spending desire, and it explains why that timing matters for league strategy.",
      abstract:
        "This project studies how second-apron pressure changes planning freedom. It uses league records and examples to trace the pattern. It finds that optionality disappears earlier than most readers expect.",
      essentialQuestion: "How does the second apron change planning freedom for small-market teams?",
      methodsSummary:
        "I compared league pressure points, team examples, and publication patterns to trace when planning tools disappear and how that changes decision-making.",
      publicationSlug: "second-apron-flexibility",
      findingsMd:
        "League records and comparison notes show that options disappear early, well before a casual reader would say the team has reached its hardest spending limit.",
      laneTagsJson: ["ECONOMIC_INVESTIGATORS"],
      artifactLinksJson: [{ label: "Chart pack", url: "https://example.com/chart" }],
      contentJson: {
        overview:
          "The main point is that flexibility disappears before payroll peaks, which means the rule changes team behavior earlier than readers usually expect.",
        questionOrMission: "How does the second apron change planning freedom for small-market teams?",
        context:
          "The apron matters because tools disappear before a team is fully trapped, so the rule can shape behavior earlier than a simple payroll snapshot suggests.",
        evidence:
          "The main evidence comes from league records, payroll pressure examples, and comparisons between what teams could do before and after key constraints appeared.",
        analysis:
          "The pattern suggests teams lose optionality early, which changes planning behavior and pushes clubs into more cautious long-term choices than readers might expect from surface payroll totals alone.",
        recommendations:
          "Readers should test narrower timing changes instead of a total removal, because the evidence suggests the timing of disappearing tools is the real pressure point.",
        reflection: "",
        artifacts: [{ label: "Chart pack", url: "https://example.com/chart" }],
        laneSections: [
          {
            key: "pattern",
            title: "Pattern discovered",
            prompt: "What trend did you notice?",
            value:
              "The pattern is that optionality disappears before payroll peaks, which means teams start changing plans early and not only after their payroll number becomes visibly extreme."
          },
          {
            key: "interpretation",
            title: "Interpretation",
            prompt: "Why does that matter?",
            value:
              "That matters because it changes team behavior earlier than readers expect, so the rule is shaping strategy before a casual reader would say the team is fully trapped."
          },
          {
            key: "nextQuestion",
            title: "Next question",
            prompt: "What should be studied next?",
            value:
              "The next question is whether timing changes help more than blunt threshold moves, because the evidence suggests the deepest pressure comes from when the tools disappear, not only from how high the line is."
          }
        ]
      },
      referencesJson: [{ label: "League report", url: "https://example.com", sourceType: "ARTICLE" }],
      keywordsJson: ["second apron", "optional flexibility"],
      keyTakeawaysJson: ["Flexibility disappears early."],
      lanePrimary: "ECONOMIC_INVESTIGATORS",
      projectType: ProjectType.INVESTIGATION,
      issueLinks: [{ issueId: "issue-1" }],
      primaryIssue: null,
      teamId: null,
      supportingProposalId: null,
      collaborators: [],
      submissionStatus: SubmissionStatus.SUBMITTED
    });

    expect(result.readyForWorkflow).toBe(true);
    expect(result.buckets.must_fix.items).toHaveLength(0);
    expect(result.nextAction.length).toBeGreaterThan(5);
  });
});
