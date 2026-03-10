import { describe, expect, it } from "vitest";

import {
  buildUniversePreviewCards,
  buildWorkPreviewCards,
  parseStudentOnboardingProgress,
  shouldForceStudentOnboarding
} from "@/lib/student-onboarding";

describe("student onboarding helpers", () => {
  it("forces the new onboarding only for first-time students with no active work", () => {
    expect(
      shouldForceStudentOnboarding({
        role: "STUDENT",
        onboardingExperienceVersion: 0,
        hasSubmittedFirstProject: false,
        hasOpenProjectOrProposal: false
      })
    ).toBe(true);

    expect(
      shouldForceStudentOnboarding({
        role: "STUDENT",
        onboardingExperienceVersion: 1,
        hasSubmittedFirstProject: false,
        hasOpenProjectOrProposal: false
      })
    ).toBe(false);

    expect(
      shouldForceStudentOnboarding({
        role: "STUDENT",
        onboardingExperienceVersion: 0,
        hasSubmittedFirstProject: true,
        hasOpenProjectOrProposal: false
      })
    ).toBe(false);

    expect(
      shouldForceStudentOnboarding({
        role: "STUDENT",
        onboardingExperienceVersion: 0,
        hasSubmittedFirstProject: false,
        hasOpenProjectOrProposal: true
      })
    ).toBe(false);
  });

  it("parses saved onboarding progress safely", () => {
    expect(
      parseStudentOnboardingProgress({
        currentStep: "work",
        selectedGradeBand: "GRADE_5_6",
        selectedMissionId: "issue-2",
        selectedLane: "TOOL_BUILDERS"
      })
    ).toEqual({
      currentStep: "work",
      selectedGradeBand: "GRADE_5_6",
      selectedMissionId: "issue-2",
      selectedLane: "TOOL_BUILDERS"
    });

    expect(
      parseStudentOnboardingProgress({
        currentStep: "unknown-step",
        selectedGradeBand: "GRADE_5_6"
      })
    ).toBeNull();
  });

  it("builds the universe preview with every top-level reference area", () => {
    const cards = buildUniversePreviewCards({
      gradeBand: "GRADE_5_6",
      stats: {
        newsCount: 4,
        openIssuesCount: 5,
        openChallengesCount: 2,
        publicationCount: 8,
        teamCount: 12,
        glossaryCount: 21
      }
    });

    expect(cards.map((card) => card.id)).toEqual([
      "home",
      "news",
      "teams",
      "rules",
      "glossary"
    ]);
    expect(cards.find((card) => card.id === "rules")?.timing).toBe("use_later");
  });

  it("marks advanced work as later until project one is finished", () => {
    const beforeFirstProject = buildWorkPreviewCards({
      gradeBand: "GRADE_5_6",
      hasSubmittedFirstProject: false,
      stats: {
        newsCount: 4,
        openIssuesCount: 5,
        openChallengesCount: 2,
        publicationCount: 8,
        teamCount: 12,
        glossaryCount: 21
      }
    });
    const afterFirstProject = buildWorkPreviewCards({
      gradeBand: "GRADE_7_8",
      hasSubmittedFirstProject: true,
      stats: {
        newsCount: 4,
        openIssuesCount: 5,
        openChallengesCount: 2,
        publicationCount: 8,
        teamCount: 12,
        glossaryCount: 21
      }
    });

    expect(beforeFirstProject.find((card) => card.id === "projects")?.timing).toBe("use_now");
    expect(beforeFirstProject.find((card) => card.id === "proposals")?.timing).toBe("use_later");
    expect(beforeFirstProject.find((card) => card.id === "challenges")?.timing).toBe("use_later");
    expect(beforeFirstProject.find((card) => card.id === "research")?.timing).toBe("use_later");
    expect(afterFirstProject.find((card) => card.id === "proposals")?.timing).toBe("use_now");
    expect(afterFirstProject.find((card) => card.id === "challenges")?.timing).toBe("use_now");
    expect(afterFirstProject.find((card) => card.id === "research")?.timing).toBe("use_now");
  });
});
