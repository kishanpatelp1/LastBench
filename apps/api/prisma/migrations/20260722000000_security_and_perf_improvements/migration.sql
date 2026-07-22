-- Migration: security_and_perf_improvements
-- Covers: C-2 (Session index), H-1 (email verification), H-2 (password reset),
--         M-5 (pg_trgm search indexes), M-7 (PollVote pollId + correct unique constraint)

-- ─── H-1: Email verification fields ────────────────────────────────────────
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerificationToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerificationExpiry" TIMESTAMP(3);

-- ─── H-2: Password reset fields ─────────────────────────────────────────────
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordResetToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordResetExpiry" TIMESTAMP(3);

-- ─── C-2: Index on Session.expiresAt for efficient hourly cleanup job ────────
CREATE INDEX IF NOT EXISTS "Session_expiresAt_idx" ON "Session"("expiresAt");

-- ─── Report.createdAt index (admin pagination) ───────────────────────────────
CREATE INDEX IF NOT EXISTS "Report_createdAt_idx" ON "Report"("createdAt" DESC);

-- ─── M-7: Add pollId to PollVote and replace incorrect unique constraint ─────
-- Step 1: Add the pollId column (nullable first to populate existing rows)
ALTER TABLE "PollVote" ADD COLUMN IF NOT EXISTS "pollId" TEXT;

-- Step 2: Backfill pollId from the related PollOption
UPDATE "PollVote" pv
SET "pollId" = po."pollId"
FROM "PollOption" po
WHERE pv."optionId" = po."id"
  AND pv."pollId" IS NULL;

-- Step 3: Make pollId NOT NULL after backfill
ALTER TABLE "PollVote" ALTER COLUMN "pollId" SET NOT NULL;

-- Step 4: Add foreign key constraint for pollId -> Poll.id
ALTER TABLE "PollVote"
  ADD CONSTRAINT IF NOT EXISTS "PollVote_pollId_fkey"
  FOREIGN KEY ("pollId") REFERENCES "Poll"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 5: Drop old per-option unique constraint (allowed multi-option voting)
DROP INDEX IF EXISTS "PollVote_userId_optionId_key";

-- Step 6: Add correct per-poll unique constraint (one vote per poll per user)
CREATE UNIQUE INDEX IF NOT EXISTS "PollVote_userId_pollId_key" ON "PollVote"("userId", "pollId");

-- ─── M-5: pg_trgm full-text search indexes ───────────────────────────────────
-- Enable the pg_trgm extension for trigram similarity search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram indexes on Post content and title for ILIKE '%query%' speedup
CREATE INDEX IF NOT EXISTS "Post_content_trgm_idx" ON "Post" USING gin("content" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Post_title_trgm_idx"   ON "Post" USING gin("title" gin_trgm_ops);

-- GIN trigram indexes on Community name and description
CREATE INDEX IF NOT EXISTS "Community_name_trgm_idx"        ON "Community" USING gin("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Community_description_trgm_idx" ON "Community" USING gin("description" gin_trgm_ops);
