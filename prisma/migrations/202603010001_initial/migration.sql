-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'ADMIN');

-- CreateEnum
CREATE TYPE "MarketSizeTier" AS ENUM ('SMALL', 'MID', 'LARGE', 'MEGA');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'VOTING', 'DECISION');

-- CreateEnum
CREATE TYPE "VoteValue" AS ENUM ('YES', 'NO');

-- CreateEnum
CREATE TYPE "DecisionType" AS ENUM ('APPROVE', 'DENY', 'AMEND');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('TOOL', 'INVESTIGATION', 'STRATEGY', 'PROPOSAL_SUPPORT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "marketSizeTier" "MarketSizeTier" NOT NULL,
    "ownerProfile" TEXT NOT NULL,
    "ownerDisciplineScore" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Season" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "activeRuleSetId" TEXT NOT NULL,
    "capNumber" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Season_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "startYear" INTEGER NOT NULL,
    "years" INTEGER NOT NULL,
    "annualSalaryJson" JSONB NOT NULL,
    "notes" TEXT,
    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamSeason" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "payroll" DOUBLE PRECISION NOT NULL,
    "taxPaid" DOUBLE PRECISION NOT NULL,
    "revenue" DOUBLE PRECISION NOT NULL,
    "valuation" DOUBLE PRECISION NOT NULL,
    "performanceProxy" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamSeason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleSet" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "rulesJson" JSONB NOT NULL,
    "changeSummaryJson" JSONB,
    "effectiveSeasonYear" INTEGER,
    "sourceProposalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT NOT NULL,
    CONSTRAINT "RuleSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'DRAFT',
    "ruleSetIdTarget" TEXT NOT NULL,
    "diffJson" JSONB NOT NULL,
    "narrativeJson" JSONB NOT NULL,
    "sandboxResultJson" JSONB,
    "voteStart" TIMESTAMP(3),
    "voteEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" "VoteValue" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionerDecision" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "decidedByUserId" TEXT NOT NULL,
    "decision" "DecisionType" NOT NULL,
    "notes" TEXT,
    "amendedDiffJson" JSONB,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommissionerDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" INTEGER NOT NULL,
    "status" "IssueStatus" NOT NULL DEFAULT 'OPEN',
    "metricsJson" JSONB,
    "evidenceMd" TEXT,
    "teamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "projectType" "ProjectType" NOT NULL,
    "laneTagsJson" JSONB NOT NULL,
    "issueId" TEXT,
    "teamId" TEXT,
    "supportingProposalId" TEXT,
    "artifactLinksJson" JSONB NOT NULL,
    "findingsMd" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectIssue" (
    "projectId" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    CONSTRAINT "ProjectIssue_pkey" PRIMARY KEY ("projectId","issueId")
);

-- CreateTable
CREATE TABLE "ProjectCollaborator" (
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "ProjectCollaborator_pkey" PRIMARY KEY ("projectId","userId")
);

-- CreateTable
CREATE TABLE "ProjectComment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT,
    CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Team_slug_key" ON "Team"("slug");
CREATE UNIQUE INDEX "Season_year_key" ON "Season"("year");
CREATE UNIQUE INDEX "TeamSeason_teamId_seasonId_key" ON "TeamSeason"("teamId", "seasonId");
CREATE UNIQUE INDEX "RuleSet_version_key" ON "RuleSet"("version");
CREATE UNIQUE INDEX "CommissionerDecision_proposalId_key" ON "CommissionerDecision"("proposalId");
CREATE UNIQUE INDEX "Issue_slug_key" ON "Issue"("slug");
CREATE UNIQUE INDEX "Vote_proposalId_userId_key" ON "Vote"("proposalId", "userId");

