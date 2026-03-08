-- CreateTable
CREATE TABLE "ChronicleArticle" (
    "id" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "seasonId" TEXT,
    "teamId" TEXT,
    "metadataJson" JSONB,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChronicleArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SandboxScenario" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "diffJson" JSONB NOT NULL,
    "resultJson" JSONB,
    "ruleSetId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SandboxScenario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChronicleArticle_category_idx" ON "ChronicleArticle"("category");

-- CreateIndex
CREATE INDEX "ChronicleArticle_seasonId_idx" ON "ChronicleArticle"("seasonId");

-- CreateIndex
CREATE INDEX "ChronicleArticle_teamId_idx" ON "ChronicleArticle"("teamId");

-- CreateIndex
CREATE INDEX "ChronicleArticle_publishedAt_idx" ON "ChronicleArticle"("publishedAt");

-- CreateIndex
CREATE INDEX "ChronicleArticle_entityType_entityId_idx" ON "ChronicleArticle"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "SandboxScenario_createdByUserId_idx" ON "SandboxScenario"("createdByUserId");

-- CreateIndex
CREATE INDEX "SandboxScenario_ruleSetId_idx" ON "SandboxScenario"("ruleSetId");

-- CreateIndex
CREATE INDEX "SandboxScenario_isPublic_idx" ON "SandboxScenario"("isPublic");

-- CreateIndex
CREATE INDEX "SandboxScenario_createdAt_idx" ON "SandboxScenario"("createdAt");

-- AddForeignKey
ALTER TABLE "ChronicleArticle" ADD CONSTRAINT "ChronicleArticle_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChronicleArticle" ADD CONSTRAINT "ChronicleArticle_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SandboxScenario" ADD CONSTRAINT "SandboxScenario_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SandboxScenario" ADD CONSTRAINT "SandboxScenario_ruleSetId_fkey" FOREIGN KEY ("ruleSetId") REFERENCES "RuleSet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
