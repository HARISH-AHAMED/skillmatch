-- Message editing and soft deletion.
--
-- Deleting a message used to remove the row, which reshaped a conversation the
-- other side had already read. The row now stays and carries a deletion stamp;
-- the thread renders a tombstone in its place.
ALTER TABLE "Message" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Message" ADD COLUMN "editedAt" TIMESTAMP(3);

-- The chat polls for messages created after a cursor; without this the poll
-- scans every message on the project on each tick.
CREATE INDEX "Message_projectId_createdAt_idx" ON "Message"("projectId", "createdAt");
