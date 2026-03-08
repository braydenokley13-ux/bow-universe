-- CreateEnum
CREATE TYPE "ChallengeEntryType" AS ENUM ('PROJECT', 'PROPOSAL', 'EITHER');

-- CreateEnum
CREATE TYPE "ChallengeScoreEventKind" AS ENUM ('JOIN', 'SUBMIT', 'APPROVED_INTERNAL', 'PUBLISHED_INTERNAL', 'SPOTLIGHT');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "signedUpViaClassCodeId" TEXT;

-- CreateTable
CREATE TABLE "ClassCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "commissionerId" TEXT NOT NULL,
    "linkedTeamId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsPost" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "dek" TEXT NOT NULL,
    "bodyMd" TEXT NOT NULL,
    "linkedEntityType" TEXT,
    "linkedEntityId" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "authorUserId" TEXT NOT NULL,

    CONSTRAINT "NewsPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "scoringNotesMd" TEXT,
    "laneTag" "LaneTag",
    "issueId" TEXT,
    "teamId" TEXT,
    "allowedEntryType" "ChallengeEntryType" NOT NULL DEFAULT 'EITHER',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT NOT NULL,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeEntry" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceType" "PublicationSourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "spotlightedAt" TIMESTAMP(3),

    CONSTRAINT "ChallengeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeScoreEvent" (
    "id" TEXT NOT NULL,
    "challengeEntryId" TEXT NOT NULL,
    "kind" "ChallengeScoreEventKind" NOT NULL,
    "points" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,

    CONSTRAINT "ChallengeScoreEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClassCode_code_key" ON "ClassCode"("code");

-- CreateIndex
CREATE INDEX "ClassCode_commissionerId_createdAt_idx" ON "ClassCode"("commissionerId", "createdAt");

-- CreateIndex
CREATE INDEX "ClassCode_linkedTeamId_idx" ON "ClassCode"("linkedTeamId");

-- CreateIndex
CREATE INDEX "ClassCode_active_expiresAt_idx" ON "ClassCode"("active", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "NewsPost_slug_key" ON "NewsPost"("slug");

-- CreateIndex
CREATE INDEX "NewsPost_publishedAt_idx" ON "NewsPost"("publishedAt");

-- CreateIndex
CREATE INDEX "NewsPost_pinned_publishedAt_idx" ON "NewsPost"("pinned", "publishedAt");

-- CreateIndex
CREATE INDEX "NewsPost_linkedEntityType_linkedEntityId_idx" ON "NewsPost"("linkedEntityType", "linkedEntityId");

-- CreateIndex
CREATE INDEX "NewsPost_authorUserId_createdAt_idx" ON "NewsPost"("authorUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Challenge_slug_key" ON "Challenge"("slug");

-- CreateIndex
CREATE INDEX "Challenge_createdByUserId_createdAt_idx" ON "Challenge"("createdByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "Challenge_issueId_idx" ON "Challenge"("issueId");

-- CreateIndex
CREATE INDEX "Challenge_teamId_idx" ON "Challenge"("teamId");

-- CreateIndex
CREATE INDEX "Challenge_laneTag_idx" ON "Challenge"("laneTag");

-- CreateIndex
CREATE INDEX "Challenge_active_startsAt_endsAt_idx" ON "Challenge"("active", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "ChallengeEntry_userId_joinedAt_idx" ON "ChallengeEntry"("userId", "joinedAt");

-- CreateIndex
CREATE INDEX "ChallengeEntry_sourceType_sourceId_idx" ON "ChallengeEntry"("sourceType", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeEntry_challengeId_userId_key" ON "ChallengeEntry"("challengeId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeEntry_challengeId_sourceType_sourceId_key" ON "ChallengeEntry"("challengeId", "sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "ChallengeScoreEvent_createdByUserId_createdAt_idx" ON "ChallengeScoreEvent"("createdByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ChallengeScoreEvent_kind_createdAt_idx" ON "ChallengeScoreEvent"("kind", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeScoreEvent_challengeEntryId_kind_key" ON "ChallengeScoreEvent"("challengeEntryId", "kind");

-- CreateIndex
CREATE INDEX "User_signedUpViaClassCodeId_idx" ON "User"("signedUpViaClassCodeId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_signedUpViaClassCodeId_fkey" FOREIGN KEY ("signedUpViaClassCodeId") REFERENCES "ClassCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassCode" ADD CONSTRAINT "ClassCode_commissionerId_fkey" FOREIGN KEY ("commissionerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassCode" ADD CONSTRAINT "ClassCode_linkedTeamId_fkey" FOREIGN KEY ("linkedTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsPost" ADD CONSTRAINT "NewsPost_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeEntry" ADD CONSTRAINT "ChallengeEntry_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeEntry" ADD CONSTRAINT "ChallengeEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeScoreEvent" ADD CONSTRAINT "ChallengeScoreEvent_challengeEntryId_fkey" FOREIGN KEY ("challengeEntryId") REFERENCES "ChallengeEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeScoreEvent" ADD CONSTRAINT "ChallengeScoreEvent_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
