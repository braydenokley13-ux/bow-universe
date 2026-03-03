-- AlterTable
ALTER TABLE "User"
ADD COLUMN "commissionerId" TEXT,
ADD COLUMN "linkedTeamId" TEXT;

-- CreateTable
CREATE TABLE "StudentInvite" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "StudentInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "User_linkedTeamId_idx" ON "User"("linkedTeamId");

-- CreateIndex
CREATE INDEX "User_commissionerId_idx" ON "User"("commissionerId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentInvite_token_key" ON "StudentInvite"("token");

-- CreateIndex
CREATE INDEX "StudentInvite_userId_createdAt_idx" ON "StudentInvite"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "StudentInvite_createdByUserId_createdAt_idx" ON "StudentInvite"("createdByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "StudentInvite_usedAt_idx" ON "StudentInvite"("usedAt");

-- AddForeignKey
ALTER TABLE "User"
ADD CONSTRAINT "User_linkedTeamId_fkey" FOREIGN KEY ("linkedTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User"
ADD CONSTRAINT "User_commissionerId_fkey" FOREIGN KEY ("commissionerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentInvite"
ADD CONSTRAINT "StudentInvite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentInvite"
ADD CONSTRAINT "StudentInvite_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
