-- CreateEnum
CREATE TYPE "LaneTag" AS ENUM ('TOOL_BUILDERS', 'POLICY_REFORM_ARCHITECTS', 'STRATEGIC_OPERATORS', 'ECONOMIC_INVESTIGATORS');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'REVISION_REQUESTED', 'APPROVED_FOR_INTERNAL_PUBLICATION', 'PUBLISHED_INTERNAL', 'MARKED_EXTERNAL_READY', 'APPROVED_FOR_EXTERNAL_PUBLICATION');

-- CreateEnum
CREATE TYPE "PublicationType" AS ENUM ('TOOL_BRIEF', 'POLICY_MEMO', 'TEAM_STRATEGY_DOSSIER', 'RESEARCH_BRIEF');

-- CreateEnum
CREATE TYPE "FeedbackType" AS ENUM ('CLARITY', 'EVIDENCE', 'REASONING', 'STRUCTURE', 'REVISION_REQUEST');

-- CreateEnum
CREATE TYPE "PublicationSourceType" AS ENUM ('PROJECT', 'PROPOSAL');

-- CreateEnum
CREATE TYPE "ExternalPublicationTarget" AS ENUM ('WEB', 'PDF');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ProposalStatus" ADD VALUE 'REVISION_REQUESTED';
ALTER TYPE "ProposalStatus" ADD VALUE 'APPROVED_FOR_INTERNAL_PUBLICATION';
ALTER TYPE "ProposalStatus" ADD VALUE 'READY_FOR_VOTING';
ALTER TYPE "ProposalStatus" ADD VALUE 'PUBLISHED_INTERNAL';
ALTER TYPE "ProposalStatus" ADD VALUE 'MARKED_EXTERNAL_READY';
ALTER TYPE "ProposalStatus" ADD VALUE 'APPROVED_FOR_EXTERNAL_PUBLICATION';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "abstract" TEXT,
ADD COLUMN     "approvedForExternalPublicationAt" TIMESTAMP(3),
ADD COLUMN     "approvedForInternalPublicationAt" TIMESTAMP(3),
ADD COLUMN     "contentJson" JSONB,
ADD COLUMN     "essentialQuestion" TEXT,
ADD COLUMN     "keyTakeawaysJson" JSONB,
ADD COLUMN     "keywordsJson" JSONB,
ADD COLUMN     "lanePrimary" "LaneTag",
ADD COLUMN     "markedExternalReadyAt" TIMESTAMP(3),
ADD COLUMN     "methodsSummary" TEXT,
ADD COLUMN     "publicationSlug" TEXT,
ADD COLUMN     "publicationSummary" TEXT,
ADD COLUMN     "publicationType" "PublicationType",
ADD COLUMN     "publicationVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "publishedInternalAt" TIMESTAMP(3),
ADD COLUMN     "referencesJson" JSONB,
ADD COLUMN     "reviewChecklistJson" JSONB,
ADD COLUMN     "revisionRequestedAt" TIMESTAMP(3),
ADD COLUMN     "submissionStatus" "SubmissionStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "submittedAt" TIMESTAMP(3);

UPDATE "Project"
SET "publicationType" = CASE
  WHEN "projectType" = 'TOOL' THEN 'TOOL_BRIEF'::"PublicationType"
  WHEN "projectType" = 'STRATEGY' THEN 'TEAM_STRATEGY_DOSSIER'::"PublicationType"
  WHEN "projectType" = 'PROPOSAL_SUPPORT' THEN 'POLICY_MEMO'::"PublicationType"
  ELSE 'RESEARCH_BRIEF'::"PublicationType"
END
WHERE "publicationType" IS NULL;

ALTER TABLE "Project"
ALTER COLUMN "publicationType" SET NOT NULL;

-- AlterTable
ALTER TABLE "Proposal" ADD COLUMN     "abstract" TEXT,
ADD COLUMN     "approvedForExternalPublicationAt" TIMESTAMP(3),
ADD COLUMN     "approvedForInternalPublicationAt" TIMESTAMP(3),
ADD COLUMN     "contentJson" JSONB,
ADD COLUMN     "keyTakeawaysJson" JSONB,
ADD COLUMN     "keywordsJson" JSONB,
ADD COLUMN     "markedExternalReadyAt" TIMESTAMP(3),
ADD COLUMN     "methodsSummary" TEXT,
ADD COLUMN     "publicationSlug" TEXT,
ADD COLUMN     "publicationSummary" TEXT,
ADD COLUMN     "publicationType" "PublicationType" NOT NULL DEFAULT 'POLICY_MEMO',
ADD COLUMN     "publicationVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "publishedInternalAt" TIMESTAMP(3),
ADD COLUMN     "readyForVotingAt" TIMESTAMP(3),
ADD COLUMN     "referencesJson" JSONB,
ADD COLUMN     "reviewChecklistJson" JSONB,
ADD COLUMN     "revisionRequestedAt" TIMESTAMP(3),
ADD COLUMN     "submittedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ProjectFeedback" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "feedbackType" "FeedbackType" NOT NULL,
    "body" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalFeedback" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "feedbackType" "FeedbackType" NOT NULL,
    "body" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProposalFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectRevision" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "snapshotJson" JSONB NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProposalRevision" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "snapshotJson" JSONB NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProposalRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Publication" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "publicationType" "PublicationType" NOT NULL,
    "sourceType" "PublicationSourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "lanePrimary" "LaneTag",
    "abstract" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "keywordsJson" JSONB,
    "citationText" TEXT NOT NULL,
    "authorLine" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "publishedByUserId" TEXT NOT NULL,
    "seasonId" TEXT,
    "issueId" TEXT,
    "teamId" TEXT,
    "externalReady" BOOLEAN NOT NULL DEFAULT false,
    "externalApproved" BOOLEAN NOT NULL DEFAULT false,
    "externalTargetsJson" JSONB,
    "canonicalVersion" INTEGER NOT NULL DEFAULT 1,
    "layoutVersion" INTEGER NOT NULL DEFAULT 1,
    "metadataJson" JSONB,

    CONSTRAINT "Publication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicationExport" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "target" "ExternalPublicationTarget" NOT NULL,
    "status" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3),
    "artifactUrl" TEXT,
    "notes" TEXT,

    CONSTRAINT "PublicationExport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectFeedback_projectId_idx" ON "ProjectFeedback"("projectId");

