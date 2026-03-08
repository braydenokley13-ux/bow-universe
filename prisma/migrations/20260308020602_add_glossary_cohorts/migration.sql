-- CreateTable
CREATE TABLE "GlossaryTerm" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "bowExample" TEXT,
    "category" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GlossaryTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cohort" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cohort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CohortMember" (
    "cohortId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CohortMember_pkey" PRIMARY KEY ("cohortId","userId")
);

-- CreateTable
CREATE TABLE "CohortMilestone" (
    "id" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT,

    CONSTRAINT "CohortMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GlossaryTerm_slug_key" ON "GlossaryTerm"("slug");

-- CreateIndex
CREATE INDEX "GlossaryTerm_category_idx" ON "GlossaryTerm"("category");

-- CreateIndex
CREATE INDEX "GlossaryTerm_slug_idx" ON "GlossaryTerm"("slug");

-- CreateIndex
CREATE INDEX "GlossaryTerm_sortOrder_idx" ON "GlossaryTerm"("sortOrder");

-- CreateIndex
CREATE INDEX "Cohort_createdByUserId_idx" ON "Cohort"("createdByUserId");

-- CreateIndex
CREATE INDEX "CohortMember_userId_idx" ON "CohortMember"("userId");

-- CreateIndex
CREATE INDEX "CohortMilestone_cohortId_idx" ON "CohortMilestone"("cohortId");

-- CreateIndex
CREATE INDEX "CohortMilestone_targetDate_idx" ON "CohortMilestone"("targetDate");

-- AddForeignKey
ALTER TABLE "Cohort" ADD CONSTRAINT "Cohort_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CohortMember" ADD CONSTRAINT "CohortMember_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CohortMember" ADD CONSTRAINT "CohortMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CohortMilestone" ADD CONSTRAINT "CohortMilestone_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;
