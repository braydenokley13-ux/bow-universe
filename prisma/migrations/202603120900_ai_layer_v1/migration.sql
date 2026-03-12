-- CreateEnum
CREATE TYPE "AiProvider" AS ENUM ('OPENAI', 'ANTHROPIC', 'LOCAL_FALLBACK');

-- CreateEnum
CREATE TYPE "AiConversationKind" AS ENUM ('RESEARCH', 'ARGUMENT', 'ADVERSARY', 'WRITING', 'QUALITY', 'MISSION', 'ORIENT', 'ISSUE_INTEL', 'TEAM_PULSE', 'NARRATIVE');

-- CreateEnum
CREATE TYPE "AiMessageRole" AS ENUM ('SYSTEM', 'USER', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "AiRunStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CACHED');

-- CreateEnum
CREATE TYPE "AiArtifactKind" AS ENUM ('RESEARCH_LOG', 'ARGUMENT_BACKBONE', 'ADVERSARY_REVIEW', 'WRITING_FEEDBACK', 'QUALITY_REVIEW', 'DAILY_MISSION', 'ORIENTATION', 'ISSUE_INTELLIGENCE', 'TEAM_PULSE', 'NARRATIVE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ProjectCampaignEventKind" ADD VALUE 'PROGRESS_UPDATE';
ALTER TYPE "ProjectCampaignEventKind" ADD VALUE 'AI_GUIDANCE';
ALTER TYPE "ProjectCampaignEventKind" ADD VALUE 'TEAM_PULSE';
ALTER TYPE "ProjectCampaignEventKind" ADD VALUE 'STALL_ALERT';

-- AlterTable
ALTER TABLE "ProjectCampaignEvent" ADD COLUMN     "actorUserId" TEXT;

-- CreateTable
CREATE TABLE "AiConversation" (
    "id" TEXT NOT NULL,
    "kind" "AiConversationKind" NOT NULL,
    "title" TEXT,
    "promptVersion" TEXT NOT NULL,
    "userId" TEXT,
    "projectId" TEXT,
    "issueId" TEXT,
    "sourceType" "PublicationSourceType",
    "sourceId" TEXT,
    "milestoneKey" "ProjectMilestoneKey",
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "AiMessageRole" NOT NULL,
    "bodyMd" TEXT NOT NULL,
    "structuredJson" JSONB,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiRun" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT,
    "kind" "AiConversationKind" NOT NULL,
    "provider" "AiProvider" NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "status" "AiRunStatus" NOT NULL DEFAULT 'PENDING',
    "inputHash" TEXT NOT NULL,
    "errorMessage" TEXT,
    "requestJson" JSONB,
    "responseJson" JSONB,
    "metadataJson" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AiRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiArtifact" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT,
    "runId" TEXT,
    "kind" "AiArtifactKind" NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "bodyMd" TEXT NOT NULL,
    "structuredJson" JSONB,
    "metadataJson" JSONB,
    "userId" TEXT,
    "projectId" TEXT,
    "issueId" TEXT,
    "sourceType" "PublicationSourceType",
    "sourceId" TEXT,
    "milestoneKey" "ProjectMilestoneKey",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiArtifactSource" (
    "id" TEXT NOT NULL,
    "artifactId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "sourceType" TEXT,
    "note" TEXT,
    "excerptMd" TEXT,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "metadataJson" JSONB,

    CONSTRAINT "AiArtifactSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiConversation_kind_updatedAt_idx" ON "AiConversation"("kind", "updatedAt");

-- CreateIndex
CREATE INDEX "AiConversation_userId_kind_updatedAt_idx" ON "AiConversation"("userId", "kind", "updatedAt");

-- CreateIndex
CREATE INDEX "AiConversation_projectId_kind_updatedAt_idx" ON "AiConversation"("projectId", "kind", "updatedAt");

-- CreateIndex
CREATE INDEX "AiConversation_issueId_kind_updatedAt_idx" ON "AiConversation"("issueId", "kind", "updatedAt");

-- CreateIndex
CREATE INDEX "AiConversation_sourceType_sourceId_idx" ON "AiConversation"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "AiMessage_conversationId_createdAt_idx" ON "AiMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "AiRun_conversationId_startedAt_idx" ON "AiRun"("conversationId", "startedAt");

-- CreateIndex
CREATE INDEX "AiRun_kind_startedAt_idx" ON "AiRun"("kind", "startedAt");

-- CreateIndex
CREATE INDEX "AiRun_inputHash_kind_idx" ON "AiRun"("inputHash", "kind");

-- CreateIndex
CREATE INDEX "AiRun_status_startedAt_idx" ON "AiRun"("status", "startedAt");

-- CreateIndex
CREATE INDEX "AiArtifact_kind_updatedAt_idx" ON "AiArtifact"("kind", "updatedAt");

-- CreateIndex
CREATE INDEX "AiArtifact_projectId_kind_updatedAt_idx" ON "AiArtifact"("projectId", "kind", "updatedAt");

-- CreateIndex
CREATE INDEX "AiArtifact_userId_kind_updatedAt_idx" ON "AiArtifact"("userId", "kind", "updatedAt");

-- CreateIndex
CREATE INDEX "AiArtifact_issueId_kind_updatedAt_idx" ON "AiArtifact"("issueId", "kind", "updatedAt");

-- CreateIndex
CREATE INDEX "AiArtifact_sourceType_sourceId_kind_idx" ON "AiArtifact"("sourceType", "sourceId", "kind");

-- CreateIndex
CREATE INDEX "AiArtifact_inputHash_kind_idx" ON "AiArtifact"("inputHash", "kind");

-- CreateIndex
CREATE INDEX "AiArtifactSource_artifactId_rank_idx" ON "AiArtifactSource"("artifactId", "rank");

-- CreateIndex
CREATE INDEX "ProjectCampaignEvent_actorUserId_createdAt_idx" ON "ProjectCampaignEvent"("actorUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "ProjectCampaignEvent" ADD CONSTRAINT "ProjectCampaignEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiConversation" ADD CONSTRAINT "AiConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiConversation" ADD CONSTRAINT "AiConversation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiConversation" ADD CONSTRAINT "AiConversation_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiMessage" ADD CONSTRAINT "AiMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiRun" ADD CONSTRAINT "AiRun_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AiConversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiArtifact" ADD CONSTRAINT "AiArtifact_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AiConversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiArtifact" ADD CONSTRAINT "AiArtifact_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AiRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiArtifact" ADD CONSTRAINT "AiArtifact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiArtifact" ADD CONSTRAINT "AiArtifact_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiArtifact" ADD CONSTRAINT "AiArtifact_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiArtifactSource" ADD CONSTRAINT "AiArtifactSource_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "AiArtifact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