-- CreateIndex
CREATE INDEX "ProjectFeedback_createdByUserId_idx" ON "ProjectFeedback"("createdByUserId");

-- CreateIndex
CREATE INDEX "ProjectFeedback_createdAt_idx" ON "ProjectFeedback"("createdAt");

-- CreateIndex
CREATE INDEX "ProposalFeedback_proposalId_idx" ON "ProposalFeedback"("proposalId");

-- CreateIndex
CREATE INDEX "ProposalFeedback_createdByUserId_idx" ON "ProposalFeedback"("createdByUserId");

-- CreateIndex
CREATE INDEX "ProposalFeedback_createdAt_idx" ON "ProposalFeedback"("createdAt");

-- CreateIndex
CREATE INDEX "ProjectRevision_projectId_idx" ON "ProjectRevision"("projectId");

-- CreateIndex
CREATE INDEX "ProjectRevision_createdByUserId_idx" ON "ProjectRevision"("createdByUserId");

-- CreateIndex
CREATE INDEX "ProjectRevision_createdAt_idx" ON "ProjectRevision"("createdAt");

-- CreateIndex
CREATE INDEX "ProposalRevision_proposalId_idx" ON "ProposalRevision"("proposalId");

-- CreateIndex
CREATE INDEX "ProposalRevision_createdByUserId_idx" ON "ProposalRevision"("createdByUserId");

-- CreateIndex
CREATE INDEX "ProposalRevision_createdAt_idx" ON "ProposalRevision"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Publication_slug_key" ON "Publication"("slug");

-- CreateIndex
CREATE INDEX "Publication_publishedByUserId_idx" ON "Publication"("publishedByUserId");

-- CreateIndex
CREATE INDEX "Publication_seasonId_idx" ON "Publication"("seasonId");

-- CreateIndex
CREATE INDEX "Publication_issueId_idx" ON "Publication"("issueId");

-- CreateIndex
CREATE INDEX "Publication_teamId_idx" ON "Publication"("teamId");

-- CreateIndex
CREATE INDEX "Publication_publicationType_idx" ON "Publication"("publicationType");

-- CreateIndex
CREATE INDEX "Publication_lanePrimary_idx" ON "Publication"("lanePrimary");

-- CreateIndex
CREATE INDEX "Publication_publishedAt_idx" ON "Publication"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Publication_sourceType_sourceId_key" ON "Publication"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "PublicationExport_status_idx" ON "PublicationExport"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PublicationExport_publicationId_target_key" ON "PublicationExport"("publicationId", "target");

-- CreateIndex
CREATE UNIQUE INDEX "Project_publicationSlug_key" ON "Project"("publicationSlug");

-- CreateIndex
CREATE INDEX "Project_submissionStatus_idx" ON "Project"("submissionStatus");

-- CreateIndex
CREATE INDEX "Project_publicationSlug_idx" ON "Project"("publicationSlug");

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_publicationSlug_key" ON "Proposal"("publicationSlug");

-- CreateIndex
CREATE INDEX "Proposal_publicationSlug_idx" ON "Proposal"("publicationSlug");

-- AddForeignKey
ALTER TABLE "ProjectFeedback" ADD CONSTRAINT "ProjectFeedback_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectFeedback" ADD CONSTRAINT "ProjectFeedback_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalFeedback" ADD CONSTRAINT "ProposalFeedback_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalFeedback" ADD CONSTRAINT "ProposalFeedback_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRevision" ADD CONSTRAINT "ProjectRevision_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRevision" ADD CONSTRAINT "ProjectRevision_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalRevision" ADD CONSTRAINT "ProposalRevision_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProposalRevision" ADD CONSTRAINT "ProposalRevision_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_publishedByUserId_fkey" FOREIGN KEY ("publishedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicationExport" ADD CONSTRAINT "PublicationExport_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
