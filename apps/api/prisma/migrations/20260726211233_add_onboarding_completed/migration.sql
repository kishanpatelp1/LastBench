-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;

-- Backfill existing users who already finished onboarding under the old logic
UPDATE "User" SET "onboardingCompleted" = true WHERE "branch" IS NOT NULL AND "year" IS NOT NULL;
