ALTER TABLE "User"
ADD COLUMN "onboardingExperienceVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "onboardingProgressJson" JSONB;
