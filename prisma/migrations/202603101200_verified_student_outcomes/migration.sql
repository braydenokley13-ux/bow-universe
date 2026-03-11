CREATE TYPE "StudentOutcomeKind" AS ENUM ('ARTIFACT_COMPLETED', 'EVIDENCE_DEFENDED', 'VERIFIED_IMPACT');

CREATE TYPE "StudentOutcomeStatus" AS ENUM ('DRAFT', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED');

CREATE TABLE "StudentOutcome" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sourceType" "PublicationSourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "kind" "StudentOutcomeKind" NOT NULL,
    "status" "StudentOutcomeStatus" NOT NULL DEFAULT 'DRAFT',
    "studentSummary" TEXT,
    "proofJson" JSONB,
    "submittedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "verifiedByUserId" TEXT,
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentOutcome_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentOutcome_sourceType_sourceId_kind_key" ON "StudentOutcome"("sourceType", "sourceId", "kind");

CREATE INDEX "StudentOutcome_userId_kind_status_idx" ON "StudentOutcome"("userId", "kind", "status");

CREATE INDEX "StudentOutcome_sourceType_sourceId_idx" ON "StudentOutcome"("sourceType", "sourceId");

CREATE INDEX "StudentOutcome_status_createdAt_idx" ON "StudentOutcome"("status", "createdAt");

CREATE INDEX "StudentOutcome_verifiedByUserId_idx" ON "StudentOutcome"("verifiedByUserId");

ALTER TABLE "StudentOutcome" ADD CONSTRAINT "StudentOutcome_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentOutcome" ADD CONSTRAINT "StudentOutcome_verifiedByUserId_fkey" FOREIGN KEY ("verifiedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
