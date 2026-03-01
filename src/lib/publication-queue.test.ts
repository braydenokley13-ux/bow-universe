import { ExternalPublicationTarget, ProposalStatus, PublicationSourceType } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { getPublicationQueueState } from "@/lib/publication-queue";

describe("publication queue state", () => {
  it("flags missing archive quality fields", () => {
    const state = getPublicationQueueState({
      slug: "abc",
      title: "Short record",
      abstract: "short",
      citationText: "tiny",
      externalReady: false,
      externalApproved: false,
      sourceType: PublicationSourceType.PROPOSAL,
      sourceStatus: ProposalStatus.SUBMITTED,
      exports: [],
      issue: null,
      team: null,
      season: null
    });

    expect(state.archiveReady).toBe(false);
    expect(state.warnings[0]).toContain("internal publication state");
  });

  it("creates export target states for both web and pdf", () => {
    const state = getPublicationQueueState({
      slug: "strong-record",
      title: "Strong record",
      abstract: "A full abstract that can support the archive record safely.",
      citationText: "Author (2026). Strong record. BOW Universe Policy Memo. v1.",
      externalReady: true,
      externalApproved: true,
      sourceType: PublicationSourceType.PROPOSAL,
      sourceStatus: ProposalStatus.APPROVED_FOR_EXTERNAL_PUBLICATION,
      exports: [
        {
          target: ExternalPublicationTarget.WEB,
          status: "READY"
        }
      ],
      issue: { title: "Pressure point" },
      team: null,
      season: null
    });

    expect(state.exportTargets).toHaveLength(2);
    expect(state.exportTargets.find((target) => target.target === ExternalPublicationTarget.WEB)?.status).toBe(
      "READY"
    );
  });
});
