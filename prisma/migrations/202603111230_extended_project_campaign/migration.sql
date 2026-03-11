-- CreateEnum
CREATE TYPE "ProjectScale" AS ENUM ('FIRST_PROJECT', 'EXTENDED');

-- CreateEnum
CREATE TYPE "ProjectArtifactFocus" AS ENUM ('RESEARCH', 'TOOL', 'STRATEGY');

-- CreateEnum
CREATE TYPE "ProjectMilestoneKey" AS ENUM ('CHARTER', 'EVIDENCE_BOARD', 'BUILD_SPRINT', 'FEEDBACK_LOOP', 'LAUNCH_WEEK');

-- CreateEnum
CREATE TYPE "ProjectMilestoneStatus" AS ENUM ('LOCKED', 'ACTIVE', 'COMPLETE');

-- CreateEnum
CREATE TYPE "ProjectDeliverableKey" AS ENUM ('DOSSIER', 'CORE_BUILD', 'EVIDENCE_BOARD', 'REVISION_LOG', 'LAUNCH_DECK');

-- CreateEnum
CREATE TYPE "ProjectCampaignEventKind" AS ENUM ('UNLOCK', 'FEEDBACK', 'DEADLINE', 'LAUNCH');

-- AlterTable
ALTER TABLE "Project"
ADD COLUMN "scale" "ProjectScale" NOT NULL DEFAULT 'FIRST_PROJECT',
ADD COLUMN "artifactFocus" "ProjectArtifactFocus",
ADD COLUMN "missionGoal" TEXT,
ADD COLUMN "successCriteria" TEXT,
ADD COLUMN "targetLaunchDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ProjectMilestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "key" "ProjectMilestoneKey" NOT NULL,
    "title" TEXT NOT NULL,
    "status" "ProjectMilestoneStatus" NOT NULL DEFAULT 'LOCKED',
    "targetDate" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "completionNote" TEXT,

    CONSTRAINT "ProjectMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectDeliverable" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "key" "ProjectDeliverableKey" NOT NULL,
    "title" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "complete" BOOLEAN NOT NULL DEFAULT false,
    "contentMd" TEXT,
    "artifactUrl" TEXT,
    "metadataJson" JSONB,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ProjectDeliverable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectCampaignEvent" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" "ProjectCampaignEventKind" NOT NULL,
    "milestoneKey" "ProjectMilestoneKey",
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectCampaignEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Project_scale_idx" ON "Project"("scale");

-- CreateIndex
CREATE INDEX "Project_artifactFocus_idx" ON "Project"("artifactFocus");

-- CreateIndex
CREATE INDEX "Project_targetLaunchDate_idx" ON "Project"("targetLaunchDate");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectMilestone_projectId_key_key" ON "ProjectMilestone"("projectId", "key");

-- CreateIndex
CREATE INDEX "ProjectMilestone_projectId_status_idx" ON "ProjectMilestone"("projectId", "status");

-- CreateIndex
CREATE INDEX "ProjectMilestone_targetDate_idx" ON "ProjectMilestone"("targetDate");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectDeliverable_projectId_key_key" ON "ProjectDeliverable"("projectId", "key");

-- CreateIndex
CREATE INDEX "ProjectDeliverable_projectId_complete_idx" ON "ProjectDeliverable"("projectId", "complete");

-- CreateIndex
CREATE INDEX "ProjectCampaignEvent_projectId_createdAt_idx" ON "ProjectCampaignEvent"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectCampaignEvent_kind_createdAt_idx" ON "ProjectCampaignEvent"("kind", "createdAt");

-- AddForeignKey
ALTER TABLE "ProjectMilestone" ADD CONSTRAINT "ProjectMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectDeliverable" ADD CONSTRAINT "ProjectDeliverable_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCampaignEvent" ADD CONSTRAINT "ProjectCampaignEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
