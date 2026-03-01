import {
  ExternalPublicationTarget,
  ProposalStatus,
  PublicationSourceType,
  SubmissionStatus
} from "@prisma/client";

import type { ReviewReadinessResult } from "@/lib/review-readiness";

export type GuardTone = "safe" | "warning" | "blocked";

export type WorkflowGuardResult = {
  enabled: boolean;
  tone: GuardTone;
  explanation: string;
  nextAction: string;
};

export type ProposalWorkflowNextMove = {
  status: ProposalStatus;
  label: string;
  guard: WorkflowGuardResult;
};

export type ProjectWorkflowNextMove = {
  status: SubmissionStatus;
  label: string;
  guard: WorkflowGuardResult;
};

type ExportStatus = "PLANNED" | "IN_PROGRESS" | "READY" | "GENERATED" | "PUBLISHED";

const proposalStatusOrder: ProposalStatus[] = [
  ProposalStatus.DRAFT,
  ProposalStatus.SUBMITTED,
  ProposalStatus.REVISION_REQUESTED,
  ProposalStatus.APPROVED_FOR_INTERNAL_PUBLICATION,
  ProposalStatus.READY_FOR_VOTING,
  ProposalStatus.VOTING,
  ProposalStatus.DECISION,
  ProposalStatus.PUBLISHED_INTERNAL,
  ProposalStatus.MARKED_EXTERNAL_READY,
  ProposalStatus.APPROVED_FOR_EXTERNAL_PUBLICATION
];

const projectStatusOrder: SubmissionStatus[] = [
  SubmissionStatus.DRAFT,
  SubmissionStatus.SUBMITTED,
  SubmissionStatus.REVISION_REQUESTED,
  SubmissionStatus.APPROVED_FOR_INTERNAL_PUBLICATION,
  SubmissionStatus.PUBLISHED_INTERNAL,
  SubmissionStatus.MARKED_EXTERNAL_READY,
  SubmissionStatus.APPROVED_FOR_EXTERNAL_PUBLICATION
];

function makeGuard(
  enabled: boolean,
  tone: GuardTone,
  explanation: string,
  nextAction: string
): WorkflowGuardResult {
  return {
    enabled,
    tone,
    explanation,
    nextAction
  };
}

function formatStatusLabel(value: string) {
  return value.replaceAll("_", " ");
}

function isHighGateProposalStatus(status: ProposalStatus) {
  return new Set<ProposalStatus>([
    ProposalStatus.APPROVED_FOR_INTERNAL_PUBLICATION,
    ProposalStatus.READY_FOR_VOTING,
    ProposalStatus.VOTING,
    ProposalStatus.DECISION,
    ProposalStatus.PUBLISHED_INTERNAL,
    ProposalStatus.MARKED_EXTERNAL_READY,
    ProposalStatus.APPROVED_FOR_EXTERNAL_PUBLICATION
  ]).has(status);
}

function isHighGateProjectStatus(status: SubmissionStatus) {
  return new Set<SubmissionStatus>([
    SubmissionStatus.APPROVED_FOR_INTERNAL_PUBLICATION,
    SubmissionStatus.PUBLISHED_INTERNAL,
    SubmissionStatus.MARKED_EXTERNAL_READY,
    SubmissionStatus.APPROVED_FOR_EXTERNAL_PUBLICATION
  ]).has(status);
}

export function getProposalWorkflowOptions(
  currentStatus: ProposalStatus,
  readiness: ReviewReadinessResult
): ProposalWorkflowNextMove[] {
  return proposalStatusOrder.map((status) => {
    const label = formatStatusLabel(status);

    if (status === currentStatus) {
      return {
        status,
        label,
        guard: makeGuard(true, "safe", "This is the current workflow state.", readiness.nextAction)
      };
    }

    if (status === ProposalStatus.REVISION_REQUESTED) {
      return {
        status,
        label,
        guard: makeGuard(true, "warning", "Use revision requested when the memo needs another writing pass.", "Point the writer to the strongest missing section.")
      };
    }

    if (isHighGateProposalStatus(status) && !readiness.readyForWorkflow) {
      return {
        status,
        label,
        guard: makeGuard(false, "blocked", "This step is blocked because the memo still has must-fix items.", readiness.buckets.must_fix.items[0] ?? readiness.nextAction)
      };
    }

    if (status === ProposalStatus.VOTING) {
      return {
        status,
        label,
        guard: makeGuard(true, "warning", "Opening voting will start the decision window for the current version of the memo.", "Confirm the voting dates and memo readiness before saving.")
      };
    }

    return {
      status,
      label,
      guard: makeGuard(true, "safe", "This move is available.", readiness.nextAction)
    };
  });
}

