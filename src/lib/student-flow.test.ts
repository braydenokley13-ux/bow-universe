import {
  SubmissionStatus
} from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  buildRecommendedMissionCandidates,
  buildRepairHref,
  getProjectRepairTarget,
  hasStudentSubmittedProject,
  shouldUseBeginnerProjectMode
} from "@/lib/student-flow";

describe("student flow helpers", () => {
  it("builds beginner mission links from the best-ranked issues", () => {
    const missions = buildRecommendedMissionCandidates({
      linkedTeamId: "team-1",
      claimedIssueIds: ["issue-3"],
      issues: [
        {
          id: "issue-1",
          title: "Cap crunch for the linked team",
          description: "A live issue tied to one specific team.",
          severity: 5,
          teamId: "team-1",
          team: { id: "team-1", name: "Boston" },
          proposals: [{ id: "proposal-1" }],
          projectLinks: []
        },
        {
          id: "issue-2",
          title: "League-wide tax reform",
          description: "A policy question with no proposal support yet.",
          severity: 4,
          teamId: null,
          team: null,
          proposals: [],
          projectLinks: []
        },
        {
          id: "issue-3",
          title: "Already claimed issue",
          description: "This one already has student work tied to it.",
          severity: 5,
          teamId: null,
          team: null,
          proposals: [],
          projectLinks: []
        }
      ]
    });

    expect(missions).toHaveLength(3);
    expect(missions[0]?.issue.id).toBe("issue-1");
    expect(missions[0]?.suggestedLane).toBe("STRATEGIC_OPERATORS");
    expect(missions[0]?.starterHref).toContain("beginner=1");
    expect(missions[0]?.starterHref).toContain("issueId=issue-1");
    expect(missions[0]?.starterHref).toContain("teamId=team-1");
    expect(missions[0]?.starterHref).toContain("supportingProposalId=proposal-1");
  });

  it("detects whether a student should still use beginner mode", () => {
    expect(
      hasStudentSubmittedProject([{ submissionStatus: SubmissionStatus.DRAFT }])
    ).toBe(false);
    expect(
      hasStudentSubmittedProject([{ submissionStatus: SubmissionStatus.SUBMITTED }])
    ).toBe(true);

    expect(
      shouldUseBeginnerProjectMode({
        hasSubmittedProject: false
      })
    ).toBe(true);
    expect(
      shouldUseBeginnerProjectMode({
        hasSubmittedProject: true
      })
    ).toBe(false);
    expect(
      shouldUseBeginnerProjectMode({
        hasSubmittedProject: false,
        forceFullStudio: true
      })
    ).toBe(false);
  });

  it("maps repair feedback to stable project targets", () => {
    expect(getProjectRepairTarget("Why this matters")).toEqual({
      fieldId: "context",
      label: "why this matters"
    });
    expect(getProjectRepairTarget("Next action")).toEqual({
      fieldId: "recommendations",
      label: "next step"
    });
    expect(
      buildRepairHref({
        kind: "project",
        id: "project-9",
        sectionKey: "Evidence notes"
      })
    ).toBe("/projects/project-9/edit?repair=evidence");
  });
});
