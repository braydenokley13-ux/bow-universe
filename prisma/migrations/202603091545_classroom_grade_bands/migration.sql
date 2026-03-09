-- CreateEnum
CREATE TYPE "GradeBand" AS ENUM ('GRADE_5_6', 'GRADE_7_8');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "gradeBand" "GradeBand";

-- AlterTable
ALTER TABLE "ClassCode"
ADD COLUMN "defaultGradeBand" "GradeBand",
ADD COLUMN "cohortId" TEXT;

-- CreateIndex
CREATE INDEX "User_gradeBand_idx" ON "User"("gradeBand");

-- CreateIndex
CREATE INDEX "ClassCode_cohortId_idx" ON "ClassCode"("cohortId");

-- AddForeignKey
ALTER TABLE "ClassCode"
ADD CONSTRAINT "ClassCode_cohortId_fkey"
FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
