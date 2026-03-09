import { ProjectType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  buildBeginnerDerivedFields,
  getBeginnerStepIdForField,
  getFirstIncompleteBeginnerStep,
  isBeginnerStepComplete
} from "@/lib/beginner-project";
import { createInitialProjectCoachValues } from "@/lib/project-wizard";

describe("beginner project helpers", () => {
  it("opens on the first incomplete beginner step", () => {
    const emptyValues = createInitialProjectCoachValues({
      lanePrimary: "ECONOMIC_INVESTIGATORS",
      projectType: ProjectType.INVESTIGATION
    });
    const startedValues = createInitialProjectCoachValues({
      lanePrimary: "ECONOMIC_INVESTIGATORS",
      projectType: ProjectType.INVESTIGATION,
      issueId: "issue-1",
      essentialQuestion: "How is the tax system changing team flexibility?"
    });

    expect(getFirstIncompleteBeginnerStep(emptyValues)).toBe("issue");
    expect(getFirstIncompleteBeginnerStep(startedValues)).toBe("context");
    expect(isBeginnerStepComplete("question", startedValues)).toBe(true);
  });

  it("maps project fields back to the guided beginner questions", () => {
    expect(getBeginnerStepIdForField("issueId")).toBe("issue");
    expect(getBeginnerStepIdForField("lanePrimary")).toBe("lane");
    expect(getBeginnerStepIdForField("references")).toBe("references");
  });

  it("builds deterministic derived fields from the guided answers", () => {
    const derived = buildBeginnerDerivedFields({
      issueTitle: "Second apron flexibility",
      values: {
        lanePrimary: "STRATEGIC_OPERATORS",
        title: "A three-year cap response",
        essentialQuestion: "How should a team respond to second apron pressure over three years?",
        context:
          "The issue matters because teams lose useful tools before they feel completely trapped.",
        evidence:
          "Recent league notes and payroll patterns show that the hardest pressure arrives earlier than most teams expect.",
        analysis:
          "The pattern suggests teams need to act before the pressure becomes a full emergency.",
        recommendations:
          "Start with a low-risk Year 1 move, then keep flexibility for the next two seasons."
      }
    });

    expect(derived.methodsSummary).toContain("This project uses league issue notes");
    expect(derived.summary).toContain("Second apron flexibility");
    expect(derived.abstract).toContain("The main evidence is");
    expect(derived.laneSections).toHaveLength(4);
    expect(derived.laneSections[0]?.title).toBe("Year 1 plan");
    expect(derived.findingsMd).toContain("## Recommendations");
  });
});
