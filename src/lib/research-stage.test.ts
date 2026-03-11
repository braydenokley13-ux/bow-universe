import { ProposalStatus, SubmissionStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  buildResearchStageDisplay,
  buildStudentResearchProgress,
  deriveProjectResearchSignals,
  deriveProposalResearchSignals,
  deriveResearchMilestones,
  getResearchStageMeta
} from "@/lib/research-stage";

describe("research stage helpers", () => {
  it("keeps the shared research language stable", () => {
    expect(getResearchStageMeta("ASK_QUESTION").label).toBe("Ask the question");
    expect(getResearchStageMeta("TEST_SYSTEM").label).toBe("Test the system");
  });

  it("derives project research signals from substantive work", () => {
    const signals = deriveProjectResearchSignals({
      title: "Second apron tracker",
      summary: "Track how planning tools disappear for smaller markets.",
      essentialQuestion: "How does second-apron pressure change planning freedom?",
      methodsSummary: "Compared issue notes, team cases, and a simple scenario tracker.",
      findingsMd: "The system changes team choices before payroll peaks.",
      lanePrimary: "TOOL_BUILDERS",
      contentJson: {
        overview: "This project shows where pressure appears first.",
        questionOrMission: "How does the issue change planning choices?",
        context: "Smaller markets lose tools earlier than readers expect.",
        evidence: "Rule notes and team examples show the pressure building.",
        analysis: "The pattern is mostly about timing.",
        recommendations: "Test narrower changes first.",
        laneSections: [],
        artifacts: [],
        reflection: ""
      },
      referencesJson: [
        {
          label: "League note",
          url: "https://example.com/report",
          sourceType: "ARTICLE"
        }
      ],
      publicationSlug: "",
      submissionStatus: SubmissionStatus.DRAFT
    });

    expect(signals.ASK_QUESTION).toBe(true);
    expect(signals.FIND_EVIDENCE).toBe(true);
    expect(signals.TEST_SYSTEM).toBe(true);
    expect(signals.MAKE_CASE).toBe(true);
    expect(signals.SHARE_WORK).toBe(false);
  });

  it("derives proposal research signals when sandbox work exists", () => {
    const signals = deriveProposalResearchSignals({
      title: "Lower the second apron ramp",
      methodsSummary: "Compared the current rules and reviewed a sandbox run.",
      issueId: "issue-1",
      contentJson: {
        problem: "The current penalties remove flexibility too early.",
        currentRuleContext: "The rule cluster hits teams in a steep band.",
        proposedChange: "Spread the penalties across a wider range.",
        impactAnalysis: "The reform keeps more planning flexibility alive.",
        tradeoffs: "Top spenders would face a softer early penalty.",
        sandboxInterpretation: "The model suggests timing pressure would ease first.",
        recommendation: "Pilot the narrower ramp first."
      },
      referencesJson: [
        {
          label: "Sandbox note",
          url: "https://example.com/sandbox",
          sourceType: "DATASET"
        }
      ],
      sandboxResultJson: {
        delta: {
          parityIndex: -0.2,
          taxConcentration: -0.1,
          smallVsBigCompetitiveness: 0.12,
          revenueInequality: -0.05
        }
      },
      status: ProposalStatus.SUBMITTED
    });

    expect(signals.ASK_QUESTION).toBe(true);
    expect(signals.FIND_EVIDENCE).toBe(true);
    expect(signals.TEST_SYSTEM).toBe(true);
    expect(signals.MAKE_CASE).toBe(true);
  });

  it("builds student progress with a visible system-test preview", () => {
    const progress = buildStudentResearchProgress({
      projectSignals: [
        {
          ASK_QUESTION: true,
          FIND_EVIDENCE: true,
          TEST_SYSTEM: false,
          MAKE_CASE: false,
          SHARE_WORK: false
        }
      ],
      proposalSignals: [],
      forceSimulationPreview: true
    });

    expect(progress.currentResearchStage).toBe("TEST_SYSTEM");
    expect(progress.researchStageProgress[2]?.status).toBe("preview");
    expect(progress.simulationPreviewAvailable).toBe(true);
  });

  it("picks the earliest milestone source for each stage", () => {
    const milestones = deriveResearchMilestones({
      questionSources: [
        { label: "Later question", createdAt: new Date("2026-03-05") },
        { label: "First question", createdAt: new Date("2026-03-01") }
      ],
      evidenceSources: [{ label: "Evidence brief", createdAt: new Date("2026-03-03") }],
      modelSources: [],
      argumentSources: [{ label: "Argument memo", createdAt: new Date("2026-03-04") }],
      publicationSources: [{ label: "Published brief", createdAt: new Date("2026-03-06") }]
    });

    expect(milestones[0]?.sourceLabel).toBe("First question");
    expect(milestones[2]?.achieved).toBe(false);
    expect(milestones[4]?.sourceLabel).toBe("Published brief");
  });

  it("builds a display map for the active stage", () => {
    const display = buildResearchStageDisplay("FIND_EVIDENCE", {
      completedStages: ["ASK_QUESTION"],
      previewStages: ["TEST_SYSTEM"]
    });

    expect(display.researchStageProgress[0]?.status).toBe("done");
    expect(display.researchStageProgress[1]?.status).toBe("active");
    expect(display.researchStageProgress[2]?.status).toBe("preview");
  });
});
