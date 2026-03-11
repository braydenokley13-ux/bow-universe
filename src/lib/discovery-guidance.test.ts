import { ProposalStatus, SubmissionStatus, UserRole } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  buildIssueResearchPreview,
  buildDashboardGuidance,
  classifyIssueWorkGap,
  getLanePrompt,
  getProposalStageNote,
  summarizeIssuesFilter
} from "@/lib/discovery-guidance";

describe("discovery guidance", () => {
  it("summarizes active issue filters", () => {
    expect(summarizeIssuesFilter("OPEN", "4", 3)).toBe("3 issues matching open and severity 4+");
  });

  it("finds missing work on issues", () => {
    const gap = classifyIssueWorkGap({
      id: "issue-1",
      title: "Issue",
      proposals: [],
      projectLinks: []
    });

    expect(gap.missing).toEqual(["proposal memo", "supporting project"]);
  });

  it("builds dashboard next moves for a signed-in student", () => {
    const guidance = buildDashboardGuidance({
      viewerRole: UserRole.STUDENT,
      viewerId: "user-1",
      proposals: [
        {
          id: "proposal-1",
          title: "Draft memo",
          status: ProposalStatus.DRAFT,
          createdByUserId: "user-1"
        }
      ],
      projects: [],
      issues: [
        {
          id: "issue-1",
          title: "Revenue pressure",
          severity: 5,
          proposals: [],
          projectLinks: []
        }
      ],
      publications: []
    });

    expect(guidance.nextMoveCards[0].href).toBe("/proposals/proposal-1/edit");
    expect(guidance.attentionCards[0].href).toBe("/issues/issue-1");
  });

  it("returns lane prompts and proposal stage notes", () => {
    expect(getLanePrompt("TOOL_BUILDERS")).toContain("tool");
    expect(getProposalStageNote(ProposalStatus.DRAFT, false)).toBe("Missing sandbox evidence");
    expect(getProposalStageNote(ProposalStatus.VOTING, true)).toBe("In voting");
  });

  it("builds issue research prompts that keep modeling visible", () => {
    const preview = buildIssueResearchPreview({
      id: "issue-1",
      title: "Revenue sharing pressure",
      description: "A live league issue about tax pressure and fairness.",
      severity: 5,
      metrics: {
        revenueInequality: 1.8,
        taxConcentration: 0.7
      },
      team: null,
      proposals: [],
      projectLinks: []
    });

    expect(preview.questionPrompt).toContain("league");
    expect(preview.evidencePrompt).toContain("revenue inequality");
    expect(preview.modelPrompt).toContain("test");
    expect(preview.researchMap.currentResearchStage).toBe("ASK_QUESTION");
    expect(preview.researchMap.researchStageProgress[2]?.status).toBe("preview");
  });
});
