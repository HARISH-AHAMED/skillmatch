-- The only foreign key with no index behind it: Postgres does not create one
-- for a FK, so lookups by organiser and the cascade on user deletion both had
-- to scan the table.
CREATE INDEX IF NOT EXISTS "Meeting_organizerUserId_idx" ON "Meeting"("organizerUserId");
