import { describe, expect, it } from "vitest";

import {
  buildProjectStudioHref,
  buildProposalStudioHref,
  parseProjectStudioPrefill,
  parseProposalStudioPrefill
} from "@/lib/studio-entry";

describe("studio entry helpers", () => {
  it("parses valid project prefills", () => {
    expect(
      parseProjectStudioPrefill({
        lane: "TOOL_BUILDERS",
        issueId: "issue-1",
        teamId: "team-1",
        supportingProposalId: "proposal-1"
      })
    ).toEqual({
      lanePrimary: "TOOL_BUILDERS",
      issueIds: ["issue-1"],
      teamId: "team-1",
      supportingProposalId: "proposal-1"
    });
  });

  it("drops invalid project lane values", () => {
    expect(
      parseProjectStudioPrefill({
        lane: "INVALID",
        issueId: "issue-1"
      })
    ).toEqual({
      lanePrimary: null,
      issueIds: ["issue-1"],
      teamId: "",
      supportingProposalId: ""
    });
  });

  it("parses proposal prefills", () => {
    expect(parseProposalStudioPrefill({ issueId: "issue-9" })).toEqual({
      issueId: "issue-9"
    });
  });

  it("builds hrefs with only available params", () => {
    expect(
      buildProjectStudioHref({
        lane: "ECONOMIC_INVESTIGATORS",
        issueId: "issue-4"
      })
    ).toBe("/projects/new?lane=ECONOMIC_INVESTIGATORS&issueId=issue-4");
    expect(buildProposalStudioHref({ issueId: "issue-4" })).toBe(
      "/proposals/new?issueId=issue-4"
    );
  });
});
