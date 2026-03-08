import { ProposalStatus, SubmissionStatus, type PublicationSourceType } from "@prisma/client";

export type ChallengeScoreKind =
  | "JOIN"
  | "SUBMIT"
  | "APPROVED_INTERNAL"
  | "PUBLISHED_INTERNAL"
  | "SPOTLIGHT";

export const challengeScoreRules: Record<ChallengeScoreKind, number> = {
  JOIN: 5,
  SUBMIT: 15,
  APPROVED_INTERNAL: 20,
  PUBLISHED_INTERNAL: 30,
  SPOTLIGHT: 10
};

const submittedProjectStatuses = new Set<SubmissionStatus>([
  SubmissionStatus.SUBMITTED,
  SubmissionStatus.REVISION_REQUESTED,
  SubmissionStatus.APPROVED_FOR_INTERNAL_PUBLICATION,
  SubmissionStatus.PUBLISHED_INTERNAL,
  SubmissionStatus.MARKED_EXTERNAL_READY,
  SubmissionStatus.APPROVED_FOR_EXTERNAL_PUBLICATION
]);

const approvedProjectStatuses = new Set<SubmissionStatus>([
  SubmissionStatus.APPROVED_FOR_INTERNAL_PUBLICATION,
  SubmissionStatus.PUBLISHED_INTERNAL,
  SubmissionStatus.MARKED_EXTERNAL_READY,
  SubmissionStatus.APPROVED_FOR_EXTERNAL_PUBLICATION
]);

const publishedProjectStatuses = new Set<SubmissionStatus>([
  SubmissionStatus.PUBLISHED_INTERNAL,
  SubmissionStatus.MARKED_EXTERNAL_READY,
  SubmissionStatus.APPROVED_FOR_EXTERNAL_PUBLICATION
]);

const submittedProposalStatuses = new Set<ProposalStatus>([
  ProposalStatus.SUBMITTED,
  ProposalStatus.REVISION_REQUESTED,
  ProposalStatus.APPROVED_FOR_INTERNAL_PUBLICATION,
  ProposalStatus.READY_FOR_VOTING,
  ProposalStatus.VOTING,
  ProposalStatus.DECISION,
  ProposalStatus.PUBLISHED_INTERNAL,
  ProposalStatus.MARKED_EXTERNAL_READY,
  ProposalStatus.APPROVED_FOR_EXTERNAL_PUBLICATION
]);

const approvedProposalStatuses = new Set<ProposalStatus>([
  ProposalStatus.APPROVED_FOR_INTERNAL_PUBLICATION,
  ProposalStatus.READY_FOR_VOTING,
  ProposalStatus.VOTING,
  ProposalStatus.DECISION,
  ProposalStatus.PUBLISHED_INTERNAL,
  ProposalStatus.MARKED_EXTERNAL_READY,
  ProposalStatus.APPROVED_FOR_EXTERNAL_PUBLICATION
]);

const publishedProposalStatuses = new Set<ProposalStatus>([
  ProposalStatus.PUBLISHED_INTERNAL,
  ProposalStatus.MARKED_EXTERNAL_READY,
  ProposalStatus.APPROVED_FOR_EXTERNAL_PUBLICATION
]);

export function getChallengeMilestonesForSource(input: {
  sourceType: PublicationSourceType;
  status: SubmissionStatus | ProposalStatus;
  existingKinds?: ChallengeScoreKind[];
}) {
  const existingKinds = new Set(input.existingKinds ?? []);
  const milestones: ChallengeScoreKind[] = [];

  if (!existingKinds.has("JOIN")) {
    milestones.push("JOIN");
  }

  const submitted =
    input.sourceType === "PROJECT"
      ? submittedProjectStatuses.has(input.status as SubmissionStatus)
      : submittedProposalStatuses.has(input.status as ProposalStatus);
  const approved =
    input.sourceType === "PROJECT"
      ? approvedProjectStatuses.has(input.status as SubmissionStatus)
      : approvedProposalStatuses.has(input.status as ProposalStatus);
  const published =
    input.sourceType === "PROJECT"
      ? publishedProjectStatuses.has(input.status as SubmissionStatus)
      : publishedProposalStatuses.has(input.status as ProposalStatus);

  if (submitted && !existingKinds.has("SUBMIT")) {
    milestones.push("SUBMIT");
  }

  if (approved && !existingKinds.has("APPROVED_INTERNAL")) {
    milestones.push("APPROVED_INTERNAL");
  }

  if (published && !existingKinds.has("PUBLISHED_INTERNAL")) {
    milestones.push("PUBLISHED_INTERNAL");
  }

  return milestones;
}

export function sumChallengeScore(
  scoreEvents: Array<{ kind: ChallengeScoreKind; points?: number }>
) {
  return scoreEvents.reduce(
    (total, event) => total + (event.points ?? challengeScoreRules[event.kind]),
    0
  );
}
