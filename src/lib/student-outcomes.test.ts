import { describe, expect, it } from "vitest";

import {
  buildProjectOutcomeProof,
  parseStudentOutcomeProof,
  projectQualifiesForArtifactOutcome,
  projectQualifiesForEvidenceOutcome,
  proposalQualifiesForArtifactOutcome,
  proposalQualifiesForEvidenceOutcome
} from "@/lib/student-outcomes";

function buildProject(overrides: Partial<Parameters<typeof projectQualifiesForArtifactOutcome>[0]> = {}) {
  return {
    id: "project-1",
    title: "Second apron pressure map",
    summary: "This project traces where small-market teams lose planning freedom before they hit the strictest spending wall.",
    abstract: "A longer abstract that explains the real planning problem this project is trying to solve for the league.",
    essentialQuestion: "How does second-apron pressure change planning freedom for small-market teams?",
    methodsSummary: "Compared team cases, rule thresholds, and planning tools across several seasons.",
    findingsMd: "Teams lose options earlier than surface payroll totals suggest.",
    lanePrimary: "ECONOMIC_INVESTIGATORS" as const,
    issueId: "issue-1",
    teamId: null,
    supportingProposalId: null,
    contentJson: {
      overview: "This project studies how planning flexibility disappears.",
      questionOrMission: "How does second-apron pressure change planning freedom?",
      context: "Small-market teams need optionality to use short competitive windows.",
      evidence: "League examples show tools disappearing before payroll peaks.",
      analysis: "The timing of disappearing tools changes team behavior.",
      recommendations: "Test narrower changes before full threshold rewrites.",
      laneSections: [],
      artifacts: [{ label: "Slides deck", url: "https://example.com/slides" }],
      reflection: "The best evidence came from comparing timing instead of looking only at top payroll totals."
    },
    referencesJson: [
      {
        label: "League memo",
        url: "https://example.com/memo",
        sourceType: "ARTICLE"
      }
    ],
    artifactLinksJson: [{ label: "Slides deck", url: "https://example.com/slides" }],
    ...overrides
  };
}

function buildProposal(overrides: Partial<Parameters<typeof proposalQualifiesForArtifactOutcome>[0]> = {}) {
  return {
    id: "proposal-1",
    title: "Lower the second apron ramp",
    abstract: "This memo explains why a softer ramp changes planning pressure earlier and more clearly for smaller markets.",
    methodsSummary: "Compared the live rules against the proposed rule set and checked the sandbox output.",
    issueId: "issue-2",
    contentJson: {
      problem: "Smaller markets lose planning freedom too early in the current structure.",
      currentRuleContext: "The current second-apron penalties remove tools in a steep cluster.",
      proposedChange: "Lower the ramp and spread the penalties across a wider range.",
      impactAnalysis: "The sandbox suggests teams keep more short-term flexibility while still facing clear costs.",
      tradeoffs: "The change could soften the biggest penalties for top spenders.",
      sandboxInterpretation: "The main effect is on planning behavior, not just top-line payroll totals.",
      recommendation: "Pilot the narrower ramp first and review league responses after one cycle."
    },
    referencesJson: [
      {
        label: "Sandbox notes",
        url: "https://example.com/sandbox",
        sourceType: "DATASET"
      }
    ],
    ...overrides
  };
}

describe("student outcomes", () => {
  it("does not treat a shell project draft as a real artifact", () => {
    const project = buildProject({
      issueId: null,
      summary: "Short",
      abstract: "Short",
      methodsSummary: "Tiny",
      findingsMd: "",
      contentJson: {
        overview: "Short",
        questionOrMission: "",
        context: "",
        evidence: "",
        analysis: "",
        recommendations: "",
        laneSections: [],
        artifacts: [],
        reflection: ""
      },
      referencesJson: [],
      artifactLinksJson: []
    });

    expect(projectQualifiesForArtifactOutcome(project)).toBe(false);
    expect(projectQualifiesForEvidenceOutcome(project)).toBe(false);
  });

  it("awards a project artifact outcome only when the work is grounded and substantive", () => {
    expect(projectQualifiesForArtifactOutcome(buildProject())).toBe(true);
  });

  it("requires real evidence before a project can reach the evidence outcome", () => {
    expect(
      projectQualifiesForEvidenceOutcome(
        buildProject({
          referencesJson: []
        })
      )
    ).toBe(false);

    expect(projectQualifiesForEvidenceOutcome(buildProject())).toBe(true);
  });

  it("keeps proposal artifact and evidence outcomes separate", () => {
    expect(
      proposalQualifiesForArtifactOutcome(
        buildProposal({
          referencesJson: []
        })
      )
    ).toBe(true);

    expect(
      proposalQualifiesForEvidenceOutcome(
        buildProposal({
          referencesJson: []
        })
      )
    ).toBe(false);
  });

  it("builds outcome proof from the real project content", () => {
    const proof = buildProjectOutcomeProof(buildProject(), "AUTO_GATE", "publication-1");

    expect(proof.artifactSummary).toContain("planning");
    expect(proof.artifactLink).toBe("https://example.com/slides");
    expect(proof.evidenceCount).toBe(1);
    expect(parseStudentOutcomeProof(proof).supportingPublicationId).toBe("publication-1");
  });
});