export function getProjectWorkflowOptions(
  currentStatus: SubmissionStatus,
  readiness: ReviewReadinessResult
): ProjectWorkflowNextMove[] {
  return projectStatusOrder.map((status) => {
    const label = formatStatusLabel(status);

    if (status === currentStatus) {
      return {
        status,
        label,
        guard: makeGuard(true, "safe", "This is the current workflow state.", readiness.nextAction)
      };
    }

    if (status === SubmissionStatus.REVISION_REQUESTED) {
      return {
        status,
        label,
        guard: makeGuard(true, "warning", "Use revision requested when the publication needs another studio pass.", "Point the writer to the most important missing section.")
      };
    }

    if (isHighGateProjectStatus(status) && !readiness.readyForWorkflow) {
      return {
        status,
        label,
        guard: makeGuard(false, "blocked", "This step is blocked because the project still has must-fix items.", readiness.buckets.must_fix.items[0] ?? readiness.nextAction)
      };
    }

    return {
      status,
      label,
      guard: makeGuard(true, "safe", "This move is available.", readiness.nextAction)
    };
  });
}

export function getDecisionGuard(
  status: ProposalStatus,
  readiness: ReviewReadinessResult
): WorkflowGuardResult {
  if (
    !new Set<ProposalStatus>([
      ProposalStatus.READY_FOR_VOTING,
      ProposalStatus.VOTING,
      ProposalStatus.DECISION
    ]).has(status)
  ) {
    return makeGuard(false, "blocked", "Record a final decision only after the proposal reaches the decision stage.", "Move the workflow into a voting or decision state first.");
  }

  if (!readiness.readyForWorkflow) {
    return makeGuard(false, "blocked", "This memo still has must-fix items, so the decision desk should stay closed.", readiness.buckets.must_fix.items[0] ?? readiness.nextAction);
  }

  if (status === ProposalStatus.READY_FOR_VOTING) {
    return makeGuard(true, "warning", "You can record a decision from here, but most commissioners will open a voting window first.", "If you skip voting, note why the commissioner is deciding directly.");
  }

  return makeGuard(true, "safe", "The proposal is ready for a final commissioner decision.", "Choose approve, deny, or amend and explain the consequence clearly.");
}

export function shouldShowDecisionDesk(status: ProposalStatus) {
  return new Set<ProposalStatus>([
    ProposalStatus.READY_FOR_VOTING,
    ProposalStatus.VOTING,
    ProposalStatus.DECISION
  ]).has(status);
}

export function getExportGuard(input: {
  sourceType: PublicationSourceType;
  sourceStatus: ProposalStatus | SubmissionStatus | null | undefined;
  externalReady: boolean;
  externalApproved: boolean;
  target: ExternalPublicationTarget;
  status: ExportStatus;
}): WorkflowGuardResult {
  if (!input.sourceStatus) {
    return makeGuard(false, "blocked", "The source record status is unknown, so export work should pause.", "Open the source record and confirm its current workflow state.");
  }

  if (["READY", "GENERATED", "PUBLISHED"].includes(input.status) && !input.externalReady) {
    return makeGuard(false, "blocked", "This export state is blocked until the archive record is marked external ready.", "Mark the publication external ready after the internal archive record is complete.");
  }

  if (input.status === "PUBLISHED" && !input.externalApproved) {
    return makeGuard(false, "blocked", "Do not mark an export published until the archive record is externally approved.", "Move the source and archive record through the external approval step first.");
  }

  if (input.status === "READY") {
    return makeGuard(true, "warning", `The ${input.target.toLowerCase()} artifact looks ready, but it should still match the latest source record.`, "Double-check that the archive metadata still matches the source publication.");
  }

  return makeGuard(true, "safe", "This export move is available.", "Save the queue row after checking the artifact URL and notes.");
}
