import { describe, expect, it } from "vitest";

import {
  buildStudentNavItems,
  shouldGateAdvancedStudentWork,
  shouldGateYoungerTrackReferencePages
} from "@/lib/classroom";

describe("classroom experience helpers", () => {
  it("reduces the nav for younger students before the first submitted project", () => {
    const items = buildStudentNavItems({
      gradeBand: "GRADE_5_6",
      hasSubmittedFirstProject: false,
      currentProjectHref: "/projects/new?beginner=1"
    });

    expect(items.map((item) => item.label)).toEqual([
      "Home",
      "Start",
      "Current project",
      "My work",
      "News"
    ]);
    expect(shouldGateAdvancedStudentWork({ hasSubmittedFirstProject: false })).toBe(true);
    expect(
      shouldGateYoungerTrackReferencePages({
        gradeBand: "GRADE_5_6",
        hasSubmittedFirstProject: false
      })
    ).toBe(true);
  });

  it("restores the full nav after the first submitted project", () => {
    const items = buildStudentNavItems({
      gradeBand: "GRADE_5_6",
      hasSubmittedFirstProject: true,
      currentProjectHref: "/projects/project-1/edit"
    });

    expect(items.map((item) => item.label)).toContain("Challenges");
    expect(items.map((item) => item.label)).toContain("Rules");
    expect(items.map((item) => item.label)).toContain("Research");
  });

  it("keeps the broader nav for older students but still gates advanced work before project one", () => {
    const items = buildStudentNavItems({
      gradeBand: "GRADE_7_8",
      hasSubmittedFirstProject: false,
      currentProjectHref: "/projects/project-7/edit"
    });

    expect(items.map((item) => item.label)).toContain("Challenges");
    expect(items.map((item) => item.label)).toContain("Proposals");
    expect(shouldGateAdvancedStudentWork({ hasSubmittedFirstProject: false })).toBe(true);
    expect(
      shouldGateYoungerTrackReferencePages({
        gradeBand: "GRADE_7_8",
        hasSubmittedFirstProject: false
      })
    ).toBe(false);
  });
});