-- CreateIndex
CREATE INDEX "Season_activeRuleSetId_idx" ON "Season"("activeRuleSetId");
CREATE INDEX "Season_createdAt_idx" ON "Season"("createdAt");
CREATE INDEX "Contract_teamId_idx" ON "Contract"("teamId");
CREATE INDEX "TeamSeason_seasonId_idx" ON "TeamSeason"("seasonId");
CREATE INDEX "RuleSet_createdByUserId_idx" ON "RuleSet"("createdByUserId");
CREATE INDEX "RuleSet_effectiveSeasonYear_idx" ON "RuleSet"("effectiveSeasonYear");
CREATE INDEX "RuleSet_isActive_idx" ON "RuleSet"("isActive");
CREATE INDEX "RuleSet_createdAt_idx" ON "RuleSet"("createdAt");
CREATE INDEX "Proposal_issueId_idx" ON "Proposal"("issueId");
CREATE INDEX "Proposal_createdByUserId_idx" ON "Proposal"("createdByUserId");
CREATE INDEX "Proposal_ruleSetIdTarget_idx" ON "Proposal"("ruleSetIdTarget");
CREATE INDEX "Proposal_status_idx" ON "Proposal"("status");
CREATE INDEX "Proposal_createdAt_idx" ON "Proposal"("createdAt");
CREATE INDEX "Proposal_voteStart_voteEnd_idx" ON "Proposal"("voteStart", "voteEnd");
CREATE INDEX "Vote_userId_idx" ON "Vote"("userId");
CREATE INDEX "CommissionerDecision_decidedByUserId_idx" ON "CommissionerDecision"("decidedByUserId");
CREATE INDEX "Issue_status_idx" ON "Issue"("status");
CREATE INDEX "Issue_severity_idx" ON "Issue"("severity");
CREATE INDEX "Issue_teamId_idx" ON "Issue"("teamId");
CREATE INDEX "Issue_createdByUserId_idx" ON "Issue"("createdByUserId");
CREATE INDEX "Issue_createdAt_idx" ON "Issue"("createdAt");
CREATE INDEX "Project_issueId_idx" ON "Project"("issueId");
CREATE INDEX "Project_teamId_idx" ON "Project"("teamId");
CREATE INDEX "Project_createdByUserId_idx" ON "Project"("createdByUserId");
CREATE INDEX "Project_projectType_idx" ON "Project"("projectType");
CREATE INDEX "Project_supportingProposalId_idx" ON "Project"("supportingProposalId");
CREATE INDEX "Project_createdAt_idx" ON "Project"("createdAt");
CREATE INDEX "ProjectIssue_issueId_idx" ON "ProjectIssue"("issueId");
CREATE INDEX "ProjectCollaborator_userId_idx" ON "ProjectCollaborator"("userId");
CREATE INDEX "ProjectComment_projectId_idx" ON "ProjectComment"("projectId");
CREATE INDEX "ProjectComment_userId_idx" ON "ProjectComment"("userId");
CREATE INDEX "ProjectComment_createdAt_idx" ON "ProjectComment"("createdAt");
CREATE INDEX "ActivityEvent_type_idx" ON "ActivityEvent"("type");
CREATE INDEX "ActivityEvent_entityType_entityId_idx" ON "ActivityEvent"("entityType", "entityId");
CREATE INDEX "ActivityEvent_createdAt_idx" ON "ActivityEvent"("createdAt");
CREATE INDEX "ActivityEvent_createdByUserId_idx" ON "ActivityEvent"("createdByUserId");

-- AddForeignKey
ALTER TABLE "Season" ADD CONSTRAINT "Season_activeRuleSetId_fkey" FOREIGN KEY ("activeRuleSetId") REFERENCES "RuleSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamSeason" ADD CONSTRAINT "TeamSeason_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamSeason" ADD CONSTRAINT "TeamSeason_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RuleSet" ADD CONSTRAINT "RuleSet_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RuleSet" ADD CONSTRAINT "RuleSet_sourceProposalId_fkey" FOREIGN KEY ("sourceProposalId") REFERENCES "Proposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_ruleSetIdTarget_fkey" FOREIGN KEY ("ruleSetIdTarget") REFERENCES "RuleSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommissionerDecision" ADD CONSTRAINT "CommissionerDecision_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommissionerDecision" ADD CONSTRAINT "CommissionerDecision_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_supportingProposalId_fkey" FOREIGN KEY ("supportingProposalId") REFERENCES "Proposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectIssue" ADD CONSTRAINT "ProjectIssue_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectIssue" ADD CONSTRAINT "ProjectIssue_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectCollaborator" ADD CONSTRAINT "ProjectCollaborator_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectCollaborator" ADD CONSTRAINT "ProjectCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectComment" ADD CONSTRAINT "ProjectComment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectComment" ADD CONSTRAINT "ProjectComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
