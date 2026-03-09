import { describe, expect, it } from "vitest";

import {
  buildProjectIssueLinkCreates,
  resolveProjectPrimaryIssueId
} from "@/lib/project-issues";

describe("project issue helpers", () => {
  it("prefers the stored primary issue before legacy linked issues", () => {
    expect(
      resolveProjectPrimaryIssueId({
        issueId: "issue-primary",
        issueLinks: [{ issueId: "issue-legacy" }]
      })
    ).toBe("issue-primary");
  });

  it("falls back to legacy issue collections when needed", () => {
    expect(
      resolveProjectPrimaryIssueId({
        issueId: "",
        issueIds: ["issue-from-array"],
        issueLinks: [{ issueId: "issue-from-link" }]
      })
    ).toBe("issue-from-array");

    expect(
      resolveProjectPrimaryIssueId({
        issueId: "",
        issueLinks: [{ issueId: "issue-from-link" }]
      })
    ).toBe("issue-from-link");
  });

  it("creates at most one linked issue row from the primary issue", () => {
    expect(buildProjectIssueLinkCreates("issue-1")).toEqual([{ issueId: "issue-1" }]);
    expect(buildProjectIssueLinkCreates("")).toEqual([]);
  });
});
