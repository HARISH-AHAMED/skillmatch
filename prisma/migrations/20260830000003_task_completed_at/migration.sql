-- A task finished date that is not "last edited". Existing DONE tasks are
-- backfilled from updatedAt, which is the closest record of when they were
-- last moved; anything not DONE stays null.
ALTER TABLE "Task" ADD COLUMN "completedAt" TIMESTAMP(3);

UPDATE "Task" SET "completedAt" = "updatedAt" WHERE "status" = 'DONE' AND "completedAt" IS NULL;
