import { ExternalPublicationTarget, ProposalStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { getDecisionGuard, getExportGuard, getProposalWorkflowOptions } from "@/lib/workflow-guards";

const readinessBlocked = {
  kind: "proposal" as const,
  statusLabel: "DRAFT",
  nextAction: "Finish the memo.",
  readyForWorkflow: false,
  checklist: [],
  buckets: {
    must_fix: { title: "Must fix", items: ["Problem section is incomplete."] },
    should_strengthen: { title: "Should strengthen", items: [] },
    already_strong: { title: "Already strong", items: [] }
  }
};

const readinessClear = {
  ...readinessBlocked,
  readyForWorkflow: true,
  buckets: {
    ...readinessBlocked.buckets,
    must_fix: { title: "Must fix", items: [] }
  }
};

describe("workflow guards", () => {
  it("blocks high-gate proposal statuses when readiness is not clear", () => {
    const options = getProposalWorkflowOptions(ProposalStatus.SUBMITTED, readinessBlocked);
    const voting = options.find((option) => option.status === ProposalStatus.VOTING);

    expect(voting?.guard.enabled).toBe(false);
    expect(voting?.guard.explanation).toContain("must-fix");
  });

  it("opens the decision desk only when the workflow is ready", () => {
    expect(getDecisionGuard(ProposalStatus.SUBMITTED, readinessClear).enabled).toBe(false);
    expect(getDecisionGuard(ProposalStatus.VOTING, readinessClear).enabled).toBe(true);
  });

  it("blocks published export states before external approval", () => {
    const guard = getExportGuard({
      sourceType: "PROPOSAL",
      sourceStatus: ProposalStatus.MARKED_EXTERNAL_READY,
      externalReady: true,
      externalApproved: false,
      target: ExternalPublicationTarget.WEB,
      status: "PUBLISHED"
    });

    expect(guard.enabled).toBe(false);
    expect(guard.explanation).toContain("externally approved");
  });
});
