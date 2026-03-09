import { ProjectType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { getLaneTemplate } from "@/lib/publications";
import {
  assessProjectCoach,
  createInitialLaneSectionStore,
  createInitialProjectCoachValues,
  projectCoachStepOrder,
  syncLaneSectionStore
} from "@/lib/project-wizard";

function buildCompleteInvestigationValues() {
  const lane = "ECONOMIC_INVESTIGATORS" as const;
  const laneSections = getLaneTemplate(lane).laneSections.map((section) => ({
    key: section.key,
    title: section.title,
    prompt: section.prompt,
    value: `This section explains ${section.title.toLowerCase()} in clear, concrete language so a new reader can follow the idea without classroom context.`
  }));

  return createInitialProjectCoachValues({
    lanePrimary: lane,
    projectType: ProjectType.INVESTIGATION,
    laneTags: [lane],
    issueId: "issue-1",
    teamId: "",
    supportingProposalId: "",
    collaboratorIds: [],
    title: "How the second apron changes small-market flexibility",
    summary:
      "This project studies how spending pressure changes small-market flexibility by tracing where planning tools disappear before teams hit their hardest spending limit.",
    abstract:
      "This project asks how the second apron changes planning freedom for smaller markets. It uses league conditions, comparison logic, and pressure examples to study the question. It finds that the real constraint arrives before teams are completely trapped.",
    essentialQuestion: "How does the second apron change planning freedom for small-market teams?",
    methodsSummary:
      "I studied this by comparing league conditions across pressure levels, tracing which tools disappeared, and explaining the pattern in plain language.",
    publicationSlug: "second-apron-flexibility-patterns",
    findingsMd: "",
    overview:
      "The main point is that smaller markets lose meaningful planning freedom before they fully lose spending intent, so the pressure arrives earlier than many readers expect.",
    context:
      "In the BOW Universe, teams do not simply cross one hard line. They lose flexibility in stages, which makes the timing of the pressure important.",
    evidence:
      "The main evidence comes from league conditions, roster-planning examples, and records showing how decision tools disappear as pressure rises.",
    analysis:
      "The important pattern is that the system changes behavior before it creates a total spending stop, which means the planning problem is really about timing and not just raw payroll size.",
    recommendations:
      "The next step should be to test whether narrower pressure adjustments would preserve discipline without removing useful flexibility for smaller markets.",
    reflection:
      "The main uncertainty is how teams would respond over multiple seasons. This project would improve with a longer planning comparison window.",
    artifactLinks: "Pressure tracker | https://example.com/tool",
    references: "League note | https://example.com/report | ARTICLE | Supports the pattern",
    keywords: "second apron, small-market teams, league flexibility",
    keyTakeaways:
      "The pressure arrives before teams hit their hardest spending limit.\nThe real planning problem is timing, not only payroll size.",
    laneSections
  });
}

describe("project coach wizard", () => {
  it("keeps the expected step order", () => {
    expect(projectCoachStepOrder).toEqual([
      "lane",
      "context",
      "opening",
      "mission",
      "body",
      "laneSections",
      "publish",
      "review"
    ]);
  });

  it("opens on the first required incomplete step for a new project draft", () => {
    const assessment = assessProjectCoach(createInitialProjectCoachValues());

    expect(assessment.firstIncompleteStepId).toBe("opening");
    expect(assessment.reviewBuckets.blockers.items.some((item) => item.includes("Title"))).toBe(true);
  });

  it("requires one issue when the student flow asks for it", () => {
    const assessment = assessProjectCoach(createInitialProjectCoachValues(), {
      issueRequired: true
    });

    expect(assessment.firstIncompleteStepId).toBe("context");
    expect(assessment.fields.issueId.complete).toBe(false);
    expect(assessment.steps.context.complete).toBe(false);
    expect(assessment.reviewBuckets.blockers.items.some((item) => item.includes("Primary issue"))).toBe(true);
  });

  it("blocks submission when lane-specific sections are unfinished", () => {
    const values = buildCompleteInvestigationValues();
    values.laneSections = values.laneSections.map((section, index) =>
      index === 0 ? { ...section, value: "" } : section
    );

    const assessment = assessProjectCoach(values);

    expect(assessment.fields.laneSections.complete).toBe(false);
    expect(assessment.submitReady).toBe(false);
    expect(assessment.reviewBuckets.blockers.items.some((item) => item.includes(values.laneSections[0].title))).toBe(true);
  });

  it("treats a complete lane-aware project as submit ready", () => {
    const assessment = assessProjectCoach(buildCompleteInvestigationValues());

    expect(assessment.submitReady).toBe(true);
    expect(assessment.firstIncompleteStepId).toBe("review");
    expect(assessment.reviewBuckets.blockers.items).toHaveLength(0);
  });

  it("preserves lane-specific section work inside the lane section store", () => {
    const store = createInitialLaneSectionStore("ECONOMIC_INVESTIGATORS", [
      {
        key: "pattern",
        title: "Pattern discovered",
        prompt: "What trend or imbalance did you notice?",
        value: "Investigators noticed that pressure arrives earlier than expected."
      },
      {
        key: "interpretation",
        title: "Interpretation",
        prompt: "Why does that pattern matter for the league?",
        value: ""
      },
      {
        key: "nextQuestion",
        title: "Next question",
        prompt: "What should investigators test next?",
        value: ""
      }
    ]);

    const synced = syncLaneSectionStore(store, "TOOL_BUILDERS");

    expect(store.ECONOMIC_INVESTIGATORS[0].value).toContain("pressure arrives earlier");
    expect(synced.TOOL_BUILDERS).toHaveLength(getLaneTemplate("TOOL_BUILDERS").laneSections.length);
    expect(synced.ECONOMIC_INVESTIGATORS[0].value).toContain("pressure arrives earlier");
  });
});
