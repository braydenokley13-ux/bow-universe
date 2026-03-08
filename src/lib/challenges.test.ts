import { describe, expect, it } from "vitest";
import { ProposalStatus, SubmissionStatus } from "@prisma/client";

import {
  challengeScoreRules,
  getChallengeMilestonesForSource,
  sumChallengeScore
} from "@/lib/challenges";

describe("challenge scoring", () => {
  it("awards join and submit milestones once for project work", () => {
    expect(
      getChallengeMilestonesForSource({
        sourceType: "PROJECT",
        status: SubmissionStatus.SUBMITTED
      })
    ).toEqual(["JOIN", "SUBMIT"]);

    expect(
      getChallengeMilestonesForSource({
        sourceType: "PROJECT",
        status: SubmissionStatus.SUBMITTED,
        existingKinds: ["JOIN", "SUBMIT"]
      })
    ).toEqual([]);
  });

  it("treats later proposal states as already approved", () => {
    expect(
      getChallengeMilestonesForSource({
        sourceType: "PROPOSAL",
        status: ProposalStatus.DECISION,
        existingKinds: ["JOIN"]
      })
    ).toEqual(["SUBMIT", "APPROVED_INTERNAL"]);
  });

  it("sums fallback and explicit challenge points", () => {
    expect(
      sumChallengeScore([
        { kind: "JOIN" },
        { kind: "SUBMIT" },
        { kind: "SPOTLIGHT", points: 25 }
      ])
    ).toBe(challengeScoreRules.JOIN + challengeScoreRules.SUBMIT + 25);
  });
});
