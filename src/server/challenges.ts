import {
  type Prisma,
  type ProposalStatus,
  type PublicationSourceType,
  type SubmissionStatus
} from "@prisma/client";

import {
  challengeScoreRules,
  getChallengeMilestonesForSource,
  sumChallengeScore,
  type ChallengeScoreKind
} from "@/lib/challenges";
import { prisma } from "@/lib/prisma";

type DatabaseClient = Prisma.TransactionClient | typeof prisma;

export function challengeIsOpen(challenge: {
  active: boolean;
  startsAt: Date;
  endsAt: Date;
}) {
  const now = Date.now();
  return (
    challenge.active &&
    challenge.startsAt.getTime() <= now &&
    challenge.endsAt.getTime() >= now
  );
}

export async function syncChallengeMilestonesForSource(params: {
  sourceType: PublicationSourceType;
  sourceId: string;
  status: SubmissionStatus | ProposalStatus;
  actorUserId?: string | null;
  db?: DatabaseClient;
}) {
  const db = params.db ?? prisma;
  const entries = await db.challengeEntry.findMany({
    where: {
      sourceType: params.sourceType,
      sourceId: params.sourceId
    },
    include: {
      challenge: true,
      scoreEvents: true
    }
  });

  for (const entry of entries) {
    if (!entry.challenge.active) {
      continue;
    }

    const missingMilestones = getChallengeMilestonesForSource({
      sourceType: params.sourceType,
      status: params.status,
      existingKinds: entry.scoreEvents.map((event) => event.kind as ChallengeScoreKind)
    });

    for (const kind of missingMilestones) {
      await db.challengeScoreEvent.create({
        data: {
          challengeEntryId: entry.id,
          kind,
          points: challengeScoreRules[kind],
          createdByUserId: params.actorUserId ?? null
        }
      });
    }
  }
}

export function buildChallengeLeaderboard<
  TEntry extends {
    id: string;
    joinedAt: Date;
    sourceType: PublicationSourceType;
    sourceId: string;
    user: { id: string; name: string };
    scoreEvents: Array<{ kind: ChallengeScoreKind; points: number }>;
  }
>(entries: TEntry[]) {
  return entries
    .map((entry) => ({
      id: entry.id,
      joinedAt: entry.joinedAt,
      sourceType: entry.sourceType,
      sourceId: entry.sourceId,
      user: entry.user,
      totalScore: sumChallengeScore(entry.scoreEvents),
      scoreEvents: entry.scoreEvents
    }))
    .sort((left, right) => {
      if (right.totalScore !== left.totalScore) {
        return right.totalScore - left.totalScore;
      }

      return left.joinedAt.getTime() - right.joinedAt.getTime();
    });
}
